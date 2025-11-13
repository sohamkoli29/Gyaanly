import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth.js';
import courseRoutes from './routes/courses.js';
import enrollmentRoutes from './routes/enrollments.js';
import uploadRoutes from './routes/upload.js';
import debugRoutes from './routes/debug.js';
import quizRoutes from './routes/quizzes.js';
import certificateRoutes from './routes/certificates.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration - IMPORTANT for file uploads
app.use(cors({
  origin: process.env.FRONTEND_URL, // Frontend URLs
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  
  // Log authentication header (masked)
  if (req.headers.authorization) {
    const token = req.headers.authorization.replace('Bearer ', '');
    console.log(`  → Auth: Bearer ${token.substring(0, 10)}...`);
  } else {
    console.log('  → Auth: None');
  }
  
  next();
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Online Learning Platform API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      courses: '/api/courses',
      enrollments: '/api/enrollments',
      upload: '/api/upload',
      debug: '/api/debug'
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// API Routes - ORDER MATTERS!
// Public routes first, then authenticated routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes); // Upload routes (all require auth)
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/debug', debugRoutes);


// 404 handler - must be after all routes
app.use('*', (req, res) => {
  console.log(`❌ 404 - Route not found: ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Route not found',
    requested: req.originalUrl,
    method: req.method,
    available: [
      'GET /api/health', 
      'GET /api/auth/profile',
      'PUT /api/auth/profile', 
      'GET /api/courses',
      'GET /api/courses/:id',
      'POST /api/courses',
      'PUT /api/courses/:id',
      'DELETE /api/courses/:id',
      'GET /api/courses/instructor/my-courses',
      'POST /api/courses/:courseId/lessons',
      'PUT /api/courses/lessons/:lessonId',
      'DELETE /api/courses/lessons/:lessonId',
      'POST /api/enrollments',
      'GET /api/enrollments/my-courses',
      'GET /api/enrollments/check/:courseId',
      'POST /api/upload/signed-url',
      'POST /api/upload/confirm-upload',
      'GET /api/upload/stream/:lessonId',
      'GET /api/upload/test-storage'
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('❌ Server Error:', error);
  console.error('Stack:', error.stack);
  
  res.status(error.status || 500).json({ 
    error: error.message || 'Internal server error',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log('='.repeat(60));
  console.log('\n📋 Available Endpoints:\n');
  
  console.log('  🏥 Health:');
  console.log(`     GET  http://localhost:${PORT}/api/health\n`);
  
  console.log('  👤 Authentication:');
  console.log(`     GET  http://localhost:${PORT}/api/auth/profile`);
  console.log(`     PUT  http://localhost:${PORT}/api/auth/profile\n`);
  
  console.log('  📚 Courses:');
  console.log(`     GET  http://localhost:${PORT}/api/courses`);
  console.log(`     GET  http://localhost:${PORT}/api/courses/:id`);
  console.log(`     POST http://localhost:${PORT}/api/courses`);
  console.log(`     PUT  http://localhost:${PORT}/api/courses/:id`);
  console.log(`     DEL  http://localhost:${PORT}/api/courses/:id`);
  console.log(`     GET  http://localhost:${PORT}/api/courses/instructor/my-courses\n`);
  
  console.log('  📝 Lessons:');
  console.log(`     POST http://localhost:${PORT}/api/courses/:courseId/lessons`);
  console.log(`     PUT  http://localhost:${PORT}/api/courses/lessons/:lessonId`);
  console.log(`     DEL  http://localhost:${PORT}/api/courses/lessons/:lessonId\n`);
  
  console.log('  🎓 Enrollments:');
  console.log(`     POST http://localhost:${PORT}/api/enrollments`);
  console.log(`     GET  http://localhost:${PORT}/api/enrollments/my-courses`);
  console.log(`     GET  http://localhost:${PORT}/api/enrollments/check/:courseId\n`);
  
  console.log('  📹 Video Upload/Stream:');
  console.log(`     POST http://localhost:${PORT}/api/upload/signed-url`);
  console.log(`     POST http://localhost:${PORT}/api/upload/confirm-upload`);
  console.log(`     GET  http://localhost:${PORT}/api/upload/stream/:lessonId`);
  console.log(`     GET  http://localhost:${PORT}/api/upload/test-storage\n`);
  
  console.log('='.repeat(60) + '\n');
  console.log('✅ Server ready to accept connections\n');
});