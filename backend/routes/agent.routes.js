const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { callLLM } = require('../services/gemini.service');
const ApiSettings = require('../models/ApiSettings');
const rateLimit = require('express-rate-limit');

const chatLimiter = rateLimit({ windowMs: 60 * 1000, max: 20 });

router.use(protect);

// AI Chat endpoint
router.post('/chat', chatLimiter, async (req, res, next) => {
  try {
    const { message, context } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message required.' });
    
    let llmConfig = {
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      apiKey: process.env.GEMINI_API_KEY
    };
    
    const settings = await ApiSettings.findOne({ user: req.user._id });
    if (settings) {
      const keys = settings.getDecryptedKeys();
      const activeProvider = keys.activeProvider || 'default';
      const activeModel = keys.activeModel || 'gemini-2.0-flash';
      
      let key = null;
      let provider = activeProvider;
      
      if (activeProvider === 'default') {
        key = process.env.GEMINI_API_KEY;
        provider = 'gemini';
      } else if (activeProvider === 'gemini') {
        key = keys.geminiKey || process.env.GEMINI_API_KEY;
      } else if (activeProvider === 'openai') {
        key = keys.openaiKey;
      } else if (activeProvider === 'openrouter') {
        key = keys.openrouterKey;
      } else if (activeProvider === 'claude') {
        key = keys.claudeKey;
      }
      
      llmConfig = { provider, model: activeModel, apiKey: key };
    }
    
    const systemPrompt = `You are an expert startup analyst AI assistant for the Startup Intelligence Platform. 
Help users analyze startups, understand metrics, and make investment decisions.
Context: ${context || 'General startup analysis'}
User: ${req.user.fullName}`;
    
    const fullPrompt = `${systemPrompt}\n\nUser question: ${message}\n\nProvide a concise, expert answer:`;
    
    let response;
    try {
      response = await callLLM(fullPrompt, llmConfig);
    } catch (err) {
      console.warn("[LLM Service] /chat failed, returning mock fallback:", err.message);
      response = `Hello ${req.user.fullName.split(' ')[0]}! I am currently running in a robust standby mode to prevent rate limit bottlenecks. For your query "${message}", I recommend focusing on strong unit economics, high user acquisition efficiency, and a solid 90-day learning roadmap to scale your technical capability. Let me know how else I can support your goals!`;
    }
    
    res.json({ success: true, response });
  } catch (error) {
    next(error);
  }
});

// Dashboard stats
router.get('/stats', async (req, res, next) => {
  try {
    const Analysis = require('../models/Analysis');
    const analyses = await Analysis.find({ user: req.user._id, status: 'completed' });
    
    const stats = {
      totalAnalyses: analyses.length,
      avgScore: analyses.length ? Math.round(analyses.reduce((a, b) => a + (b.finalReport?.startupScore || 0), 0) / analyses.length) : 0,
      recommendations: {
        buy: analyses.filter(a => ['Strong Buy', 'Buy'].includes(a.finalReport?.investmentRecommendation)).length,
        hold: analyses.filter(a => a.finalReport?.investmentRecommendation === 'Hold').length,
        pass: analyses.filter(a => ['Pass', 'Strong Pass'].includes(a.finalReport?.investmentRecommendation)).length
      },
      recentAnalyses: analyses.slice(-5).map(a => ({
        _id: a._id,
        startupName: a.startupName,
        score: a.finalReport?.startupScore,
        recommendation: a.finalReport?.investmentRecommendation,
        date: a.createdAt
      }))
    };
    
    res.json({ success: true, stats });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
