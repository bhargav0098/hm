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
              generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
            },
            { timeout: 60000 }
          );
          return response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } else if (provider === 'openai') {
          response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
              model: model || 'gpt-4o-mini',
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.7,
              max_tokens: 8192
            },
            {
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
              timeout: 60000
            }
          );
          return response.data.choices?.[0]?.message?.content || '';
        } else if (provider === 'claude') {
          response = await axios.post(
            'https://api.anthropic.com/v1/messages',
            {
              model: model || 'claude-3-5-haiku-20241022',
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 8192,
              temperature: 0.7
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
              },
              timeout: 60000
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
                'X-Title': 'CareerIQ AI'
              },
              timeout: 30000
            }
          );
          return response.data.choices?.[0]?.message?.content || '';
        } else if (provider === 'groq') {
          response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
              model: model || 'llama-3.1-70b-versatile',
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.7,
              max_tokens: 8192
            },
            {
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
              timeout: 60000
            }
          );
          return response.data.choices?.[0]?.message?.content || '';
        } else if (provider === 'deepseek') {
          response = await axios.post(
            'https://api.deepseek.com/v1/chat/completions',
            {
              model: model || 'deepseek-chat',
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

// ─── DYNAMIC MOCK FALLBACKS ───────────────────────────────────────────
const {
  mockSkillResult,
  mockResumeResult,
  mockJobMatchResult,
  mockInterviewResult,
  mockEvaluateAnswerResult,
  mockRoadmapResult,
  mockOpportunitiesResult,
  generateWeeklyReport: mockWeeklyReport,
  generateDailyTasks: mockDailyTasks
} = require('./mockFallbacks');

// ─── AGENT EXECUTIONS WITH GRACEFUL MOCK FALLBACKS ──────────────────────────

const runSkillAgent = async (skills, targetRole, experienceLevel, llmConfig) => {
  try {
    const prompt = `You are an elite Career Intelligence AI. Your task is to perform a deep, personalized skill gap analysis for a professional.

User Profile:
- Skills: ${skills.join(', ')}
- Target Role: ${targetRole || 'Not specified'}
- Experience: ${experienceLevel || 'fresher'}

RULES:
1. STRICTLY analyze for the exact Target Role provided. Do NOT default to generic web development.
2. If Target Role is AI/ML, focus on models, math, data engineering. If Frontend, focus on UI/UX, frameworks.
3. Be brutally honest about the industry expectations for this role in 2024-2025.

Return ONLY valid JSON matching this exact structure:
{
  "analyzedSkills": [
    {
      "skill": "Name of the skill (either an existing one or a missing one)",
      "currentLevel": "beginner|intermediate|advanced|none",
      "requiredLevel": "beginner|intermediate|advanced",
      "gap": "Description of the gap between current and required level",
      "priority": "critical|high|medium|low",
      "learningOrder": 1
    }
  ],
  "recommendations": [
    "Actionable, highly specific recommendation 1",
    "Actionable, highly specific recommendation 2"
  ]
}`;

    const raw = await callLLM(prompt, llmConfig);
    return parseJSON(raw);
  } catch (error) {
    console.warn("[LLM Service] runSkillAgent failed, returning premium mock fallback data:", error.message);
    return mockSkillResult(skills, targetRole);
  }
};

const runResumeAgent = async (resumeData, targetRole, apiKey) => {
  try {
    const prompt = `You are a world-class ATS resume expert, recruiter, and career coach with 15+ years of experience at top tech companies and staffing firms.

TASK: Perform comprehensive ATS optimization and improvement analysis for this resume.

Resume Data: ${JSON.stringify(resumeData)}
Target Role: ${targetRole || 'Software Developer'}

ATS Scoring Criteria (be strict and accurate):
- Keyword density & relevance to target role: 25%
- Proper section structure (Summary, Experience, Education, Skills, Projects): 20%
- Quantified achievements with metrics: 20%
- Strong action verbs (Built, Developed, Led, Optimized, Architected): 15%
- Contact completeness (name, email, phone, LinkedIn, GitHub): 10%
- Clean formatting (no tables, no images, ATS-parseable): 10%

IMPORTANT: Score must be ACCURATE. Empty resume = 5-15%. Basic resume = 40-60%. Good resume = 70-85%. Excellent = 85-98%.

Return ONLY valid JSON (no markdown):
{
  "improvedSummary": "Powerful 3-4 sentence professional summary packed with role-specific keywords and quantified achievements",
  "atsScore": 72,
  "atsBreakdown": {
    "keywords": 65,
    "structure": 80,
    "achievements": 55,
    "actionVerbs": 70,
    "contactInfo": 90,
    "formatting": 85
  },
  "keywordSuggestions": ["React.js", "REST APIs", "Agile", "CI/CD", "TypeScript", "Node.js"],
  "missingKeywords": ["Docker", "AWS", "TypeScript"],
  "suggestions": [
    "Add quantified achievements: 'Reduced load time by 40%' instead of 'improved performance'",
    "Include GitHub profile link for technical roles",
    "Add a Projects section with tech stack and impact"
  ],
  "improvedBullets": {
    "experience": "Architected and deployed 5 responsive React applications serving 10K+ monthly users, reducing page load time by 38%",
    "projects": "Built a full-stack e-commerce platform with Node.js + MongoDB handling 1000 concurrent users"
  },
  "missingSections": ["Certifications section would boost ATS score", "Projects section missing"],
  "overallFeedback": "2 sentence honest assessment with specific improvement priority",
  "strengthAreas": ["Education section is well structured", "Skills list is comprehensive"],
  "weakAreas": ["Experience lacks quantification", "Summary is too generic"],
  "salaryPrediction": "5-8 LPA for ${targetRole || 'this role'} based on skills and experience",
  "hiringProbability": 65,
  "topRecommendation": "Single most impactful change to make immediately"
}`;
    const raw = await callLLM(prompt, apiKey);
    return parseJSON(raw);
  } catch (error) {
    console.warn("[LLM Service] runResumeAgent failed, returning premium mock fallback data:", error.message);
    return mockResumeResult(resumeData, targetRole);
  }
};

const runJobMatchAgent = async (skills, targetRole, location, experienceLevel, apiKey) => {
  try {
    const prompt = `You are an expert job matching AI with deep knowledge of the current job market (2024-2025). Generate highly relevant, realistic job matches with DIRECT application links.

User Profile:
- Skills: ${skills.join(', ')}
- Target Role: ${targetRole}
- Location: ${location || 'India'}
- Experience: ${experienceLevel}

CRITICAL RULES:
1. ALL job URLs must be DIRECT job listing URLs (LinkedIn, Indeed, Glassdoor, Naukri, Wellfound/AngelList)
2. Use real company names that actually hire for this role
3. Salary ranges must be accurate for ${location || 'India'} market in 2024
4. Match confidence score must reflect actual skill-to-requirement alignment
5. Missing skills should be specific and actionable
6. Include WHY this job matches the candidate
7. Add remote/hybrid/onsite work type

Return ONLY valid JSON (no markdown):
{
  "jobMatches": [
    {
      "title": "Junior Frontend Developer",
      "company": "Razorpay",
      "location": "Bangalore / Remote",
      "workType": "Hybrid",
      "type": "full-time",
      "matchScore": 87,
      "matchConfidence": "High",
      "salaryRange": "6-10 LPA",
      "requiredSkills": ["React", "JavaScript", "CSS", "REST APIs"],
      "missingSkills": ["TypeScript"],
      "whyMatch": "Your React and JavaScript skills directly match 85% of requirements. TypeScript is learnable in 2 weeks.",
      "skillGapAnalysis": "Only TypeScript missing - 2 weeks to bridge",
      "description": "Build and maintain high-performance React applications for 5M+ users",
      "applyUrl": "https://www.linkedin.com/jobs/",
      "source": "LinkedIn",
      "postedDate": "3 days ago",
      "jobType": "Full-time",
      "isRemote": false,
      "isHybrid": true,
      "experienceRequired": "0-2 years",
      "salaryPrediction": "7.5 LPA at your experience level"
    }
  ],
  "internships": [
    {
      "title": "Software Development Intern",
      "company": "Freshworks",
      "duration": "6 months",
      "stipend": "25,000-35,000/month",
      "matchScore": 92,
      "location": "Chennai / Remote",
      "skills": ["JavaScript", "React"],
      "applyUrl": "https://www.internshala.com/internships/",
      "description": "Work on real product features with senior engineers",
      "isRemote": true,
      "perks": ["Pre-placement offer possibility", "Mentorship", "Certificate"]
    }
  ],
  "freelanceOpportunities": [
    {
      "platform": "Upwork",
      "skill": "React.js Development",
      "avgEarning": "$25-60/hour",
      "demandLevel": "High",
      "link": "https://www.upwork.com/freelance-jobs/react/",
      "projectTypes": ["Landing pages", "Dashboard UIs", "E-commerce sites"],
      "winRate": "Good for beginners with portfolio"
    }
  ],
  "marketInsights": {
    "demandTrend": "Growing 22% YoY",
    "topHiringCities": ["Bangalore", "Hyderabad", "Pune", "Remote"],
    "avgSalary": "5-12 LPA for ${experienceLevel} level",
    "competitionLevel": "Medium - 500-1000 applicants per posting"
  },
  "summary": "Your ${skills.slice(0,3).join(', ')} skills match ${targetRole || 'developer'} roles well. Apply to the top 3 matches immediately."
}`;
    const raw = await callLLM(prompt, apiKey);
    return parseJSON(raw);
  } catch (error) {
    console.warn("[LLM Service] runJobMatchAgent failed, returning premium mock fallback data:", error.message);
    return mockJobMatchResult(skills, targetRole, location);
  }
};

const runInterviewAgent = async (role, type, skills, apiKey) => {
  try {
    const prompt = `You are an elite interview coach with experience at FAANG, top Indian startups, and MNCs. Generate highly realistic, role-specific interview questions.

Target Role: ${role || 'Software Developer'}
Interview Type: ${type || 'mixed'}
Candidate Skills: ${skills.join(', ')}

CRITICAL RULES:
- Questions MUST be highly specific to the role "${role}"
- Technical questions must test actual knowledge of their skills: ${skills.join(', ')}
- Each question must have a COMPLETE, EXPERT-LEVEL model answer
- Behavioral questions should use STAR method
- Difficulty must be calibrated to a realistic interview for ${role}
- Include at least 2 technical, 2 behavioral, and 1 HR question for "mixed"
- Generate EXACTLY 5 questions minimum

Return ONLY valid JSON (no markdown):
{
  "questions": [
    {
      "id": 1,
      "category": "hr",
      "question": "Tell me about yourself and why you want to be a ${role || 'developer'}",
      "hint": "Structure: 1min background + 1min skills + 30sec why this role",
      "modelAnswer": "I am [your name], a [experience level] developer with expertise in [specific skills]. I started coding [background]. My key projects include [specific]. I want this role because [specific reason aligned to company mission].",
      "difficulty": "easy",
      "timeLimit": 120,
      "evaluationCriteria": ["Clarity of communication", "Alignment with role", "Specific examples"],
      "commonMistakes": ["Being too vague", "Not mentioning relevant skills"]
    },
    {
      "id": 2,
      "category": "technical",
      "question": "Explain the concept of [specific to their skills] and give a practical example",
      "hint": "Show both theoretical understanding and practical application",
      "modelAnswer": "Comprehensive technical answer with code example if applicable",
      "difficulty": "medium",
      "timeLimit": 180,
      "evaluationCriteria": ["Technical accuracy", "Practical knowledge", "Communication"],
      "commonMistakes": ["Memorizing without understanding", "Not giving examples"]
    }
  ],
  "tips": [
    "Research ${role || 'the company'} products and tech stack before interview",
    "Use STAR method: Situation, Task, Action, Result for behavioral questions",
    "Think out loud during technical questions - show your reasoning process"
  ],
  "commonMistakes": [
    "Not researching the company's tech stack",
    "Giving vague answers without specific examples",
    "Not asking clarifying questions"
  ],
  "preparationPlan": [
    "Day 1-2: Review core ${skills[0] || 'programming'} concepts",
    "Day 3-4: Practice 5 coding problems on LeetCode",
    "Day 5: Mock interview with a friend or mentor",
    "Day 6: Research company culture and prepare questions to ask"
  ],
  "roleSpecificTips": "For ${role || 'this role'}: Focus on [specific aspects]",
  "expectedDuration": "45-60 minutes",
  "difficultyLevel": "Medium",
  "passingScore": 70
}`;
    const raw = await callLLM(prompt, apiKey);
    return parseJSON(raw);
  } catch (error) {
    console.warn("[LLM Service] runInterviewAgent failed, returning premium mock fallback data:", error.message);
    return mockInterviewResult(role, type, skills);
  }
};

const evaluateAnswer = async (question, userAnswer, role, apiKey) => {
  try {
    const answerLength = userAnswer?.trim().length || 0;
    const wordCount = userAnswer?.trim().split(/\s+/).filter(Boolean).length || 0;
    const prompt = `You are a strict, experienced interviewer at a top tech company evaluating candidates for a ${role || 'Software Developer'} position.

Question: "${question}"
Candidate's Answer: "${userAnswer || '(No answer provided)'}"
Answer word count: ${wordCount}
Answer length: ${answerLength} characters

SCORING GUIDE (be HONEST and STRICT):
- Score 1-2: No answer, completely wrong, or offensive
- Score 3-4: Very short (<20 words), vague, off-topic, or shows no understanding
- Score 5-6: Basic understanding but missing key points, no examples, lacks depth
- Score 7-8: Good answer with relevant points and some examples, could be stronger
- Score 9-10: Excellent - comprehensive, specific examples, quantified impact, shows expertise

IMPORTANT: 
- If answer is under 15 words: max score is 4
- If answer shows technical accuracy: bonus points
- Evaluate based on CONTENT quality, not length alone
- Provide SPECIFIC, ACTIONABLE feedback about THIS exact answer
- Better answer must be tailored to THIS specific question and the ${role || 'role'}

Return ONLY valid JSON (no markdown):
{
  "score": 7,
  "feedback": "Specific honest feedback about exactly what they said, what was good and what was missing. Reference specific parts of their answer.",
  "technicalAccuracy": 7,
  "communicationClarity": 8,
  "confidence": 7,
  "problemSolving": 6,
  "strengths": ["One specific strength FROM their actual answer"],
  "improvements": ["One specific, actionable improvement with example of how to say it better"],
  "betterAnswer": "A complete model answer for this exact question in the context of the ${role || 'role'} - 3-5 sentences minimum",
  "keyPointsMissed": ["Key concept they should have mentioned"],
  "grade": "B",
  "hireable": true
}`;
    const raw = await callLLM(prompt, apiKey);
    return parseJSON(raw);
  } catch (error) {
    console.warn("[LLM Service] evaluateAnswer failed, returning premium mock fallback data:", error.message);
    return mockEvaluateAnswerResult(question, userAnswer, role);
  }
};

const generateCareerRoadmap = async (profile, llmConfig) => {
  try {
    const rawDuration = profile.duration || 30;
    const numDuration = parseInt(String(rawDuration).replace(/\D/g, '')) || 30;
    const role = profile.targetRole || 'Software Developer';
    const skills = profile.skills?.join(', ') || 'Various';
    const level = profile.experienceLevel || 'fresher';

    // For large day counts, cap days per AI call to avoid token overflow
    // We'll generate 30 days at a time and merge for longer durations.
    const isShort  = numDuration <= 90;   // Day-by-Day
    const isMedium = numDuration > 90 && numDuration <= 180;  // Week-by-Week
    // > 180 → Monthly

    let schemaInstructions = '';
    if (isShort) {
      // Cap to 30 days per request to stay within token limits
      const daysToGenerate = Math.min(numDuration, 30);
      schemaInstructions = `Generate a day-by-day plan with EXACTLY ${daysToGenerate} entries in the "days" array.
IMPORTANT: Generate EXACTLY ${daysToGenerate} day objects — no more, no less.

Each day object MUST be:
{"dayNumber":N,"theme":"Short theme","learning":"Specific topic","practice":"Specific drill","build":"What to create","checkpoint":"Verification task"}

RULES:
1. Topics MUST be SPECIFIC to "${role}". Not generic.
2. Every 7th day = Project Day (build a complete mini-project).
3. Progressively build from user's level (${level}) with skills: ${skills}.
4. By Day ${daysToGenerate} they should have strong foundations.

Return ONLY this JSON (no markdown, no extra text):
{
  "duration":"${numDuration} Days",
  "role":"${role}",
  "goal":"Precise one-sentence career goal",
  "days":[{"dayNumber":1,"theme":"...","learning":"...","practice":"...","build":"...","checkpoint":"..."},...],
  "projects":[{"name":"...","description":"...","skills":["..."],"deliverable":"...","day":7}],
  "finalOutcome":"What they can do after ${numDuration} days"
}`;
    } else if (isMedium) {
      const weeks = Math.ceil(numDuration / 7);
      schemaInstructions = `Generate a week-by-week plan with EXACTLY ${weeks} entries in the "weeks" array.
Each week: {"week":"Week N","theme":"...","skillsToLearn":["..."],"dailyTasks":["Mon","Tue","Wed","Thu","Fri"],"weekendProject":"...","checkpoint":"..."}

Return ONLY JSON:
{
  "duration":"${numDuration} Days","role":"${role}","goal":"...",
  "weeks":[...],
  "projects":[{"name":"...","description":"...","skills":[],"deliverable":"..."}],
  "finalOutcome":"..."
}`;
    } else {
      const months = Math.ceil(numDuration / 30);
      schemaInstructions = `Generate a month-by-month plan with EXACTLY ${months} entries in the "months" array.
Each month: {"month":"Month N","theme":"...","goals":["..."],"skills":["..."],"weeklyFocus":["Wk1:...","Wk2:...","Wk3:...","Wk4:..."],"project":"...","milestone":"..."}

Return ONLY JSON:
{
  "duration":"${numDuration} Days","role":"${role}","goal":"...",
  "months":[...],
  "projects":[{"name":"...","description":"...","skills":[],"deliverable":"..."}],
  "finalOutcome":"..."
}`;
    }

    const prompt = `You are an expert AI career mentor. Create a highly personalized learning roadmap.

USER: Target Role: ${role} | Skills: ${skills} | Level: ${level} | Duration: ${numDuration} Days

ROLE INTELLIGENCE (apply strictly):
- ML/AI: Python basics → NumPy/Pandas → Statistics → ML algorithms → Deep Learning → Deployment
- Frontend: HTML/CSS → JS → React → TypeScript → Testing → Performance
- Backend: Language → Databases → REST APIs → Auth → Cloud/Docker
- Data Analyst: SQL → Excel → Python → Statistics → Visualization (Tableau/PowerBI)
- Other roles: Reason about the exact skills needed and create a logical progression

CRITICAL: Every item must be SPECIFIC to "${role}". Start from skills: ${skills}. NEVER generic content.

${schemaInstructions}`;

    const raw = await callLLM(prompt, llmConfig);
    if (!raw || raw.trim().length < 50) {
      throw new Error('Empty or too-short response from LLM');
    }
    const result = parseJSON(raw);

    // Validate the response has the expected structure
    if (!result.days && !result.weeks && !result.months) {
      throw new Error('LLM response missing required days/weeks/months array');
    }

    return result;
  } catch (error) {
    console.warn('[LLM Service] generateCareerRoadmap failed, returning mock fallback:', error.message);
    return mockRoadmapResult(profile);
  }
};

const findLocalOpportunities = async (location, skills, apiKey) => {
  try {
    const prompt = `You are an expert local job market analyst with deep knowledge of employment opportunities in India and globally.

Location: ${location || 'India'}
Skills: ${skills.join(', ')}

Generate HIGHLY SPECIFIC, REALISTIC opportunities for this location. Use REAL platform URLs.

RULES:
- Walk-in drives: Use real company names that commonly hold walk-ins in this city
- Government job portals: Use real, active Indian government job portals
- Online opportunities: Use REAL direct URLs to job sections of actual platforms
- Skill centers: Reference actual government skill development programs (NSDC, PMKVY, Skill India)

Return ONLY valid JSON (no markdown):
{
  "walkInDrives": [
    {
      "company": "Infosys BPO",
      "role": "Process Associate / Technical Support",
      "location": "${location || 'Bangalore'}",
      "date": "Every Monday & Friday, 9 AM - 4 PM",
      "contact": "careers.infosys.com",
      "eligibility": "Any graduate with communication skills",
      "salary": "2.5-4 LPA",
      "applyUrl": "https://career.infosys.com/",
      "skills": ["Communication", "Basic Computer Skills"]
    }
  ],
  "governmentJobs": [
    {
      "portal": "National Career Service Portal",
      "type": "IT Professional / Data Entry Operator",
      "eligibility": "B.Tech/BCA/MCA or equivalent",
      "lastDate": "Check portal regularly",
      "link": "https://www.ncs.gov.in",
      "salary": "As per government pay scale",
      "category": "Central Government"
    },
    {
      "portal": "SSC CGL",
      "type": "Computer Science Graduate Posts",
      "eligibility": "Graduate + skills",
      "lastDate": "Check ssc.nic.in",
      "link": "https://ssc.nic.in",
      "salary": "Pay Level 4-7",
      "category": "Central Government"
    }
  ],
  "skillCenters": [
    {
      "name": "NSDC Training Partner Center",
      "location": "${location || 'Your District'} - Multiple locations",
      "courses": ["Digital Marketing", "Web Development", "Data Entry", "Soft Skills"],
      "fee": "Free under PMKVY scheme",
      "contact": "skillindiadigital.gov.in",
      "duration": "3-6 months",
      "certification": "Government recognized"
    }
  ],
  "onlineOpportunities": [
    {
      "platform": "LinkedIn Jobs",
      "type": "Full-Time / Remote",
      "roles": ["Fresher Developer", "Junior Engineer", "Trainee"],
      "link": "https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(skills[0] || 'developer')}&location=${encodeURIComponent(location || 'India')}",
      "tips": "Apply with LinkedIn Easy Apply, connect with recruiters"
    },
    {
      "platform": "Naukri.com",
      "type": "Jobs",
      "roles": ["Freshers IT", "Junior ${skills[0] || 'Developer'}", "Trainee Engineer"],
      "link": "https://www.naukri.com/fresher-jobs-in-${(location || 'india').toLowerCase().replace(' ', '-')}",
      "tips": "Keep profile updated, apply to 10-15 jobs daily"
    },
    {
      "platform": "Internshala",
      "type": "Internships + Entry Level",
      "roles": ["Web Development Intern", "Software Intern", "Data Science Intern"],
      "link": "https://internshala.com/internships/",
      "tips": "Great for freshers, many lead to full-time offers"
    },
    {
      "platform": "Indeed India",
      "type": "Jobs",
      "roles": ["Entry Level ${skills[0] || 'Developer'}"],
      "link": "https://in.indeed.com/jobs?q=${encodeURIComponent(skills[0] || 'developer')}&l=${encodeURIComponent(location || 'India')}",
      "tips": "Upload resume for quick apply"
    }
  ],
  "remoteOpportunities": [
    {
      "platform": "Wellfound (AngelList)",
      "type": "Startup Jobs - Remote",
      "roles": ["Junior Developer", "Founding Engineer"],
      "link": "https://wellfound.com/jobs",
      "tips": "Startups often hire freshers for full stack roles"
    }
  ],
  "tip": "In ${location || 'your area'}, the best strategy is: 1) Apply on Naukri & LinkedIn daily, 2) Attend walk-in drives with 5 printed resumes, 3) Register on NCS portal for government jobs, 4) Join local tech groups on LinkedIn for hidden opportunities."
}`;
    const raw = await callLLM(prompt, apiKey);
    return parseJSON(raw);
  } catch (error) {
    console.warn("[LLM Service] findLocalOpportunities failed, returning premium mock fallback data:", error.message);
    return mockOpportunitiesResult(location, skills);
  }
};


const generateWeeklyReport = async (context, apiKey) => {
  try {
    const {
      targetRole, weekNumber, currentDay, totalDays,
      taskRate, xpEarned, completedCount, totalCount,
      topSkillsPracticed, missedSkills, totalStats, streak
    } = context;

    const prompt = `You are an AI Career Coach. Generate a personalized Week ${weekNumber} progress report for a user working towards becoming a ${targetRole}.

ACTUAL USER DATA THIS WEEK:
- Roadmap Progress: Day ${currentDay} of ${totalDays} (${Math.round((currentDay/totalDays)*100)}% complete)
- Tasks Completed: ${completedCount} out of ${totalCount} (${taskRate}% completion rate)
- XP Earned: ${xpEarned}
- Skills Practiced: ${topSkillsPracticed?.join(', ') || 'Not tracked yet'}
- Skills Missed/Skipped: ${missedSkills?.join(', ') || 'None'}
- Current Streak: ${streak} days
- Total Tasks Completed Overall: ${totalStats?.tasksCompleted || 0}

RULES:
1. The summaryMessage MUST mention "${targetRole}" and be based on REAL numbers above.
2. completedHighlights must reflect the actual skills practiced this week.
3. nextWeekPlan must be specific to Week ${weekNumber + 1} of a ${targetRole} learning journey.
4. If taskRate < 50, tone should be encouraging but honest about catching up.
5. If taskRate >= 80, celebrate the achievement.

Return ONLY valid JSON:
{
  "summaryMessage": "2-sentence personalized coach message mentioning ${targetRole} and real stats",
  "completedHighlights": ["Specific completed skill or task from this week", "Another real highlight"],
  "improvementArea": "One specific area to improve with % or concrete metric",
  "missedGoals": ["Specific missed task or skill if any"],
  "nextWeekPlan": ["Specific Day ${currentDay + 1}-${Math.min(currentDay + 7, totalDays)} task for ${targetRole}", "Another concrete next step"]
}`;

    const raw = await callLLM(prompt, apiKey);
    return parseJSON(raw);
  } catch (error) {
    console.warn('[LLM Service] generateWeeklyReport failed:', error.message);
    return mockWeeklyReport(context);
  }
};

const generateDailyTasks = async (targetRole, roadmap, progress, apiKey) => {
  try {
    const prompt = `You are an AI Task Generator creating 3 personalized daily tasks for a user.
Target Role: ${targetRole || 'Developer'}
Roadmap: ${JSON.stringify(roadmap)}
Current Progress: ${JSON.stringify(progress)}

IMPORTANT RULES:
1. Ensure the tasks directly align with the specific "focus" and "skillsToLearn" of their current week in the roadmap.
2. If the progress indicates a failed interview or missed tasks, adapt and add revision tasks.
3. Keep the "xpReward" between 50 and 200 based on difficulty.

Return ONLY valid JSON with this exact structure:
{
  "tasks": [
    {
      "title": "Task title (e.g., Complete [Core Skill] lesson)",
      "durationStr": "30 minutes",
      "difficulty": "medium",
      "xpReward": 100,
      "skillTarget": "[Core Skill]"
    }
  ]
}`;
    const raw = await callLLM(prompt, apiKey);
    return parseJSON(raw);
  } catch (error) {
    console.warn("[LLM Service] generateDailyTasks failed:", error.message);
    return mockDailyTasks(targetRole, roadmap, progress);
  }
};

module.exports = {
  callLLM, callGemini, runSkillAgent, runResumeAgent, runJobMatchAgent,
  runInterviewAgent, evaluateAnswer, generateCareerRoadmap, findLocalOpportunities,
  generateWeeklyReport, generateDailyTasks
};
