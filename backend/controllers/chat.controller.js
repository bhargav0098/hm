const { SkillProfile, Resume, Progress } = require('../models/Career');
const ApiSettings = require('../models/ApiSettings');
const { callLLM } = require('../services/gemini.service');

// Helper: get user's complete LLM configuration (provider, model, key)
const getUserLLMConfig = async (userId) => {
  try {
    const settings = await ApiSettings.findOne({ user: userId });
    if (settings) {
      const keys = settings.getDecryptedKeys();
      const activeProvider = keys.activeProvider || 'default';
      let provider = activeProvider;
      let key = null;
      if (activeProvider === 'default' || activeProvider === 'gemini') {
        key = keys.geminiKey || process.env.GEMINI_API_KEY;
        provider = 'gemini';
      }
      return { provider: provider, model: keys.activeModel || 'gemini-2.0-flash', apiKey: key };
    }
  } catch {}
  return { provider: 'gemini', model: 'gemini-2.0-flash', apiKey: process.env.GEMINI_API_KEY };
};

exports.chatWithMentor = async (req, res, next) => {
  try {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message is required' });

    // Fetch user context
    const [profile, resume, progress] = await Promise.all([
      SkillProfile.findOne({ user: req.user._id }),
      Resume.findOne({ user: req.user._id, isActive: true }),
      Progress.findOne({ user: req.user._id })
    ]);

    const contextStr = `
You are an expert AI Career Mentor named CareerIQ Assistant. You exist within a career intelligence platform.
Your goal is to provide highly specific, actionable advice to the user based on their actual profile data.
Do NOT give generic answers. Always refer back to their specific skills, missing skills, or target role when relevant.

ROUTING CONTEXT:
Guide users to the correct sections of the platform based on their requests:
- "/skills" - To run skill analysis and get their tech stack rated
- "/roadmap" - To generate or view their step-by-step career learning roadmap
- "/resume" - To use the AI Resume Builder to parse, grade, and optimize their resume for ATS
- "/interview" - To practice mock interviews
- "/dashboard" - To view their AI tasks, Career Twin match, and job readiness score

USER CONTEXT:
- Target Role: ${profile?.targetRole || 'Unknown'}
- Experience Level: ${profile?.experienceLevel || 'Unknown'}
- Current Skills: ${profile?.currentSkills?.map(s => s.name).join(', ') || 'None provided'}
- Recent Progress: Level/Streak ${progress?.streak || 0}, Readiness Score: ${progress?.careerReadinessScore || 0}%
- In-progress Roadmap: ${JSON.stringify(profile?.learningRoadmap?.filter(r => !r.completed)?.map(r => r.skill) || [])}
- Resume summary: ${resume?.summary || 'No summary'}
`;

    // Build conversation history
    const conversation = history ? history.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n') : '';

    const prompt = `${contextStr}\n\nCONVERSATION HISTORY:\n${conversation}\n\nUser: ${message}\nAssistant:`;

    const llmConfig = await getUserLLMConfig(req.user._id);
    let reply = '';
    try {
      reply = await callLLM(prompt, llmConfig);
    } catch (llmError) {
      console.warn("[Chat Controller] callLLM failed, returning intelligent mock response:", llmError.message);
      
      const lowerMsg = message.toLowerCase();
      if (lowerMsg.includes('resume')) {
        reply = "It sounds like you need help with your resume! Go to the [Resume Builder](/resume) page. You can upload your existing PDF/DOCX resume, and I'll automatically parse it and optimize it for ATS systems.";
      } else if (lowerMsg.includes('job') || lowerMsg.includes('apply')) {
        reply = "Looking to apply for jobs? First, make sure your resume is ATS-optimized on the [Resume Builder](/resume) page. Then, check your [Dashboard](/dashboard) for your daily AI tasks and job readiness score before you start applying!";
      } else if (lowerMsg.includes('interview')) {
        reply = "Interview preparation is key! Head over to the [Interview Prep](/interview) page. I can conduct mock interviews with you based on your target role and give you a detailed score and feedback.";
      } else if (lowerMsg.includes('skill') || lowerMsg.includes('learn')) {
        reply = "To improve your skills, go to the [Skills Analysis](/skills) page. I will analyze your current tech stack and give you a rating. From there, you can generate a personalized [Career Roadmap](/roadmap) to learn what you're missing!";
      } else if (lowerMsg.includes('dashboard') || lowerMsg.includes('task')) {
        reply = "Your [Dashboard](/dashboard) is your central hub. It tracks your daily tasks, job readiness score, and overall progress. Make sure to complete your tasks every day to maintain your streak!";
      } else if (lowerMsg.includes('hi') || lowerMsg.includes('hello')) {
        reply = "Hello! I'm your CareerIQ Assistant. Even though I'm currently running in offline demo mode (due to API quota limits), I can still guide you around the platform! Ask me how to build a resume, practice interviews, or analyze your skills.";
      } else {
        reply = "I'm currently running in offline/demo mode, but I'm still here to help you navigate CareerIQ! You can ask me how to build a resume, prepare for interviews, analyze your skills, or generate a career roadmap.";
      }
    }

    res.json({ success: true, reply });
  } catch (error) {
    console.error("[Chat Controller] Error:", error);
    next(error);
  }
};
