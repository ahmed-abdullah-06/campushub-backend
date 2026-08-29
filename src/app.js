import express from 'express';
import cors from 'cors';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';
import apiRoutes from './routes/index.js';
import { setupSwagger } from './config/swagger.js';

const app = express();

// Enable wide-open CORS for local development
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

setupSwagger(app);
app.use('/api', apiRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'CampusHub API Server Operational' });
});

app.use(notFound);
app.use(errorHandler);

export default app;