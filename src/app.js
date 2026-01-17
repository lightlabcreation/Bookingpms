const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration - supports multiple origins
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'https://bookingpms.netlify.app',
      'https://localhost:5173'
    ];

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};


app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  }
});
app.use('/api', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Trust proxy (for getting correct IP behind reverse proxy)
app.set('trust proxy', 1);

// API routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to BookingPMS API',
    version: '1.0.0',
    documentation: '/api/health'
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  // Log environment variables status (for debugging)
  console.log('\n[Environment Check]');
  console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
  console.log('CLOUDBEDS_API_KEY:', process.env.CLOUDBEDS_API_KEY ? `Set (${process.env.CLOUDBEDS_API_KEY.substring(0, 10)}...)` : 'NOT SET');
  console.log('CLOUDBEDS_CLIENT_ID:', process.env.CLOUDBEDS_CLIENT_ID ? 'Set' : 'NOT SET');
  console.log('CLOUDBEDS_CLIENT_SECRET:', process.env.CLOUDBEDS_CLIENT_SECRET ? 'Set' : 'NOT SET');
  console.log('FRONTEND_URL:', process.env.FRONTEND_URL || 'not set');
  console.log('\n');
  
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   BookingPMS Backend Server                                ║
║   ─────────────────────────────────────────                ║
║                                                            ║
║   Environment: ${config.nodeEnv.padEnd(40)}║
║   Port: ${PORT.toString().padEnd(47)}║
║   API URL: http://localhost:${PORT}/api                      ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
