const getRoleCategory = (targetRole) => {
  const role = (targetRole || '').toLowerCase();
  if (role.includes('data') || role.includes('machine learning') || role.includes('ai ') || role.includes('artificial')) return 'data_ai';
  if (role.includes('back') || role.includes('node') || role.includes('python')) return 'backend';
  if (role.includes('full') || role.includes('mern')) return 'fullstack';
  if (role.includes('ui') || role.includes('ux') || role.includes('design')) return 'design';
  return 'frontend';
};

const mockSkillResult = (skills, targetRole) => {
  const category = getRoleCategory(targetRole);

  const roleGaps = {
    data_ai: [
      { skill: 'Python (Advanced)', currentLevel: skills.includes('Python') ? 'intermediate' : 'none', requiredLevel: 'advanced', gap: 'Need to master NumPy, Pandas, and data pipelines', priority: 'critical', learningOrder: 1 },
      { skill: 'Statistics & Probability', currentLevel: 'none', requiredLevel: 'intermediate', gap: 'ML requires solid math foundations before algorithms', priority: 'critical', learningOrder: 2 },
      { skill: 'Machine Learning (Scikit-learn)', currentLevel: 'none', requiredLevel: 'advanced', gap: 'Core competency for the role', priority: 'critical', learningOrder: 3 },
      { skill: 'Deep Learning (PyTorch/TensorFlow)', currentLevel: 'none', requiredLevel: 'intermediate', gap: 'Required for modern ML engineering positions', priority: 'high', learningOrder: 4 },
      { skill: 'MLOps & Model Deployment', currentLevel: 'none', requiredLevel: 'intermediate', gap: 'Production deployment is a critical differentiator', priority: 'high', learningOrder: 5 }
    ],
    frontend: [
      { skill: 'HTML/CSS', currentLevel: skills.includes('HTML') ? 'intermediate' : 'none', requiredLevel: 'advanced', gap: 'Need semantic HTML, advanced layouts, animations', priority: 'critical', learningOrder: 1 },
      { skill: 'JavaScript (ES6+)', currentLevel: skills.includes('JavaScript') ? 'intermediate' : 'beginner', requiredLevel: 'advanced', gap: 'Need closures, async/await, event loop mastery', priority: 'critical', learningOrder: 2 },
      { skill: 'React & Hooks', currentLevel: 'none', requiredLevel: 'advanced', gap: 'Most demanded frontend framework globally', priority: 'critical', learningOrder: 3 },
      { skill: 'TypeScript', currentLevel: 'none', requiredLevel: 'intermediate', gap: 'Industry standard for large codebases', priority: 'high', learningOrder: 4 },
      { skill: 'Testing (Jest/Cypress)', currentLevel: 'none', requiredLevel: 'intermediate', gap: 'Required in all professional frontend roles', priority: 'medium', learningOrder: 5 }
    ],
    backend: [
      { skill: 'Node.js & Express', currentLevel: skills.includes('Node.js') ? 'intermediate' : 'none', requiredLevel: 'advanced', gap: 'Core backend development skill', priority: 'critical', learningOrder: 1 },
      { skill: 'Database Design (SQL + MongoDB)', currentLevel: 'none', requiredLevel: 'advanced', gap: 'All backend roles require database mastery', priority: 'critical', learningOrder: 2 },
      { skill: 'REST APIs & GraphQL', currentLevel: 'none', requiredLevel: 'advanced', gap: 'Primary backend output artifact', priority: 'critical', learningOrder: 3 },
      { skill: 'Authentication & Security', currentLevel: 'none', requiredLevel: 'intermediate', gap: 'JWT, OAuth and security are non-negotiable', priority: 'high', learningOrder: 4 },
      { skill: 'Docker & Cloud (AWS/GCP)', currentLevel: 'none', requiredLevel: 'intermediate', gap: 'Deployment skills are increasingly mandatory', priority: 'high', learningOrder: 5 }
    ],
    fullstack: [
      { skill: 'React (Frontend)', currentLevel: skills.includes('React') ? 'intermediate' : 'none', requiredLevel: 'advanced', gap: 'Full stack requires strong frontend base', priority: 'critical', learningOrder: 1 },
      { skill: 'Node.js API Development', currentLevel: 'none', requiredLevel: 'advanced', gap: 'Backend half of full stack', priority: 'critical', learningOrder: 2 },
      { skill: 'Database Management', currentLevel: 'none', requiredLevel: 'intermediate', gap: 'Essential for data persistence', priority: 'critical', learningOrder: 3 },
      { skill: 'System Design', currentLevel: 'none', requiredLevel: 'intermediate', gap: 'Required in senior full stack interviews', priority: 'high', learningOrder: 4 },
      { skill: 'CI/CD & Deployment', currentLevel: 'none', requiredLevel: 'intermediate', gap: 'Industry expects deployment experience', priority: 'medium', learningOrder: 5 }
    ],
    design: [
      { skill: 'Figma (Advanced)', currentLevel: 'beginner', requiredLevel: 'advanced', gap: 'Figma is the industry standard design tool', priority: 'critical', learningOrder: 1 },
      { skill: 'User Research Methods', currentLevel: 'none', requiredLevel: 'intermediate', gap: 'UX designers must validate with real users', priority: 'critical', learningOrder: 2 },
      { skill: 'Design Systems', currentLevel: 'none', requiredLevel: 'intermediate', gap: 'Companies expect knowledge of Atomic Design', priority: 'high', learningOrder: 3 },
      { skill: 'Accessibility (WCAG)', currentLevel: 'none', requiredLevel: 'intermediate', gap: 'Legal and ethical design requirement', priority: 'high', learningOrder: 4 },
      { skill: 'Basic Frontend (HTML/CSS)', currentLevel: 'none', requiredLevel: 'beginner', gap: 'Helps designers communicate with engineers', priority: 'medium', learningOrder: 5 }
    ]
  };

  const analyzedSkills = roleGaps[category] || roleGaps.frontend;

  // Merge in current skills that the user already has
  skills.forEach(s => {
    const existing = analyzedSkills.find(a => a.skill.toLowerCase().includes(s.toLowerCase()));
    if (!existing) {
      analyzedSkills.unshift({ skill: s, currentLevel: 'intermediate', requiredLevel: 'advanced', gap: 'Needs advanced mastery for job-readiness', priority: 'medium', learningOrder: 0 });
    }
  });

  return {
    analyzedSkills,
    recommendations: [
      `Start with Learning Order 1 (${analyzedSkills[0]?.skill}) and progress sequentially`,
      `Build a portfolio project after completing each critical skill`,
      `For ${targetRole || 'this role'}, prioritize depth over breadth — master each skill before moving on`
    ]
  };
};

