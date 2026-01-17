require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',

  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },

  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  },

  rateLimit: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 1000 // limit each IP to 1000 requests per minute
  },

  email: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },

  sms: {
    apiKey: process.env.SMS_API_KEY,
    provider: process.env.SMS_PROVIDER
  },

  // Cloudbeds API Configuration
  cloudbeds: {
    clientId: process.env.CLOUDBEDS_CLIENT_ID,
    clientSecret: process.env.CLOUDBEDS_CLIENT_SECRET,
    apiKey: process.env.CLOUDBEDS_API_KEY,
    hotelSlug: process.env.CLOUDBEDS_HOTEL_SLUG || 'hotel'
  }
};
