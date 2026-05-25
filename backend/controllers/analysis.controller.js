const multer = require('multer');
const pdfParse = require('pdf-parse');
const Analysis = require('../models/Analysis');
const ApiSettings = require('../models/ApiSettings');
const { runAgentA, runAgentB, runAgentC, generateFinalReport } = require('../services/gemini.service');

// Multer config - memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are supported.'), false);
  }
});

// Demo analysis data
const DEMO_ANALYSIS = {
  startupName: 'TechVision AI',
  agentAResult: {
    startupName: 'TechVision AI',
    tagline: 'AI-powered supply chain optimization',
    problem: 'Enterprises lose $1.5T yearly to supply chain inefficiencies',
    solution: 'ML-based predictive analytics and real-time optimization',
    businessModel: 'SaaS platform with enterprise licensing',
    revenueModel: 'Monthly subscription + usage-based pricing',
    fundingStage: 'Series A',
    askAmount: '$5M',
    teamSize: '12',
    founded: '2022',
    industry: 'Enterprise SaaS / Supply Chain',
    targetMarket: 'Mid-to-large enterprises with complex supply chains',
    traction: '$800K ARR, 15 enterprise clients, 40% MoM growth',
    summary: 'TechVision AI is disrupting the $2T supply chain market with cutting-edge ML models. Strong early traction with enterprise clients validates product-market fit.'
  },
  agentBResult: {
    marketSize: '$45.4 Billion',
    marketGrowth: '23.4% CAGR',
    competitors: [
      { name: 'Blue Yonder', strength: 'Enterprise relationships', weakness: 'High implementation cost', marketShare: '18%' },
      { name: 'Kinaxis', strength: 'Real-time analytics', weakness: 'Limited AI features', marketShare: '12%' },
      { name: 'o9 Solutions', strength: 'Planning focus', weakness: 'Complex UX', marketShare: '8%' }
    ],
    swot: {
      strengths: ['Proprietary AI models', 'Fast time-to-value', 'Strong team credentials'],
      weaknesses: ['Limited brand recognition', 'Small sales team', 'Early stage revenue'],
      opportunities: ['ESG supply chain compliance wave', 'Post-COVID resilience demand', 'SMB market untapped'],
      threats: ['SAP entering the space', 'Economic slowdown', 'Data privacy regulations']
    },
    trends: ['AI-driven demand forecasting', 'Supply chain visibility platforms', 'Sustainable sourcing analytics', 'Near-shoring acceleration'],
    summary: 'The supply chain AI market is growing rapidly at 23% CAGR. TechVision AI is well-positioned but faces strong competition from established players.'
  },
  agentCResult: {
    overallRisk: 'Medium',
    riskScore: 42,
    financialRisk: { level: 'Medium', details: 'Burn rate manageable at 14 months runway. Revenue growing well.', score: 45 },
    marketRisk: { level: 'Low', details: 'Large addressable market with proven demand. Good timing.', score: 30 },
    teamRisk: { level: 'Low', details: 'Strong domain expertise. CTO from Google, CEO ex-McKinsey.', score: 25 },
    operationalRisk: { level: 'Medium', details: 'Integration complexity with legacy enterprise systems.', score: 55 },
    regulatoryRisk: { level: 'Low', details: 'Minimal regulatory burden in current markets.', score: 20 },
    fraudIndicators: ['No significant fraud indicators detected'],
    summary: 'Overall risk profile is medium. Financial and team risks are well-managed. Main concerns are integration complexity and market competition.'
  },
  finalReport: {
    executiveSummary: 'TechVision AI presents a compelling investment opportunity in the rapidly growing supply chain AI market. With $800K ARR, 40% MoM growth, and strong enterprise traction, the company demonstrates clear product-market fit. The experienced team and proprietary AI technology provide defensible competitive advantages.',
    startupScore: 74,
    investmentRecommendation: 'Buy',
    keyStrengths: ['40% month-over-month growth', 'Proprietary ML technology', 'Experienced founding team'],
    keyRisks: ['Competition from SAP/Oracle', 'Enterprise sales cycles', 'Integration complexity'],
    growthOpportunities: ['SMB market expansion', 'European market entry', 'ESG compliance module'],
    finalVerdict: 'TechVision AI is a strong Buy with a target valuation of $25-30M. The combination of explosive growth, strong team, and large addressable market makes this an attractive Series A investment. Recommend proceeding to full due diligence.'
  },
  status: 'completed'
};

