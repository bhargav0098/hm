const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Input
  startupName: { type: String },
  fileName: { type: String },
  fileSize: { type: Number },
  rawText: { type: String, select: false },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  agentProgress: {
    agentA: { type: String, enum: ['pending', 'running', 'done', 'error'], default: 'pending' },
    agentB: { type: String, enum: ['pending', 'running', 'done', 'error'], default: 'pending' },
    agentC: { type: String, enum: ['pending', 'running', 'done', 'error'], default: 'pending' }
  },
  
  // Agent A - Pitch Deck Analysis
  agentAResult: {
    startupName: String,
    tagline: String,
    problem: String,
    solution: String,
    businessModel: String,
    revenueModel: String,
    fundingStage: String,
    askAmount: String,
    teamSize: String,
    founded: String,
    industry: String,
    targetMarket: String,
    traction: String,
    summary: String
  },
  
  // Agent B - Market & Competitor Analysis
  agentBResult: {
    marketSize: String,
    marketGrowth: String,
    competitors: [{
      name: String,
      strength: String,
      weakness: String,
      marketShare: String
    }],
    swot: {
      strengths: [String],
      weaknesses: [String],
      opportunities: [String],
      threats: [String]
    },
    trends: [String],
    summary: String
  },
  
  // Agent C - Risk Analysis
  agentCResult: {
    overallRisk: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'] },
    riskScore: { type: Number, min: 0, max: 100 },
    financialRisk: { level: String, details: String, score: Number },
    marketRisk: { level: String, details: String, score: Number },
    teamRisk: { level: String, details: String, score: Number },
    operationalRisk: { level: String, details: String, score: Number },
    regulatoryRisk: { level: String, details: String, score: Number },
    fraudIndicators: [String],
    summary: String
  },
  
  // Final Report
  finalReport: {
    executiveSummary: String,
    startupScore: { type: Number, min: 0, max: 100 },
    investmentRecommendation: { type: String, enum: ['Strong Buy', 'Buy', 'Hold', 'Pass', 'Strong Pass'] },
    keyStrengths: [String],
    keyRisks: [String],
    growthOpportunities: [String],
    finalVerdict: String,
    generatedAt: { type: Date, default: Date.now }
  },
  
  // Meta
  processingTime: Number, // ms
  aiProvider: String,
  aiModel: String,
  
}, { timestamps: true });

module.exports = mongoose.model('Analysis', analysisSchema);
