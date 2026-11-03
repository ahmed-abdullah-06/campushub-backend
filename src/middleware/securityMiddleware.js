// Lightweight in-memory rate limiter + security headers.
// Written by hand so the project needs no extra dependencies,
// which keeps `npm ci --omit=dev` and the Docker image small.

const parseWindow = (value, fallbackMs) => {
  const match = /^(\d+)([smhd])$/.exec(String(value || ''));
  if (!match) return fallbackMs;
  const n = Number(match[1]);
  const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2]];
  return n * unit;
};

/**
 * Creates a simple fixed-window rate limiter.
 * @param {object} options
 * @param {number} options.windowMs - window length in ms (default 15 minutes)
 * @param {number} options.max - max requests per IP inside the window
 * @param {string} options.message - error message returned on 429
 * @param {(req) => string} options.keyFn - custom key (defaults to client IP)
 */
export const rateLimit = ({
  windowMs = 15 * 60 * 1000,
  max = 100,
  message = 'Too many requests, please try again later.',
  keyFn
} = {}) => {
  const hits = new Map(); // key -> { count, resetAt }
  let lastSweep = Date.now();

  const keyOf = (req) =>
    keyFn
      ? keyFn(req)
      : req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';

  return (req, res, next) => {
    const now = Date.now();

    // Opportunistic cleanup so the Map never grows without bound.
    if (now - lastSweep > windowMs) {
      for (const [key, entry] of hits) {
        if (entry.resetAt <= now) hits.delete(key);
      }
      lastSweep = now;
    }

    const key = keyOf(req);
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429);
      return next(Object.assign(new Error(message), { statusCode: 429 }));
    }
    return next();
  };
};

// Auth endpoints deserve a much tighter budget than the rest of the API:
// brute-force attempts should be cut off quickly.
export const authRateLimit = rateLimit({
  windowMs: parseWindow(process.env.AUTH_RATE_WINDOW, 15 * 60 * 1000),
  max: Number(process.env.AUTH_RATE_MAX) || 25,
  message: 'Too many login/register attempts. Please wait a few minutes and try again.'
});

export const apiRateLimit = rateLimit({
  windowMs: parseWindow(process.env.API_RATE_WINDOW, 60 * 1000),
  max: Number(process.env.API_RATE_MAX) || 300,
  message: 'Too many requests. Please slow down.'
});

// Conservative security headers (no helmet dependency needed).
export const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  // API responses are JSON consumed by the SPA — never sniffed as anything else.
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
};