const mockResumeResult = (resumeData, targetRole) => ({
  improvedSummary: `Results-oriented professional aiming for a ${targetRole || 'Technical'} role. Demonstrated ability to learn quickly and adapt to new technologies to deliver impactful solutions.`,
  atsScore: 78,
  keywordSuggestions: [targetRole || "Software Engineer", "Problem Solving", "Agile", "Team Collaboration"],
  suggestions: [
    "Include specific quantifiable metrics (e.g., 'Improved performance by 20%')",
    "Ensure keywords from the target role description are naturally integrated",
    "Use action verbs (e.g., Architected, Spearheaded) instead of passive phrasing"
  ],
  improvedBullets: {
    experience: "Spearheaded the development of key features, resulting in a 15% increase in user engagement.",
    projects: "Architected a scalable solution utilizing modern frameworks to handle concurrent user sessions."
  },
  missingSections: ["Certifications", "Open Source Contributions"],
  overallFeedback: "Your resume has a solid structure but needs more quantifiable achievements tailored to the specific role requirements.",
  strengthAreas: ["Clean structure", "Clear timeline"]
});

const mockJobMatchResult = (skills, targetRole, location) => ({
  jobMatches: [
    {
      title: `Junior ${targetRole || 'Developer'}`,
      company: "TechNova Solutions",
      location: `${location || 'Remote'}`,
      type: "full-time",
      matchScore: 88,
      salaryRange: "6-10 LPA",
      requiredSkills: skills.slice(0, 3),
      missingSkills: ["Cloud Deployment"],
      description: `Join our fast-paced team as a ${targetRole || 'Developer'} and help build innovative products.`,
      applyUrl: "https://linkedin.com/jobs",
      source: "LinkedIn"
    }
  ],
  internships: [
    {
      title: `${targetRole || 'Tech'} Intern`,
      company: "Innovate Labs",
      duration: "3 months",
      stipend: "20,000/month",
      matchScore: 92,
      location: location || "Remote",
      skills: skills.slice(0, 2)
    }
  ],
  freelanceOpportunities: [
    { platform: "Upwork", skill: targetRole || "Development", avgEarning: "$20-40/hour", demandLevel: "High" }
  ],
  summary: `There is strong demand for ${targetRole || 'your skills'} in ${location || 'your area'}. Focus on upskilling while applying to associate roles.`
});

