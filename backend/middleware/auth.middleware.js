const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT
const protect = async (req, res, next) => {
  if (req.method === 'OPTIONS') {
    return next();
  }

  try {
    let token;
    
    // Get token from header or cookie
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from DB
    const user = await User.findById(decoded.id).select('+refreshTokens');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or deactivated.' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

// Demo restriction middleware
const notDemo = (req, res, next) => {
  if (req.user?.isDemo || req.user?.role === 'demo') {
    return res.status(403).json({
      success: false,
      message: 'Demo accounts cannot perform this action. Please create a full account.'
    });
  }
  next();
};

// Admin only middleware
const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  next();
};

// Optional auth (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  if (req.method === 'OPTIONS') {
    return next();
  }

  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);
    }
  } catch {}
  next();
};

module.exports = { protect, notDemo, adminOnly, optionalAuth };
