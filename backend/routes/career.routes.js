const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/auth.middleware');
const c = require('../controllers/career.controller');

const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 15, message: { success: false, message: 'Slow down! Too many AI requests.' } });

router.use(protect);

// Dashboard & Intelligence
router.get('/dashboard', c.getDashboardStats);
router.get('/weekly-report', c.getWeeklyReport);
router.get('/daily-tasks', c.getDailyTasks);
router.post('/tasks/:id/complete', c.completeTask);
router.post('/tasks/:id/skip', c.skipTask);

// Career Plan
router.get('/career-plan', c.getCareerPlan);

// Skill Agent
router.post('/skills/analyze', aiLimiter, c.analyzeSkills);
router.get('/skills/profile', c.getSkillProfile);
router.put('/skills/roadmap/complete', c.markRoadmapComplete);

// Resume Agent
router.post('/resume/analyze', aiLimiter, c.analyzeResume);
router.post('/resume/save', c.saveResume);
router.get('/resume', c.getResume);

// Job Matching Agent
router.post('/jobs/match', aiLimiter, c.matchJobs);
router.post('/jobs/save', c.saveJobApplication);
router.get('/jobs', c.getJobApplications);
router.put('/jobs/:id/status', c.updateJobStatus);

// Interview Agent
router.post('/interview/generate', aiLimiter, c.generateInterview);
router.post('/interview/answer', aiLimiter, c.submitAnswer);
router.post('/interview/complete', c.completeInterview);
router.get('/interview/history', c.getInterviewHistory);

// Roadmap & Opportunities
router.post('/roadmap', aiLimiter, c.generateRoadmap);
router.post('/roadmap/save', c.saveRoadmap);
router.post('/opportunities', aiLimiter, c.findOpportunities);

// Progress
router.get('/progress', c.getProgress);

module.exports = router;
