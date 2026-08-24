import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import routes from './routes/index.js';

import rateLimit from 'express-rate-limit';

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiter to all routes
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: config.frontendUrl,
  credentials: true
}));

// Parse JSON request bodies
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount all API routes
app.use('/api', routes);

// Global error handler (must be last)
app.use(errorHandler);

import { initCronJobs } from './jobs/cronJobs.js';

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`🏥 HealthSync API running on port ${PORT} in ${config.nodeEnv} mode`);
  initCronJobs();
});

export default app;
