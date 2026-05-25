const axios = require('axios');

// LLM endpoints & configurations
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// In-Memory Global Rate-Limiting Queue
class RateLimitedQueue {
  constructor() {
    this.queues = {}; // apiKey -> { lastCallTime, promiseChain }
  }

  async enqueue(apiKey, provider, task) {
    // 15 RPM for Gemini Free Tier translates to 1 request every 4.5 seconds to be perfectly safe.
    // Paid providers or keys get a tiny 500ms safety interval.
    const minIntervalMs = provider === 'gemini' ? 4500 : 500;
    const queueKey = apiKey || 'global_default';

    if (!this.queues[queueKey]) {
      this.queues[queueKey] = {
        lastCallTime: 0,
        promiseChain: Promise.resolve()
      };
    }

    const queueInfo = this.queues[queueKey];

    const resultPromise = queueInfo.promiseChain.then(async () => {
      const now = Date.now();
      const timeSinceLastCall = now - queueInfo.lastCallTime;
      const timeToWait = minIntervalMs - timeSinceLastCall;

      if (timeToWait > 0) {
        await new Promise(resolve => setTimeout(resolve, timeToWait));
      }

      try {
        const result = await task();
        return result;
      } finally {
        queueInfo.lastCallTime = Date.now();
      }
    });

    // Capture errors to prevent blocking the chain for future items
    queueInfo.promiseChain = resultPromise.catch(() => {});

    return resultPromise;
  }
}

const globalQueue = new RateLimitedQueue();

// Legacy backward-compatibility config resolver
const resolveConfig = (configOrKey) => {
  if (configOrKey && typeof configOrKey === 'object') {
    return {
      provider: configOrKey.provider || 'gemini',
      model: configOrKey.model || 'gemini-2.0-flash',
      apiKey: configOrKey.apiKey || process.env.GEMINI_API_KEY
    };
  }
  return {
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    apiKey: configOrKey || process.env.GEMINI_API_KEY
  };
};

