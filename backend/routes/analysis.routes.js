const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const rateLimit = require('express-rate-limit');
const { upload, uploadAndAnalyze, getAnalysis, getUserAnalyses, getDemoAnalysis } = require('../controllers/analysis.controller');

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { success: false, message: 'Too many uploads. Try again in an hour.' }
});

router.use(protect);

router.post('/upload', uploadLimiter, upload.single('pitchDeck'), uploadAndAnalyze);
router.get('/demo', getDemoAnalysis);
router.get('/', getUserAnalyses);
router.get('/:id', getAnalysis);

module.exports = router;
