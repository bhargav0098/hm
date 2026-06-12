const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/auth.middleware');
const { chatWithMentor } = require('../controllers/chat.controller');

const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, message: { success: false, message: 'Slow down! Too many requests.' } });

router.post('/', protect, aiLimiter, chatWithMentor);

module.exports = router;
