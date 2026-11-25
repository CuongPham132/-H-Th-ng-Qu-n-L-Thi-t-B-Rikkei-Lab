const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const apiRoutes = require('./routes');
const errorHandler = require('./middleware/errorHandler.middleware');
const { success, error } = require('./utils/apiResponse');

const app = express();

// Security and utility middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging (skip in test environment)
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// System Health Check Endpoint
app.get('/health', (req, res) => {
  return success(res, {
    status: 'UP',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  }, 'Rikkei Lab Backend is healthy');
});

// Mount API routes
app.use('/api', apiRoutes);

// 404 Route Handler for undefined endpoints
app.use('*', (req, res) => {
  return error(res, `Đường dẫn ${req.originalUrl} không tồn tại trên hệ thống.`, 404);
});

// Centralized Error Handler Middleware (must be attached last)
app.use(errorHandler);

module.exports = app;