const mockInterviewResult = (role, type, skills) => {
  const category = getRoleCategory(role);
  
  const techQuestion = category === 'data_ai' ? "Explain the difference between supervised and unsupervised learning, and when you would use each."
    : category === 'backend' ? "How would you design a scalable microservices architecture to handle high traffic spikes?"
    : "Explain the virtual DOM and how it improves application performance.";

  const techAnswer = category === 'data_ai' ? "Supervised learning uses labeled data to predict outcomes (e.g., classification), while unsupervised uses unlabeled data to find hidden patterns (e.g., clustering)."
    : category === 'backend' ? "I would use an API gateway, independent service scaling, Redis caching, and async message queues like RabbitMQ or Kafka."
    : "The Virtual DOM is a lightweight copy of the real DOM. Changes are batched and diffed against the current state, and only the minimal required updates are applied to the real DOM, avoiding expensive layout recalculations.";

  return {
    questions: [
      { id: 1, category: "hr", question: "Describe a time you had to learn a new technology quickly to meet a deadline.", hint: "Use the STAR method to structure your response.", modelAnswer: "I was assigned a project requiring a framework I hadn't used. I dedicated my weekend to reading the docs and building a small prototype. By Monday, I was able to contribute effectively.", difficulty: "medium", timeLimit: 120 },
      { id: 2, category: "technical", question: techQuestion, hint: "Focus on the core concepts and trade-offs.", modelAnswer: techAnswer, difficulty: "hard", timeLimit: 180 },
      { id: 3, category: "behavioral", question: "How do you handle disagreements with a team member regarding technical decisions?", hint: "Emphasize communication, data-driven decisions, and compromise.", modelAnswer: "I listen to their perspective, present objective data or prototypes to compare approaches, and ultimately defer to the team lead or consensus if we can't agree.", difficulty: "medium", timeLimit: 120 }
    ],
    tips: ["Structure behavioral answers using STAR", "Don't be afraid to think out loud on technical questions", "Ask clarifying questions if the prompt is ambiguous"],
    commonMistakes: ["Jumping into a solution without understanding the constraints", "Giving overly brief answers without examples"],
    preparationPlan: ["Practice mock interviews with a peer", "Review fundamental concepts for your specific tech stack"]
  };
};

const mockEvaluateAnswerResult = (question, userAnswer, role) => {
  const wordCount = userAnswer?.trim().split(/\s+/).filter(Boolean).length || 0;
  let score = wordCount < 10 ? 4 : wordCount < 30 ? 6 : 8;
  
  return {
    score,
    feedback: score < 6 ? "Your answer lacks depth. Expand your reasoning." : "Good response, but could use more specific examples.",
    strengths: wordCount > 15 ? ["Showed understanding of the topic"] : ["Made an attempt to answer"],
    improvements: ["Use the STAR method for structure", "Include concrete metrics or examples from your past"],
    betterAnswer: `For a ${role || 'Developer'} role, ensure you clearly state the context, the exact actions you took, and the quantifiable results you achieved.`
  };
};

