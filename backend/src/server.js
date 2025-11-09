import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import routes
import authRoutes from './routes/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Test routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Online Learning Platform API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// MOUNT ROUTES - This is the critical part
app.use('/api/auth', authRoutes);

// Test if auth routes are working
app.get('/api/test-auth-route', (req, res) => {
  res.json({ message: 'Auth route test - working!' });
});

// 404 handler
app.use('*', (req, res) => {
  console.log('404 - Route not found:', req.originalUrl);
  res.status(404).json({ 
    error: 'Route not found',
    requested: req.originalUrl,
    available: ['/api/health', '/api/auth/profile', '/api/test-auth-route']
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 Available routes:`);
  console.log(`   GET  /api/health`);
  console.log(`   GET  /api/auth/profile`);
  console.log(`   PUT  /api/auth/profile`);
  console.log(`   GET  /api/auth/users`);
});