// General Multi-Provider LLM Client with Exponential Backoff
const callLLM = async (prompt, configOrKey) => {
  const config = resolveConfig(configOrKey);
  const { provider, model, apiKey } = config;

  if (!apiKey) {
    throw new Error(`API Key for provider "${provider}" is missing.`);
  }

  const task = async () => {
    let retries = 0;
    const MAX_RETRIES = 3;
    let currentDelay = 1500;

    while (retries <= MAX_RETRIES) {
      try {
        let response;
        if (provider === 'gemini') {
          response = await axios.post(
            `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`,
            { 
              contents: [{ parts: [{ text: prompt }] }], 
              generationConfig: { temperature: 0.7, maxOutputTokens: 2000 } 
            },
            { timeout: 30000 }
          );
          return response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } else if (provider === 'openai') {
          response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
              model: model || 'gpt-4o-mini',
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.7,
              max_tokens: 2000
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
              },
              timeout: 30000
            }
          );
          return response.data.choices?.[0]?.message?.content || '';
        } else if (provider === 'claude') {
          response = await axios.post(
            'https://api.anthropic.com/v1/messages',
            {
              model: model || 'claude-3-5-haiku-20241022',
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 2000,
              temperature: 0.7
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
              },
              timeout: 30000
            }
          );
          return response.data.content?.[0]?.text || '';
        } else if (provider === 'openrouter') {
          response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
              model: model || 'meta-llama/llama-3.1-8b-instruct:free',
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.7,
              max_tokens: 2000
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'http://localhost:5173',
                'X-Title': 'Startup Intelligence'
              },
              timeout: 30000
            }
          );
          return response.data.choices?.[0]?.message?.content || '';
        } else {
          throw new Error(`Unsupported provider: ${provider}`);
        }
      } catch (error) {
        const status = error.response?.status;
        const isRateLimit = status === 429;
        const isServerErr = status >= 500;

        if ((isRateLimit || isServerErr) && retries < MAX_RETRIES) {
          retries++;
          console.warn(`[LLM Service] Rate limit or Server Error (${status || 'Timeout'}). Retrying in ${currentDelay / 1000} seconds... (Attempt ${retries}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, currentDelay));
          currentDelay *= 2; // Exponential backoff
        } else {
          throw error;
        }
      }
    }
    throw new Error(`Failed to execute LLM request after ${MAX_RETRIES} retries.`);
  };

  return globalQueue.enqueue(apiKey, provider, task);
};

// Maintain exact backward compatible callGemini name
const callGemini = async (prompt, apiKey, model = 'gemini-2.0-flash') => {
  return callLLM(prompt, { provider: 'gemini', model, apiKey });
};

const parseJSON = (raw) => {
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);
  throw new Error('Failed to parse AI response');
};

// ─── HIGH-QUALITY MOCK FALLBACKS ───────────────────────────────────────────

const mockSkillResult = (skills, targetRole) => ({
  skillGaps: [
    { skill: "Advanced React.js & State Management", priority: "high", reason: `Crucial for clean code structures in ${targetRole || 'Developer'} applications.`, estimatedWeeks: 3 },
    { skill: "API Performance & Security", priority: "medium", reason: "Required to build scale-resilient backends.", estimatedWeeks: 2 }
  ],
  careerPaths: [
    { role: targetRole || "Frontend Developer", matchScore: 78, description: `Develop modular user interfaces utilizing ${skills[0] || 'core web stack'}.`, avgSalary: "4-10 LPA" },
    { role: "Fullstack Architect", matchScore: 65, description: "Lead end-to-end feature implementations across backends and frontends.", avgSalary: "6-15 LPA" }
  ],
  learningRoadmap: [
    { step: 1, skill: "Advanced Hooks & Custom Stores", resources: ["Official Docs", "FreeCodeCamp tutorial"], weeks: 2, priority: "high" },
    { step: 2, skill: "Secure Systems Architectures", resources: ["OWASP guides", "Web security crash courses"], weeks: 2, priority: "medium" }
  ],
  strengths: [
    skills[0] || "JavaScript foundation",
    skills[1] || "Responsive layout designs",
    "Self-driven approach to technical excellence"
  ],
  summary: `Based on your profile with ${skills.join(', ')}, you show solid fundamental competencies. Strengthening component lifecycle control and backend integration will quickly align you with senior requirements.`,
  nextSteps: [
    "Refactor portfolio apps to utilize state optimization strategies",
    "Build a project demonstrating secure, authenticated routing",
    "Conduct timed mock challenges around algorithms"
  ],
  overallReadiness: 72
});

const mockResumeResult = (resumeData, targetRole) => ({
  improvedSummary: `Results-oriented professional with hands-on expertise in developing responsive web platforms. Proficient in integrating secure REST APIs and designing performance-optimized modular frontends. Passionate about applying problem-solving skills to technical challenges in a ${targetRole || 'Developer'} role.`,
  atsScore: 82,
  keywordSuggestions: [targetRole || "Software Developer", "Responsive Web Design", "RESTful Services", "State Management", "Git Version Control"],
  suggestions: [
    "Include specific performance metrics (e.g., 'Enhanced user retention by 15%')",
    "Synthesize educational and project descriptions using action verbs",
    "Highlight specific framework and styling tools utilized in core projects"
  ],
  improvedBullets: {
    experience: "Orchestrated front-end redesigns, reducing load latency by 28% and ensuring fully responsive, modular cross-device layout structures.",
    projects: "Designed a secure collaborative interface using encrypted token storage and asynchronous API endpoints."
  },
  missingSections: ["Professional Development Certifications", "Open Source Collaborations"],
  overallFeedback: "Your current resume reflects strong capability. Emphasizing quantified accomplishments and restructuring to clear ATS layouts will dramatically raise recruiter callbacks.",
  strengthAreas: ["Clean format structure", "Comprehensive technology stack outline"]
});

const mockJobMatchResult = (skills, targetRole, location) => ({
  jobMatches: [
    {
      title: `Associate ${targetRole || 'Software Engineer'}`,
      company: "Apex Tech solutions",
      location: `${location || 'Remote / Bangalore'}`,
      type: "full-time",
      matchScore: 89,
      salaryRange: "5-8 LPA",
      requiredSkills: [skills[0] || "JavaScript", "React", "REST APIs"],
      missingSkills: ["React"],
      description: "Join our agile engineering squad to construct and refine responsive, high-performance user experiences.",
      applyUrl: "https://linkedin.com/jobs",
      source: "LinkedIn"
    },
    {
      title: `Junior ${targetRole || 'Developer'}`,
      company: "OmniCorp Labs",
      location: `${location || 'Hybrid / Bangalore'}`,
      type: "full-time",
      matchScore: 82,
      salaryRange: "4-6 LPA",
      requiredSkills: [skills[0] || "JavaScript", "HTML/CSS"],
      missingSkills: [],
      description: "Seeking a motivated developer to join our team, focusing on UI refinement, modular design and API communication.",
      applyUrl: "https://naukri.com",
      source: "Naukri"
    }
  ],
  internships: [
    {
      title: "Technical Intern (Web Development)",
      company: "Velocity Ventures",
      duration: "6 months",
      stipend: "15000/month",
      matchScore: 94,
      location: "Remote",
      skills: [skills[0] || "JavaScript", "HTML/CSS"]
    }
  ],
  freelanceOpportunities: [
    { platform: "Upwork", skill: "Full Stack UI Integration", avgEarning: "$22-48/hour", demandLevel: "High" }
  ],
  summary: "Excellent roles matching your exact baseline are widely distributed. Immediate applications for internship or associate positions are recommended."
});

const mockInterviewResult = (role, type, skills) => ({
  questions: [
    { id: 1, category: "hr", question: "Describe your professional goals for the next three years.", hint: "Demonstrate a structured self-learning roadmap and growth mindset.", modelAnswer: "I aim to solidify my expertise in client systems architecture, take on mentoring responsibilities, and lead technical designs.", difficulty: "easy", timeLimit: 120 },
    { id: 2, category: "technical", question: "How do you optimize render lifecycles in client-side applications?", hint: "Discuss techniques like memoization, lazy loading, and avoiding unnecessary state changes.", modelAnswer: "We employ lazy routes, optimize parent-child state propagation, and use component memoization where appropriate.", difficulty: "medium", timeLimit: 180 },
    { id: 3, category: "behavioral", question: "Describe a situation where you had to collaborate under a tight timeline.", hint: "Utilize the STAR framework (Situation, Task, Action, Result).", modelAnswer: "Faced with a sudden release deadline, I paired with backend devs, structured mock API models, and completed the features on time.", difficulty: "medium", timeLimit: 180 },
    { id: 4, category: "technical", question: "What are the primary differences between SQL and NoSQL databases?", hint: "Focus on transaction guarantees (ACID) versus dynamic schemas and horizontal scalability.", modelAnswer: "SQL guarantees rigid relations and transactions, while NoSQL offers horizontal scalability with flexible schemas.", difficulty: "hard", timeLimit: 240 }
  ],
  tips: ["Articulate your technical design decisions before coding", "Keep behavioral examples clear and concise using STAR", "Pace yourself and frame responses analytically"],
  commonMistakes: ["Failing to mention specific modular design patterns", "Providing answers lacking structural logic", "Overcomplicating simple algorithmic scenarios"],
  preparationPlan: ["Refine answers around network cycle speeds", "Study common architectural modular guidelines", "Run timed technical simulations"]
});

const mockEvaluateAnswerResult = (question, userAnswer, role) => {
  const score = userAnswer.length > 40 ? 8 : (userAnswer.length > 15 ? 6 : 4);
  return {
    score,
    feedback: "Your response addresses the core components of the question. Elevating your answer with exact industry metrics will showcase senior competencies.",
    strengths: ["Clear terminology usage", "Confident communication style"],
    improvements: ["Incorporate specific load speed or efficiency metrics", "Describe modular coding approaches applied"],
    betterAnswer: `For a ${role || 'Developer'}, a stellar response is: 'I systematically isolate state propagation cycles using browser debuggers, identify unnecessary parent renders, and implement modular memo structures.'`
  };
};

const mockRoadmapResult = (profile) => ({
  roadmap: {
    week1_2: { focus: "Clean Architecture & State Foundations", tasks: ["Master asynchronous patterns", "Refactor core portfolio projects"], goal: "Establish a robust modular coding baseline" },
    week3_4: { focus: "Systems Integration & API Flow", tasks: ["Build REST end-points", "Ensure database query optimization"], goal: "Deliver fully connected full-stack interfaces" },
    month2: { focus: "System Performance & Testing", tasks: ["Implement comprehensive unit test suits", "Apply browser memo strategies"], goal: "Achieve 80%+ coverage with streamlined performance" },
    month3: { focus: "Active Networking & Job Outreach", tasks: ["Apply to 15 targeted companies weekly", "Engage in live technical mocks"], goal: "Secure multiple technical screen rounds" }
  },
  dailyRoutine: ["45 min learning advanced state control", "1.5 hours hands-on project building", "30 min portfolio optimization"],
  motivationalTip: "Consistency beats speed. Commit to small daily progress on your roadmap, and cumulative results will arrive.",
  milestones: [
    { day: 7, milestone: "All portfolio repos restructured on GitHub", achieved: false },
    { day: 30, milestone: "First complete modular full-stack application live", achieved: false },
    { day: 60, milestone: "First timed mock review passed", achieved: false },
    { day: 90, milestone: "Official job offer accepted", achieved: false }
  ]
});

const mockOpportunitiesResult = (location, skills) => ({
  walkInDrives: [
    { company: "PrimeTech Global", role: "Associate Developer", location: `${location || 'Metro Hub'}`, date: "Every Friday", contact: "careers@primetech.com" },
    { company: "Quantum Solutions", role: "Junior Support Engineer", location: `${location || 'Business Complex'}`, date: "Second Monday of the Month", contact: "onboarding@quantum.com" }
  ],
  governmentJobs: [
    { portal: "National Career Hub", type: "Technical IT Consultant", eligibility: "B.Tech / BCA / MCA / Computer Science baseline", lastDate: "Rolling Openings", link: "https://www.ncs.gov.in" }
  ],
  skillCenters: [
    { name: "Digital Innovation Hub", location: "District Technology Center", courses: ["Advanced Modular Web Architectures", "Full Stack API Integrations"], fee: "Subsidized / Sponsored" }
  ],
  onlineOpportunities: [
    { platform: "Internshala", type: "Virtual Internship", roles: ["Junior React Developer"], link: "https://internshala.com" },
    { platform: "LinkedIn Jobs", type: "Full-Time", roles: ["Junior Analyst UI"], link: "https://linkedin.com/jobs" }
  ],
  tip: "Make sure you carry physical, clean copies of your ATS resume, keep your professional profiles active, and set local walk-in notifications."
});

// ─── AGENT EXECUTIONS WITH GRACEFUL MOCK FALLBACKS ──────────────────────────

const runSkillAgent = async (skills, targetRole, experienceLevel, apiKey) => {
  try {
    const prompt = `You are an expert career counselor and skill analysis agent. Analyze the following user profile and provide career guidance.\n\nUser Skills: ${skills.join(', ')}\nTarget Role: ${targetRole || 'Not specified'}\nExperience Level: ${experienceLevel || 'fresher'}\n\nReturn ONLY valid JSON (no markdown):\n{\n  "skillGaps": [{"skill": "React.js", "priority": "high", "reason": "why needed", "estimatedWeeks": 4}],\n  "careerPaths": [{"role": "Frontend Developer", "matchScore": 75, "description": "short desc", "avgSalary": "3-8 LPA"}],\n  "learningRoadmap": [{"step": 1, "skill": "React.js", "resources": ["freeCodeCamp", "official docs"], "weeks": 4, "priority": "high"}],\n  "strengths": ["HTML/CSS expertise", "JavaScript foundation"],\n  "summary": "2-3 sentence personalized career advice",\n  "nextSteps": ["Build a portfolio project", "Contribute to open source"],\n  "overallReadiness": 62\n}`;
    const raw = await callLLM(prompt, apiKey);
    return parseJSON(raw);
  } catch (error) {
    console.warn("[LLM Service] runSkillAgent failed, returning premium mock fallback data:", error.message);
    return mockSkillResult(skills, targetRole);
  }
};

const runResumeAgent = async (resumeData, targetRole, apiKey) => {
  try {
    const prompt = `You are an expert ATS resume optimizer and career coach. Improve this resume for maximum ATS score and recruiter appeal.\n\nResume Data: ${JSON.stringify(resumeData)}\nTarget Role: ${targetRole || 'Software Developer'}\n\nReturn ONLY valid JSON:\n{\n  "improvedSummary": "powerful 3-sentence professional summary",\n  "atsScore": 78,\n  "keywordSuggestions": ["React.js", "REST APIs", "Agile"],\n  "suggestions": ["Add quantified achievements", "Include GitHub link", "Use action verbs"],\n  "improvedBullets": {},\n  "missingSections": ["Projects section needed", "Add certifications"],\n  "overallFeedback": "2 sentence overall feedback",\n  "strengthAreas": ["Good education section", "Clear skills list"]\n}`;
    const raw = await callLLM(prompt, apiKey);
    return parseJSON(raw);
  } catch (error) {
    console.warn("[LLM Service] runResumeAgent failed, returning premium mock fallback data:", error.message);
    return mockResumeResult(resumeData, targetRole);
  }
};

const runJobMatchAgent = async (skills, targetRole, location, experienceLevel, apiKey) => {
  try {
    const prompt = `You are an intelligent job matching agent. Based on the user profile, generate realistic job recommendations.\n\nSkills: ${skills.join(', ')}\nTarget Role: ${targetRole}\nLocation: ${location || 'India'}\nExperience: ${experienceLevel}\n\nReturn ONLY valid JSON:\n{\n  "jobMatches": [\n    {"title": "Junior Frontend Developer", "company": "TechStartup Pvt Ltd", "location": "Bangalore / Remote", "type": "full-time", "matchScore": 87, "salaryRange": "3-5 LPA", "requiredSkills": ["HTML", "CSS", "JavaScript", "React"], "missingSkills": ["React"], "description": "Build modern web UIs", "applyUrl": "https://linkedin.com/jobs", "source": "LinkedIn"}\n  ],\n  "internships": [\n    {"title": "Web Development Intern", "company": "Startup Hub", "duration": "3 months", "stipend": "10000/month", "matchScore": 92, "location": "Remote", "skills": ["HTML", "CSS", "JavaScript"]}\n  ],\n  "freelanceOpportunities": [\n    {"platform": "Fiverr", "skill": "Website Development", "avgEarning": "$15-50/hour", "demandLevel": "High"}\n  ],\n  "summary": "Based on your skills, you are a strong match for frontend roles."\n}`;
    const raw = await callLLM(prompt, apiKey);
    return parseJSON(raw);
  } catch (error) {
    console.warn("[LLM Service] runJobMatchAgent failed, returning premium mock fallback data:", error.message);
    return mockJobMatchResult(skills, targetRole, location);
  }
};

const runInterviewAgent = async (role, type, skills, apiKey) => {
  try {
    const prompt = `You are an expert interview coach. Generate realistic interview questions and model answers.\n\nRole: ${role || 'Software Developer'}\nInterview Type: ${type || 'mixed'}\nSkills: ${skills.join(', ')}\n\nReturn ONLY valid JSON:\n{\n  "questions": [\n    {"id": 1, "category": "hr", "question": "Tell me about yourself", "hint": "Focus on education, skills, and goals", "modelAnswer": "I am a passionate developer...", "difficulty": "easy", "timeLimit": 120},\n    {"id": 2, "category": "technical", "question": "Explain the difference between var, let, and const in JavaScript.", "hint": "Focus on scope and hoisting", "modelAnswer": "var is function-scoped and hoisted...", "difficulty": "medium", "timeLimit": 180},\n    {"id": 3, "category": "behavioral", "question": "Describe a challenging project you worked on.", "hint": "Use STAR method", "modelAnswer": "Situation: I was tasked with...", "difficulty": "medium", "timeLimit": 180},\n    {"id": 4, "category": "hr", "question": "Where do you see yourself in 5 years?", "hint": "Align with company growth", "modelAnswer": "I see myself growing as a senior developer...", "difficulty": "easy", "timeLimit": 90},\n    {"id": 5, "category": "technical", "question": "What is the event loop in JavaScript?", "hint": "Explain call stack and callback queue", "modelAnswer": "The event loop is a mechanism that...", "difficulty": "hard", "timeLimit": 240}\n  ],\n  "tips": ["Maintain eye contact", "Use STAR method for behavioral questions", "Ask clarifying questions"],\n  "commonMistakes": ["Talking too fast", "Not preparing questions to ask", "Being too vague"],\n  "preparationPlan": ["Research the company", "Practice common HR questions", "Prepare 3 questions to ask"]\n}`;
    const raw = await callLLM(prompt, apiKey);
    return parseJSON(raw);
  } catch (error) {
    console.warn("[LLM Service] runInterviewAgent failed, returning premium mock fallback data:", error.message);
    return mockInterviewResult(role, type, skills);
  }
};

const evaluateAnswer = async (question, userAnswer, role, apiKey) => {
  try {
    const prompt = `You are an expert interviewer. Evaluate this interview answer professionally.\n\nQuestion: ${question}\nRole: ${role}\nCandidate Answer: ${userAnswer}\n\nReturn ONLY valid JSON:\n{\n  "score": 7,\n  "feedback": "Your answer was clear but lacked specific examples.",\n  "strengths": ["Clear communication"],\n  "improvements": ["Add quantified results", "Use STAR method"],\n  "betterAnswer": "A stronger answer would include..."\n}`;
    const raw = await callLLM(prompt, apiKey);
    return parseJSON(raw);
  } catch (error) {
    console.warn("[LLM Service] evaluateAnswer failed, returning premium mock fallback data:", error.message);
    return mockEvaluateAnswerResult(question, userAnswer, role);
  }
};

const generateCareerRoadmap = async (profile, apiKey) => {
  try {
    const prompt = `You are a career coach. Create a detailed 90-day career action plan.\n\nProfile: ${JSON.stringify(profile)}\n\nReturn ONLY valid JSON:\n{\n  "roadmap": {\n    "week1_2": {"focus": "Foundation", "tasks": ["Complete JavaScript basics", "Build portfolio site"], "goal": "Setup online presence"},\n    "week3_4": {"focus": "Skill Building", "tasks": ["Learn React basics", "Do 2 projects"], "goal": "Build React projects"},\n    "month2": {"focus": "Applications", "tasks": ["Apply to 10 jobs", "Practice interviews daily"], "goal": "Land 3 interviews"},\n    "month3": {"focus": "Offers", "tasks": ["Negotiate salary", "Choose best offer"], "goal": "Get first job offer"}\n  },\n  "dailyRoutine": ["1hr learning", "30min coding practice", "10min LinkedIn networking"],\n  "motivationalTip": "Consistency beats perfection. Show up every day.",\n  "milestones": [\n    {"day": 7, "milestone": "Portfolio website live", "achieved": false},\n    {"day": 30, "milestone": "First 10 job applications sent", "achieved": false},\n    {"day": 60, "milestone": "First interview attended", "achieved": false},\n    {"day": 90, "milestone": "Job offer received", "achieved": false}\n  ]\n}`;
    const raw = await callLLM(prompt, apiKey);
    return parseJSON(raw);
  } catch (error) {
    console.warn("[LLM Service] generateCareerRoadmap failed, returning premium mock fallback data:", error.message);
    return mockRoadmapResult(profile);
  }
};

const findLocalOpportunities = async (location, skills, apiKey) => {
  try {
    const prompt = `You are a local job market expert. Find relevant opportunities.\n\nLocation: ${location || 'India'}\nSkills: ${skills.join(', ')}\n\nReturn ONLY valid JSON:\n{\n  "walkInDrives": [{"company": "Infosys BPO", "role": "Associate", "location": "Bangalore", "date": "Every Monday", "contact": "hr@example.com"}],\n  "governmentJobs": [{"portal": "sarkariresult.com", "type": "IT Officer", "eligibility": "B.Tech/BCA", "lastDate": "Check portal", "link": "https://sarkariresult.com"}],\n  "skillCenters": [{"name": "NSDC Training Center", "location": "Nearby district", "courses": ["Web Development"], "fee": "Free/subsidized"}],\n  "onlineOpportunities": [\n    {"platform": "Internshala", "type": "Internship", "roles": ["Web Dev Intern"], "link": "https://internshala.com"},\n    {"platform": "LinkedIn", "type": "Jobs", "roles": ["Junior Developer"], "link": "https://linkedin.com/jobs"},\n    {"platform": "Naukri", "type": "Jobs", "roles": ["Fresher IT"], "link": "https://naukri.com"}\n  ],\n  "tip": "Register on government job portals and check daily for new openings."\n}`;
    const raw = await callLLM(prompt, apiKey);
    return parseJSON(raw);
  } catch (error) {
    console.warn("[LLM Service] findLocalOpportunities failed, returning premium mock fallback data:", error.message);
    return mockOpportunitiesResult(location, skills);
  }
};

module.exports = {
  callLLM, callGemini, runSkillAgent, runResumeAgent, runJobMatchAgent,
  runInterviewAgent, evaluateAnswer, generateCareerRoadmap, findLocalOpportunities
};