const mockRoadmapResult = (profile) => {
  const category = getRoleCategory(profile.targetRole);
  const rawDuration = profile.duration || 30;
  const numDuration = parseInt(String(rawDuration).replace(/\D/g, '')) || 30;
  const role = profile.targetRole || 'Software Developer';

  // Role-specific day templates
  const dayTemplates = {
    data_ai: [
      { theme: 'Python Refresher', learning: 'Python data types, lists, dicts, comprehensions', practice: 'Solve 5 Python warmup problems on HackerRank', build: 'Write a Python script that reads and processes a CSV file', checkpoint: 'Can you explain Python list comprehensions with an example?' },
      { theme: 'NumPy Fundamentals', learning: 'NumPy arrays, slicing, broadcasting, mathematical ops', practice: 'Complete NumPy tutorial on Kaggle (1 hour)', build: 'Create array operations notebook', checkpoint: 'Explain what broadcasting is in NumPy' },
      { theme: 'Pandas Basics', learning: 'DataFrames, Series, loading CSVs, head/tail/describe', practice: 'Analyze Titanic dataset on Kaggle', build: 'Data exploration notebook with 5+ insights', checkpoint: 'What is the difference between .loc and .iloc?' },
      { theme: 'Data Visualization', learning: 'Matplotlib and Seaborn charts for exploratory analysis', practice: 'Create 5 different chart types on a real dataset', build: 'Visual EDA report on a public dataset', checkpoint: 'When would you use a heatmap vs. scatter plot?' },
      { theme: 'Statistics for ML', learning: 'Mean, median, variance, standard deviation, distributions', practice: 'Statistics exercises on Khan Academy', build: 'Python functions for manual stat calculations', checkpoint: 'Explain Central Limit Theorem in plain English' },
      { theme: 'Probability Concepts', learning: 'Bayes theorem, conditional probability, prior/posterior', practice: 'Probability problems from Think Stats', build: 'Bayesian inference example script', checkpoint: 'Explain Bayes theorem with a real example' },
      { theme: '🏆 Mini Project Day', learning: 'End-to-end data analysis workflow review', practice: 'Revisit Week 1 exercises', build: 'Complete mini-project: Exploratory Data Analysis on a Kaggle dataset of your choice', checkpoint: 'Can your analysis answer 3 business questions?' }
    ],
    frontend: [
      { theme: 'HTML Foundations', learning: 'Semantic HTML5, accessibility, forms, meta tags', practice: 'Build a semantic webpage for a fictional restaurant', build: 'Multi-page static website with proper semantics', checkpoint: 'Why is semantic HTML important for SEO?' },
      { theme: 'CSS Layouts', learning: 'Flexbox, Grid, responsive design, media queries', practice: 'Clone the CSS Flexbox Froggy and Grid Garden games', build: 'Responsive landing page (mobile-first)', checkpoint: 'When would you use Grid vs Flexbox?' },
      { theme: 'CSS Animations', learning: 'Transitions, keyframe animations, transforms', practice: 'Add 3 different animations to your landing page', build: 'Animated navigation menu', checkpoint: 'What is the difference between transition and animation?' },
      { theme: 'JavaScript Basics', learning: 'Variables, functions, arrays, objects, DOM manipulation', practice: 'Complete JavaScript30 Day 1-3 by Wes Bos (free)', build: 'Interactive counter with DOM events', checkpoint: 'Explain event bubbling vs. capturing' },
      { theme: 'JavaScript ES6+', learning: 'Arrow functions, destructuring, spread, promises, async/await', practice: 'Rewrite older JS code using ES6 features', build: 'Fetch API app that calls a public REST API', checkpoint: 'What is the event loop in JavaScript?' },
      { theme: 'JavaScript Functions Deep Dive', learning: 'Closures, higher-order functions, callbacks, currying', practice: 'Implement map, filter, reduce from scratch', build: 'Custom utility library file', checkpoint: 'Explain a closure with a real use case' },
      { theme: '🏆 Mini Project Day', learning: 'Review HTML, CSS, JS concepts', practice: 'Refactor any previous code', build: 'Mini weather app using Open-Meteo free API', checkpoint: 'Does your app work on mobile? Is the code clean?' }
    ],
    backend: [
      { theme: 'Node.js Setup', learning: 'Node.js runtime, npm, modules, package.json, file system', practice: 'Complete Node.js official getting started guide', build: 'CLI tool that reads a directory and lists files', checkpoint: 'What is the difference between require and import in Node?' },
      { theme: 'Express Fundamentals', learning: 'Express routes, middleware, request/response lifecycle', practice: 'Build 5 different API routes with Express', build: 'Basic Express server with GET/POST routes', checkpoint: 'What is middleware and why is it useful?' },
      { theme: 'REST API Design', learning: 'REST principles, status codes, versioning, best practices', practice: 'Design a REST API for a todo-list application', build: 'CRUD REST API for todo items (in memory)', checkpoint: 'What is the difference between PUT and PATCH?' },
      { theme: 'MongoDB & Mongoose', learning: 'MongoDB data modeling, CRUD operations, Mongoose schemas', practice: 'Complete MongoDB University M001 (free)', build: 'Connect Express API to MongoDB with Mongoose', checkpoint: 'When would you use an index in MongoDB?' },
      { theme: 'Authentication & JWT', learning: 'JWT structure, bcrypt hashing, protected routes', practice: 'Implement login/register with JWT in your Express API', build: 'Full auth system with protected user routes', checkpoint: 'What is the security risk of storing JWT in localStorage?' },
      { theme: 'Error Handling & Validation', learning: 'Express error middleware, Joi/Zod validation, env variables', practice: 'Add full validation to your API endpoints', build: 'Add error handling and input validation to your project', checkpoint: 'What is the difference between 400 and 422 status codes?' },
      { theme: '🏆 Mini Project Day', learning: 'Review REST and auth concepts', practice: 'Add tests using Jest', build: 'Complete REST API: User auth + CRUD for one resource + MongoDB', checkpoint: 'Can you make 10 different API calls using Postman?' }
    ]
  };

  const templates = dayTemplates[category] || dayTemplates.frontend;

  const days = Array.from({ length: numDuration }, (_, i) => {
    const dayNum = i + 1;
    const template = templates[i % templates.length];
    return {
      dayNumber: dayNum,
      label: `Day ${dayNum}`,
      theme: template.theme,
      learning: template.learning,
      practice: template.practice,
      build: template.build,
      checkpoint: template.checkpoint
    };
  });

  const projectsByRole = {
    data_ai: [
      { name: 'House Price Predictor', description: 'Linear regression model trained on real estate dataset', skills: ['Python', 'Pandas', 'Scikit-learn'], deliverable: 'Jupyter notebook + accuracy report', day: 14 },
      { name: 'Recommendation Engine', description: 'Collaborative filtering for movie recommendations', skills: ['NumPy', 'Pandas', 'Matrix Factorization'], deliverable: 'Working recommendation script', day: 21 },
      { name: 'Deployed ML API', description: 'FastAPI service serving a trained ML model', skills: ['FastAPI', 'Docker', 'Scikit-learn'], deliverable: 'Live API endpoint', day: numDuration }
    ],
    frontend: [
      { name: 'Responsive Portfolio', description: 'Personal portfolio site showcasing all projects', skills: ['HTML', 'CSS', 'JavaScript'], deliverable: 'Deployed on GitHub Pages or Vercel', day: 7 },
      { name: 'React Dashboard', description: 'Data dashboard with charts and API integration', skills: ['React', 'Recharts', 'REST API'], deliverable: 'Deployed React app', day: 21 },
      { name: 'Full Stack CRUD App', description: 'Complete app with React frontend and Node backend', skills: ['React', 'Node.js', 'MongoDB'], deliverable: 'Deployed application with auth', day: numDuration }
    ],
    backend: [
      { name: 'REST API', description: 'CRUD API with auth, validation, and MongoDB', skills: ['Node.js', 'Express', 'MongoDB'], deliverable: 'Postman collection with all endpoints tested', day: 7 },
      { name: 'Real-time Chat Server', description: 'WebSocket-based chat application', skills: ['Socket.io', 'Node.js', 'Redis'], deliverable: 'Working chat with 2+ clients', day: 21 },
      { name: 'Dockerized Microservice', description: 'Containerized API deployed to cloud', skills: ['Docker', 'AWS/GCP', 'CI/CD'], deliverable: 'Live API URL + deployment pipeline', day: numDuration }
    ]
  };

  return {
    duration: `${numDuration} Days`,
    role,
    goal: `Become a job-ready ${role} in ${numDuration} days through structured daily practice and portfolio projects`,
    days,
    projects: projectsByRole[category] || projectsByRole.frontend,
    finalOutcome: `After ${numDuration} days of focused learning, you will have the skills, projects, and interview readiness to apply and land a ${role} position`
  };
};

