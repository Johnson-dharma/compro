const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const attendanceRoutes = require('./routes/attendance');
const reportRoutes = require('./routes/reports');
const settingsRoutes = require('./routes/settings');

const { sequelize } = require('./models');
const errorHandler = require('./middleware/errorHandler');
// MVP version - external services removed

const app = express();
const PORT = process.env.PORT || 5000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportRoutes);
// app.use('/api/face-enrollment', faceEnrollmentRoutes); // Commented out - route doesn't exist
app.use('/api/settings', settingsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Database connection and server start
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Sync database (in development) - disabled for MVP to avoid conflicts with migrations
    if (process.env.NODE_ENV === 'development') {
      // await sequelize.sync({ alter: true });
      console.log('✅ Database migrations should be run manually with npm run db:migrate');
    }

    // MVP version - no external services needed
    console.log('✅ MVP mode - all services run locally');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
      console.log('\n📋 Available Services:');
      console.log(`   • Database: ✅ Connected`);
      console.log(`   • Photo Storage: ✅ Database (Base64)`);
      console.log(`   • Admin Review: ✅ Manual Approval`);
      console.log('\n🔗 API Endpoints:');
      console.log(`   • Main API: http://localhost:${PORT}/api`);
      console.log(`   • Attendance: http://localhost:${PORT}/api/attendance`);
      console.log(`   • Health Check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Unable to start server:', error);
    process.exit(1);
  }
};

startServer();
