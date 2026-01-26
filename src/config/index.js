require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',

  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },

  cors: {
    origin: process.env.FRONTEND_URL 
      ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
      : [
          'http://localhost:5173',
          'https://bookingpms.netlify.app',
          'https://bookingpms.netlify.app/'
        ],
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
    hotelSlug: process.env.CLOUDBEDS_HOTEL_SLUG || 'hotel',
    propertyID: process.env.CLOUDBEDS_PROPERTY_ID || null,
    // Base URL for API. Default api.cloudbeds.com (getAvailability). If 404, try: CLOUDBEDS_API_BASE_URL=https://hotels.cloudbeds.com/api/v1.1
    apiBaseUrl: process.env.CLOUDBEDS_API_BASE_URL || 'https://api.cloudbeds.com/api/v1.1'
  }
};