const mockOpportunitiesResult = (location, skills) => ({
  walkInDrives: [{ company: "Tech Giant India", role: "Associate", location: location || "Metro City", date: "Every Friday", contact: "careers@techgiant.com" }],
  governmentJobs: [{ portal: "NCS Portal", type: "IT Assistant", eligibility: "Graduate", lastDate: "Rolling", link: "https://www.ncs.gov.in" }],
  skillCenters: [{ name: "Skill India Center", location: location || "Local District", courses: ["Digital Skills Certification"], fee: "Subsidized" }],
  onlineOpportunities: [{ platform: "LinkedIn", type: "Full-Time", roles: ["Junior Role"], link: "https://linkedin.com/jobs" }],
  tip: "Leverage local networking events and consistently apply on major portals."
});

const generateCareerTwinReport = (resumeData, skillsData, targetRole) => ({
  similarProfile: `Senior ${targetRole || 'Engineer'}`,
  similarityScore: 68,
  hasSkills: skillsData.slice(0, 2).length ? skillsData.slice(0, 2) : ["Basic Fundamentals"],
  missingSkills: ["System Design", "Advanced Frameworks"],
  successfulPath: [
    { step: 1, description: "Mastered the core programming fundamentals" },
    { step: 2, description: "Built scalable portfolio projects demonstrating real-world problem solving" },
    { step: 3, description: "Leveraged LinkedIn networking to land referral interviews" }
  ],
  nextActions: ["Focus on building a complex capstone project", "Begin practicing technical interview questions daily"]
});

