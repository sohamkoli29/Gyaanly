import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth.js';
import courseRoutes from './routes/courses.js'; // Add this line

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
      auth: '/api/auth',
      courses: '/api/courses'
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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes); // Add this line

// 404 handler
app.use('*', (req, res) => {
  console.log('404 - Route not found:', req.originalUrl);
  res.status(404).json({ 
    error: 'Route not found',
    requested: req.originalUrl,
    available: [
      '/api/health', 
      '/api/auth/profile', 
      '/api/courses',
      '/api/courses/instructor/my-courses'
    ]
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
  console.log(`   GET  /api/courses`);
  console.log(`   GET  /api/courses/:id`);
  console.log(`   POST /api/courses`);
  console.log(`   PUT  /api/courses/:id`);
  console.log(`   DEL  /api/courses/:id`);
  console.log(`   GET  /api/courses/instructor/my-courses`);
});