// @desc    Upload and analyze pitch deck
const uploadAndAnalyze = async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'PDF file required.' });
    }
    
    // Create analysis record
    const analysis = await Analysis.create({
      user: req.user._id,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      status: 'processing',
      agentProgress: { agentA: 'pending', agentB: 'pending', agentC: 'pending' }
    });
    
    // Return immediately with analysis ID (async processing)
    res.status(202).json({
      success: true,
      message: 'Analysis started! This may take 30-60 seconds.',
      analysisId: analysis._id
    });
    
    // Process async
    try {
      // Parse PDF
      const pdfData = await pdfParse(req.file.buffer);
      const text = pdfData.text || '';
      
      if (text.length < 50) {
        await Analysis.findByIdAndUpdate(analysis._id, { status: 'failed' });
        return;
      }
      
      await Analysis.findByIdAndUpdate(analysis._id, { rawText: text });
      
      // Get user API settings
      let apiKey = process.env.GEMINI_API_KEY;
      const settings = await ApiSettings.findOne({ user: req.user._id });
      if (settings) {
        const decrypted = settings.getDecryptedKeys();
        if (decrypted.activeProvider === 'gemini' && decrypted.geminiKey) {
          apiKey = decrypted.geminiKey;
        }
      }
      
      // Agent A
      await Analysis.findByIdAndUpdate(analysis._id, { 'agentProgress.agentA': 'running' });
      const agentAResult = await runAgentA(text, apiKey);
      await Analysis.findByIdAndUpdate(analysis._id, {
        agentAResult,
        startupName: agentAResult.startupName,
        'agentProgress.agentA': 'done',
        'agentProgress.agentB': 'running'
      });
      
      // Agent B
      const agentBResult = await runAgentB(agentAResult, apiKey);
      await Analysis.findByIdAndUpdate(analysis._id, {
        agentBResult,
        'agentProgress.agentB': 'done',
        'agentProgress.agentC': 'running'
      });
      
      // Agent C
      const agentCResult = await runAgentC(agentAResult, agentBResult, apiKey);
      await Analysis.findByIdAndUpdate(analysis._id, {
        agentCResult,
        'agentProgress.agentC': 'done'
      });
      
      // Final Report
      const finalReport = await generateFinalReport(agentAResult, agentBResult, agentCResult, apiKey);
      
      await Analysis.findByIdAndUpdate(analysis._id, {
        finalReport: { ...finalReport, generatedAt: new Date() },
        status: 'completed',
        processingTime: Date.now() - startTime,
        aiProvider: 'gemini',
        aiModel: 'gemini-2.0-flash'
      });
      
    } catch (err) {
      console.error('Analysis processing error:', err.message);
      await Analysis.findByIdAndUpdate(analysis._id, { status: 'failed' });
    }
    
  } catch (error) {
    next(error);
  }
};

// @desc    Get analysis status/result
const getAnalysis = async (req, res, next) => {
  try {
    const analysis = await Analysis.findOne({ _id: req.params.id, user: req.user._id })
      .select('-rawText');
    
    if (!analysis) {
      return res.status(404).json({ success: false, message: 'Analysis not found.' });
    }
    
    res.json({ success: true, analysis });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all analyses for user
const getUserAnalyses = async (req, res, next) => {
  try {
    // Return demo data for demo users
    if (req.user.isDemo) {
      return res.json({ success: true, analyses: [{ ...DEMO_ANALYSIS, _id: 'demo123', createdAt: new Date(), user: req.user._id }], total: 1 });
    }
    
    const analyses = await Analysis.find({ user: req.user._id })
      .select('-rawText -agentAResult -agentBResult -agentCResult')
      .sort({ createdAt: -1 })
      .limit(20);
    
    res.json({ success: true, analyses, total: analyses.length });
  } catch (error) {
    next(error);
  }
};

// @desc    Get demo analysis
const getDemoAnalysis = async (req, res) => {
  res.json({ success: true, analysis: { ...DEMO_ANALYSIS, _id: 'demo123', createdAt: new Date() } });
};

module.exports = { upload, uploadAndAnalyze, getAnalysis, getUserAnalyses, getDemoAnalysis };