const generateWeeklyReport = (context = {}) => {
  const role = context.targetRole || 'Software Developer';
  const week = context.weekNumber || 1;
  const rate = context.taskRate ?? 75;
  const xp   = context.xpEarned ?? 600;
  const skills = context.topSkillsPracticed?.join(', ') || 'core fundamentals';
  const day  = context.currentDay || 1;
  const total = context.totalDays || 30;

  const tone = rate >= 80
    ? `Excellent week! You completed ${rate}% of your tasks`
    : rate >= 50
    ? `Solid effort this week with ${rate}% task completion`
    : `You completed ${rate}% of tasks this week — let's push harder next week`;

  return {
    summaryMessage: `${tone} on your ${role} roadmap (Day ${day}/${total}). Focus on consistency to accelerate your learning velocity.`,
    completedHighlights: skills ? [`Practiced: ${skills}`, `Earned ${xp} XP this week`] : ['Maintained learning routine', `${xp} XP earned`],
    improvementArea: `Increase daily practice sessions to improve skill depth for ${role}`,
    missedGoals: context.missedSkills?.length ? context.missedSkills.map(s => `Missed: ${s}`) : ['Keep up the momentum'],
    nextWeekPlan: [
      `Continue Day ${Math.min(day + 1, total)} tasks towards ${role}`,
      `Reinforce any difficult concepts from Week ${week}`,
      'Dedicate 20 minutes to interview prep'
    ]
  };
};

const generateDailyTasks = (targetRole, roadmap, progress) => {
  const category = getRoleCategory(targetRole);
  
  let task1Skill = "Core Basics";
  let task2Skill = "Project Work";
  let task1Title = "Review fundamental concepts";
  let task2Title = "Build small component";
  
  if (category === 'data_ai') {
    task1Skill = "Python/Pandas"; task1Title = "Complete data cleaning exercise";
    task2Skill = "Machine Learning"; task2Title = "Review model evaluation metrics";
  } else if (category === 'backend') {
    task1Skill = "Node.js/Express"; task1Title = "Implement API route";
    task2Skill = "Database"; task2Title = "Design database schema";
  } else if (category === 'frontend') {
    task1Skill = "React/Hooks"; task1Title = "Complete state management tutorial";
    task2Skill = "CSS/UI"; task2Title = "Style application layout";
  }

  return {
    tasks: [
      { title: task1Title, durationStr: "45 minutes", difficulty: "medium", xpReward: 100, skillTarget: task1Skill },
      { title: task2Title, durationStr: "60 minutes", difficulty: "hard", xpReward: 150, skillTarget: task2Skill },
      { title: "Review Interview Question", durationStr: "20 minutes", difficulty: "easy", xpReward: 50, skillTarget: "Interview Prep" }
    ]
  };
};

module.exports = {
  mockSkillResult,
  mockResumeResult,
  mockJobMatchResult,
  mockInterviewResult,
  mockEvaluateAnswerResult,
  mockRoadmapResult,
  mockOpportunitiesResult,
  generateCareerTwinReport,
  generateWeeklyReport,
  generateDailyTasks
};
