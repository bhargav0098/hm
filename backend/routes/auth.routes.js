const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const {
  register, login, demoLogin, logout, refreshToken,
  forgotPassword, verifyOTP, resetPassword, getMe
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

// Strict rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many attempts, please wait 15 minutes.' },
  skip: (req) => req.method === 'OPTIONS',
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many OTP requests.' },
  skip: (req) => req.method === 'OPTIONS',
});

// Validation middleware
const validateRegister = [
  body('fullName').trim().notEmpty().withMessage('Full name required.').isLength({ max: 100 }),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required.'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and number.'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    next();
  }
];

const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required.'),
  body('password').notEmpty().withMessage('Password required.'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    next();
  }
];

// Routes
router.post('/register', authLimiter, validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);
router.post('/demo', authLimiter, demoLogin);
router.post('/logout', protect, logout);
router.post('/refresh', refreshToken);
router.post('/forgot-password', otpLimiter, body('email').isEmail().normalizeEmail(), forgotPassword);
router.post('/verify-otp', otpLimiter, verifyOTP);
router.post('/reset-password', authLimiter, body('password').isLength({ min: 8 }), resetPassword);
router.get('/me', protect, getMe);

module.exports = router;
