const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, minlength: 8, select: false },
  avatar: { type: String, default: '' },
  role: { type: String, enum: ['user', 'admin', 'demo'], default: 'user' },
  isDemo: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  
  // OAuth
  googleId: { type: String },
  githubId: { type: String },
  linkedinId: { type: String },
  oauthProvider: { type: String },
  
  // Profile
  company: { type: String, trim: true },
  bio: { type: String, maxlength: 500 },
  website: { type: String },
  location: { type: String },
  phone: { type: String },
  
  // Security
  lastLogin: { type: Date },
  loginDevices: [{
    device: String,
    ip: String,
    userAgent: String,
    lastSeen: { type: Date, default: Date.now }
  }],
  
  // Refresh tokens
  refreshTokens: [{ type: String, select: false }],
  
  // Activity
  activityHistory: [{
    action: String,
    timestamp: { type: Date, default: Date.now },
    ip: String
  }],
  
  // Preferences
  preferences: {
    theme: { type: String, default: 'dark' },
    notifications: { type: Boolean, default: true },
    defaultModel: { type: String, default: 'gemini-2.0-flash' }
  },
  
  profileCompletionScore: { type: Number, default: 20 },
  
}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Calculate profile completion
userSchema.methods.calculateProfileScore = function() {
  let score = 20; // base
  if (this.fullName) score += 15;
  if (this.avatar) score += 10;
  if (this.company) score += 15;
  if (this.bio) score += 15;
  if (this.website) score += 10;
  if (this.location) score += 10;
  if (this.phone) score += 5;
  return Math.min(score, 100);
};

// Remove sensitive fields on JSON
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokens;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
