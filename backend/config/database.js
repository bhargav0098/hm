const mongoose = require('mongoose');

let cachedPromise = null;

const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in environment variables. Database connection deferred.');
    return null;
  }

  // If already connected, return the connection
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!cachedPromise) {
    const opts = {
      bufferCommands: false, // Disable mongoose buffering to prevent silent 10s timeouts
    };

    console.log('📡 Connecting to MongoDB...');
    cachedPromise = mongoose.connect(process.env.MONGODB_URI, opts).then((conn) => {
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      
      // Create demo user on startup (once per connection establishment)
      const User = require('../models/User');
      const bcrypt = require('bcryptjs');
      User.findOne({ email: process.env.DEMO_EMAIL || 'demo@startupiq.ai' })
        .then(async (demo) => {
          if (!demo) {
            const hash = await bcrypt.hash(process.env.DEMO_PASSWORD || 'Demo@12345', 12);
            await User.create({
              fullName: 'Demo User',
              email: process.env.DEMO_EMAIL || 'demo@startupiq.ai',
              password: hash,
              isDemo: true,
              isVerified: true,
              role: 'demo',
              avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo'
            });
            console.log('✅ Demo user created');
          }
        })
        .catch((e) => {
          console.log('Demo user setup failed:', e.message);
        });

      return conn;
    }).catch((err) => {
      cachedPromise = null; // Reset cached promise on connection error
      throw err;
    });
  }

  try {
    await cachedPromise;
  } catch (error) {
    cachedPromise = null;
    console.error('❌ MongoDB connection error:', error.message);
    throw error;
  }

  return mongoose.connection;
};

module.exports = connectDB;

