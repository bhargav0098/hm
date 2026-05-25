const User = require('../models/User');
const OTP = require('../models/OTP');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken, setCookies, clearCookies } = require('../utils/jwt.utils');
const { sendOTPEmail, sendWelcomeEmail } = require('../services/email.service');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// @desc    Register
// @route   POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { fullName, email, password } = req.body;
    
    // Check existing user
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }
    
    // Create user
    const user = await User.create({
      fullName,
      email,
      password,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
      isVerified: false
    });
    
    // Send verification OTP
    const otp = generateOTP();
    await OTP.deleteMany({ email, type: 'email_verify' });
    await OTP.create({ email, otp, type: 'email_verify' });
    
    try {
      await sendOTPEmail(email, otp, 'email_verify');
    } catch (emailErr) {
      console.log('Email send failed:', emailErr.message);
    }
    
    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    
    user.refreshTokens = [refreshToken];
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
    
    setCookies(res, accessToken, refreshToken);
    
    res.status(201).json({
      success: true,
      message: 'Account created! Please verify your email.',
      user: user.toJSON(),
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login
// @route   POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;
    
    const user = await User.findOne({ email }).select('+password +refreshTokens');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }
    
    if (!user.password) {
      return res.status(401).json({ success: false, message: 'Please login with your OAuth provider.' });
    }
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }
    
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account deactivated. Contact support.' });
    }
    
    // Update activity
    user.lastLogin = new Date();
    const ip = req.ip || req.connection.remoteAddress;
    const ua = req.headers['user-agent'] || 'unknown';
    
    // Track device (max 5)
    user.loginDevices = user.loginDevices || [];
    const existing = user.loginDevices.find(d => d.ip === ip);
    if (existing) {
      existing.lastSeen = new Date();
      existing.userAgent = ua;
    } else {
      user.loginDevices.unshift({ device: detectDevice(ua), ip, userAgent: ua });
      if (user.loginDevices.length > 5) user.loginDevices = user.loginDevices.slice(0, 5);
    }
    
    user.activityHistory.unshift({ action: 'login', ip });
    if (user.activityHistory.length > 20) user.activityHistory = user.activityHistory.slice(0, 20);
    
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    
    // Manage refresh tokens (max 5)
    user.refreshTokens = user.refreshTokens || [];
    user.refreshTokens.unshift(refreshToken);
    if (user.refreshTokens.length > 5) user.refreshTokens = user.refreshTokens.slice(0, 5);
    
    await user.save({ validateBeforeSave: false });
    setCookies(res, accessToken, refreshToken);
    
    res.json({
      success: true,
      message: 'Login successful!',
      user: user.toJSON(),
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Demo Login
// @route   POST /api/auth/demo
const demoLogin = async (req, res, next) => {
  try {
    const demo = await User.findOne({ email: process.env.DEMO_EMAIL || 'demo@startupiq.ai' }).select('+refreshTokens');
    if (!demo) {
      return res.status(404).json({ success: false, message: 'Demo account not set up.' });
    }
    
    const accessToken = generateAccessToken(demo._id);
    const refreshToken = generateRefreshToken(demo._id);
    
    demo.lastLogin = new Date();
    demo.refreshTokens = demo.refreshTokens || [];
    demo.refreshTokens.unshift(refreshToken);
    await demo.save({ validateBeforeSave: false });
    
    setCookies(res, accessToken, refreshToken);
    
    res.json({
      success: true,
      message: 'Demo login successful!',
      user: demo.toJSON(),
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout
// @route   POST /api/auth/logout
const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    
    if (req.user && refreshToken) {
      await User.updateOne(
        { _id: req.user._id },
        { $pull: { refreshTokens: refreshToken } }
      );
    }
    
    clearCookies(res);
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) return res.status(401).json({ success: false, message: 'No refresh token.' });
    
    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.id).select('+refreshTokens');
    
    if (!user || !user.refreshTokens?.includes(token)) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
    }
    
    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);
    
    // Rotate refresh token
    user.refreshTokens = user.refreshTokens.filter(t => t !== token);
    user.refreshTokens.unshift(newRefreshToken);
    await user.save({ validateBeforeSave: false });
    
    setCookies(res, newAccessToken, newRefreshToken);
    
    res.json({ success: true, accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
  }
};

// @desc    Send OTP for password reset
// @route   POST /api/auth/forgot-password
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    // Always return same message (security)
    if (!user) {
      return res.json({ success: true, message: 'If this email exists, an OTP has been sent.' });
    }
    
    // Rate limit: max 3 OTPs per 15 min
    const recentOTPs = await OTP.countDocuments({
      email,
      type: 'password_reset',
      createdAt: { $gt: new Date(Date.now() - 15 * 60 * 1000) }
    });
    
    if (recentOTPs >= 3) {
      return res.status(429).json({ success: false, message: 'Too many OTP requests. Wait 15 minutes.' });
    }
    
    const otp = generateOTP();
    await OTP.deleteMany({ email, type: 'password_reset' });
    await OTP.create({ email, otp, type: 'password_reset' });
    
    await sendOTPEmail(email, otp, 'password_reset');
    
    res.json({ success: true, message: 'OTP sent to your email. Check inbox.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp, type } = req.body;
    
    const record = await OTP.findOne({ email, type, used: false });
    
    if (!record) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }
    
    if (record.attempts >= 5) {
      await OTP.deleteOne({ _id: record._id });
      return res.status(400).json({ success: false, message: 'Too many attempts. Request new OTP.' });
    }
    
    if (record.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP expired. Request new one.' });
    }
    
    if (record.otp !== otp) {
      await OTP.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
      const remaining = 5 - record.attempts - 1;
      return res.status(400).json({ success: false, message: `Incorrect OTP. ${remaining} attempts left.` });
    }
    
    // Mark as used
    await OTP.updateOne({ _id: record._id }, { used: true });
    
    // Generate reset token (for password reset flow)
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    if (type === 'email_verify') {
      await User.findOneAndUpdate({ email }, { isVerified: true });
    }
    
    res.json({ success: true, message: 'OTP verified!', resetToken });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, password } = req.body;
    
    // Re-verify OTP is marked used (security check)
    const record = await OTP.findOne({ email, type: 'password_reset', used: true });
    if (!record) {
      return res.status(400).json({ success: false, message: 'Please verify your OTP first.' });
    }
    
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    
    user.password = password;
    await user.save();
    
    // Cleanup
    await OTP.deleteMany({ email, type: 'password_reset' });
    
    // Invalidate all refresh tokens
    await User.updateOne({ email }, { refreshTokens: [] });
    
    clearCookies(res);
    res.json({ success: true, message: 'Password reset successfully! Please login.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

const detectDevice = (ua) => {
  if (!ua) return 'Unknown';
  if (/mobile/i.test(ua)) return 'Mobile';
  if (/tablet|ipad/i.test(ua)) return 'Tablet';
  return 'Desktop';
};

module.exports = { register, login, demoLogin, logout, refreshToken, forgotPassword, verifyOTP, resetPassword, getMe };
