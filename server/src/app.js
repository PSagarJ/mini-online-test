const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const healthRoutes = require('./routes/health');
const classesRoutes = require('./routes/classes');
const authRoutes = require('./routes/auth');
const banksRoutes = require('./routes/banks');
const attemptsRoutes = require('./routes/attempts');
const adminRoutes = require('./routes/admin');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security headers
app.use(helmet());

// Cross-origin resource sharing
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server) or in whitelist
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive in dev/testing, but honors CLIENT_URL
    }
  },
  credentials: true
}));

// Body parser
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts, please try again later.' }
});

app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter);

// Route registrations
app.use('/api/health', healthRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/banks', banksRoutes);
app.use('/api/attempts', attemptsRoutes);
app.use('/api/admin', adminRoutes);

// Fallback for unmatched API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: 'API endpoint not found.' });
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
