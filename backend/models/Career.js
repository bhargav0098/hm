const mongoose = require('mongoose');

// User Skills Profile
const skillProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  currentSkills: [{ name: String, level: { type: String, enum: ['beginner', 'intermediate', 'advanced'] }, yearsExp: Number }],
  targetRole: { type: String },
  targetIndustry: { type: String },
  experienceLevel: { type: String, enum: ['fresher', 'junior', 'mid', 'senior'], default: 'fresher' },
  education: { degree: String, field: String, college: String, year: String },
  careerGoals: [String],
  learningRoadmap: [{
    skill: String,
    priority: { type: String, enum: ['high', 'medium', 'low'] },
    resources: [String],
    estimatedWeeks: Number,
    completed: { type: Boolean, default: false }
  }],
  skillScore: { type: Number, default: 0 },
  lastAnalyzed: Date
}, { timestamps: true });

// Resume
const resumeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, default: 'My Resume' },
  personalInfo: {
    fullName: String, email: String, phone: String,
    location: String, linkedin: String, github: String, website: String
  },
  summary: String,
  experience: [{
    company: String, role: String, duration: String,
    description: String, achievements: [String]
  }],
  education: [{ degree: String, institution: String, year: String, grade: String }],
  skills: [String],
  projects: [{ name: String, description: String, tech: [String], link: String }],
  certifications: [{ name: String, issuer: String, year: String }],
  atsScore: { type: Number, default: 0 },
  aiSuggestions: [String],
  keywords: [String],
  isActive: { type: Boolean, default: true },
  version: { type: Number, default: 1 }
}, { timestamps: true });

// Job Applications
const jobApplicationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  jobTitle: String,
  company: String,
  location: String,
  jobType: { type: String, enum: ['full-time', 'part-time', 'internship', 'freelance', 'remote'] },
  status: { type: String, enum: ['saved', 'applied', 'interview', 'offer', 'rejected'], default: 'saved' },
  salaryRange: String,
  matchScore: Number,
  jobUrl: String,
  notes: String,
  appliedAt: Date,
  source: { type: String, default: 'manual' }
}, { timestamps: true });

// Interview Sessions
const interviewSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['hr', 'technical', 'behavioral', 'mixed'], default: 'mixed' },
  targetRole: String,
  questions: [{
    question: String,
    userAnswer: String,
    aiFeedback: String,
    score: { type: Number, min: 0, max: 10 }
  }],
  overallScore: { type: Number, min: 0, max: 100 },
  strengths: [String],
  improvements: [String],
  duration: Number, // minutes
  status: { type: String, enum: ['pending', 'in-progress', 'completed'], default: 'pending' }
}, { timestamps: true });

// Progress Tracking
const progressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  streak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastActiveDate: Date,
  dailyActivity: [{
    date: { type: Date },
    skillsLearned: { type: Number, default: 0 },
    resumeEdits: { type: Number, default: 0 },
    jobsApplied: { type: Number, default: 0 },
    interviewsPracticed: { type: Number, default: 0 },
    minutesSpent: { type: Number, default: 0 }
  }],
  totalStats: {
    skillsLearned: { type: Number, default: 0 },
    resumeScore: { type: Number, default: 0 },
    jobsApplied: { type: Number, default: 0 },
    interviewsPracticed: { type: Number, default: 0 },
    coursesCompleted: { type: Number, default: 0 }
  },
  badges: [{ name: String, earnedAt: Date, icon: String }],
  careerReadinessScore: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = {
  SkillProfile: mongoose.model('SkillProfile', skillProfileSchema),
  Resume: mongoose.model('Resume', resumeSchema),
  JobApplication: mongoose.model('JobApplication', jobApplicationSchema),
  InterviewSession: mongoose.model('InterviewSession', interviewSessionSchema),
  Progress: mongoose.model('Progress', progressSchema)
};
