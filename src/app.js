import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';
import { securityHeaders, apiRateLimit } from './middleware/securityMiddleware.js';
import apiRoutes from './routes/index.js';
import { setupSwagger } from './config/swagger.js';
import { config } from './config/env.js';
import { storageDriver, openGridFSStream, findGridFSFile } from './config/storage.js';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();

// Behind Render/nginx the real client IP and protocol live in X-Forwarded-*.
// Without this, the rate limiter would see EVERY visitor as one IP (the proxy)
// and lock out the whole campus after a few requests.
if (config.isProduction) {
  app.set('trust proxy', 1);
}

// ---------------------------------------------------------------------------
// CORS
// Outside production we allow any local origin (Vite runs on :5173 and may be
// started on other ports too). In production ONLY the deployed frontend origin
// (CLIENT_URL) is allowed — a wide-open CORS with credentials would let any
// website make authenticated requests on behalf of a logged-in student.
// ---------------------------------------------------------------------------
const allowedOrigins = [
  config.clientUrl,
  ...String(process.env.EXTRA_CLIENT_URLS || '')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean)
];

app.use(
  cors({
    origin: config.isProduction ? allowedOrigins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(securityHeaders);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Makes uploaded images viewable in the browser at e.g. http://localhost:5000/uploads/1735689234567-482910384.jpg
// Uploaded files are user-generated, so they are served with caching disabled
// and never executed (nosniff is already set globally by securityHeaders).
app.use(
  '/uploads',
  express.static(path.resolve(__dirname, '../uploads'), {
    index: false,
    dotfiles: 'deny',
    maxAge: config.isProduction ? '7d' : 0,
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Disposition', 'inline');
    }
  })
);

// GridFS driver: files live inside MongoDB, URL shape /uploads/<id>/<filename>.
// Registered AFTER the static middleware so existing local-disk files still win.
if (storageDriver === 'gridfs') {
  app.get('/uploads/:id/:filename?', async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        return res.status(404).json({ message: 'File not found' });
      }
      const file = await findGridFSFile(id);
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }

      res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Cache-Control', config.isProduction ? 'public, max-age=604800' : 'no-cache');

      const stream = openGridFSStream(id);
      stream.on('error', (err) => next(err));
      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  });
}

// Global API budget. Auth routes install a much tighter limiter of their own.
app.use('/api', apiRateLimit);

setupSwagger(app);
app.use('/api', apiRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'CampusHub API Server Operational' });
});

app.use(notFound);
app.use(errorHandler);

export default app;
