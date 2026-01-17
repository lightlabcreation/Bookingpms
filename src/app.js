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
  // Detailed environment variables check for Railway debugging
  const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID;
  const envStatus = {
    NODE_ENV: process.env.NODE_ENV || 'not set',
    CLOUDBEDS_API_KEY: process.env.CLOUDBEDS_API_KEY ? `✓ Set (${process.env.CLOUDBEDS_API_KEY.substring(0, 10)}...)` : '✗ NOT SET',
    CLOUDBEDS_CLIENT_ID: process.env.CLOUDBEDS_CLIENT_ID ? '✓ Set' : '✗ NOT SET',
    CLOUDBEDS_CLIENT_SECRET: process.env.CLOUDBEDS_CLIENT_SECRET ? '✓ Set' : '✗ NOT SET',
    FRONTEND_URL: process.env.FRONTEND_URL || 'not set',
    DATABASE_URL: process.env.DATABASE_URL ? '✓ Set' : '✗ NOT SET',
    RAILWAY_ENV: isRailway ? '✓ Running on Railway' : '✗ Not Railway'
  };
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('[Environment Check]');
  console.log('═══════════════════════════════════════════════════════════');
  Object.entries(envStatus).forEach(([key, value]) => {
    console.log(`${key.padEnd(25)}: ${value}`);
  });
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // Warning if Cloudbeds API key is missing
  if (!process.env.CLOUDBEDS_API_KEY) {
    console.warn('⚠️  WARNING: CLOUDBEDS_API_KEY is not set!');
    console.warn('   Cloudbeds API will not work until this is set in Railway Dashboard.');
    console.warn('   Go to: Railway Dashboard → Settings → Variables → Add CLOUDBEDS_API_KEY\n');
  }
  
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   BookingPMS Backend Server                                ║
║   ─────────────────────────────────────────                ║
║                                                            ║
║   Environment: ${config.nodeEnv.padEnd(40)}║
║   Port: ${PORT.toString().padEnd(47)}║
║   API URL: http://localhost:${PORT}/api                      ║
║   Platform: ${isRailway ? 'Railway' : 'Local'}`.padEnd(60) + `║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
