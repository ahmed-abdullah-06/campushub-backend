export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Maps well-known error types to proper HTTP status codes so the frontend
// always receives a useful 4xx message instead of a generic 500.
const resolveStatus = (err, res) => {
  if (res.statusCode !== 200 && res.statusCode < 500) return res.statusCode;

  // Malformed URL escapes in a path (e.g. /api/notes/%ZZ)
  if (err instanceof URIError || err.name === 'URIError') return 400;
  // Mongoose schema validation (required fields, enums, min length, ...)
  if (err.name === 'ValidationError') return 400;
  // Mongoose CastError (malformed ObjectId in a URL param, etc.)
  if (err.name === 'CastError') return 400;
  // MongoDB duplicate key (e.g. registering with an email that already exists)
  if (err.code === 11000) return 400;
  // Multer file-size limit
  if (err.name === 'MulterError') return 400;

  return res.statusCode === 200 ? 500 : res.statusCode;
};

// Friendly, non-leaky message for the common Mongoose errors.
const humanMessage = (err, fallback) => {
  if (err.name === 'ValidationError') {
    return Object.values(err.errors || {}).map((e) => e.message).join('. ') || fallback;
  }
  if (err.name === 'CastError') return `Invalid value for '${err.path}'`;
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return `That ${field} is already in use`;
  }
  return fallback;
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = resolveStatus(err, res);
  const isServerError = statusCode >= 500;

  res.status(statusCode).json({
    message: humanMessage(err, err.message || 'Server error'),
    // Never leak stack traces (or query details) to clients in production
    ...(isServerError && process.env.NODE_ENV !== 'production'
      ? { stack: err.stack }
      : {})
  });
};
