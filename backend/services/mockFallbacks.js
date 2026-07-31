const { matchRole } = require('../data/roleCatalog');

// Every mock/fallback generator below is driven by the shared ROLE_CATALOG
// (via matchRole) instead of a handful of hardcoded buckets. This guarantees
// that ANY supported role — including ones that previously fell through to
// a mismatched "frontend" default (DevOps, QA, Product Manager, Cybersecurity,
// Cloud Engineer, etc.) — gets content that is actually labeled and scoped
// correctly, even when this fallback (used only when the live Gemini call
// fails or no API key is configured) is what ends up being returned.

const hasSkill = (skills, name) =>
  (skills || []).some(s => s && name.toLowerCase().includes(s.toLowerCase()));

const mockSkillResult = (skills, targetRole) => {
  const role = matchRole(targetRole);
  const roleSkills = role.skills;

  const analyzedSkills = roleSkills.map((skill, i) => ({
    skill,
    currentLevel: hasSkill(skills, skill) ? 'intermediate' : (i === 0 && skills?.length ? 'beginner' : 'none'),
    requiredLevel: i < 3 ? 'advanced' : 'intermediate',
    gap: i === 0
      ? `Core competency for ${role.label} — build this first`
      : `Needed to be job-ready for ${role.label} (${role.focus})`,
    priority: i < 3 ? 'critical' : i < 6 ? 'high' : 'medium',
    learningOrder: i + 1
  }));

  // Surface any user-listed skills not already covered, so their existing
  // experience is acknowledged rather than ignored.
  (skills || []).forEach(s => {
    const existing = analyzedSkills.find(a => a.skill.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(a.skill.toLowerCase()));
    if (!existing) {
      analyzedSkills.unshift({ skill: s, currentLevel: 'intermediate', requiredLevel: 'advanced', gap: 'Needs advanced mastery for job-readiness', priority: 'medium', learningOrder: 0 });
    }
  });

  return {
    analyzedSkills,
    recommendations: [
      `Start with Learning Order 1 (${analyzedSkills[0]?.skill}) and progress sequentially`,
      `Build a portfolio project after completing each critical skill`,
      `For ${role.label}, prioritize depth over breadth — master each skill before moving on`
    ]
  };
};

const mockResumeResult = (resumeData, targetRole) => ({
  improvedSummary: `Results-oriented professional aiming for a ${targetRole || 'Technical'} role. Demonstrated ability to learn quickly and adapt to new technologies to deliver impactful solutions.`,
  suggestions: [
    "Add quantifiable metrics to your achievements (e.g., 'improved performance by 30%')",
    "Ensure keywords from the target role description are naturally integrated"
  ],
  atsScore: 68,
  keywordGaps: ["Leadership", "Cross-functional collaboration"],
  overallFeedback: "Your resume has a solid structure but needs more quantifiable achievements tailored to the specific role requirements.",
});

const mockJobMatchResult = (skills, targetRole, location) => ({
  matches: [],
  summary: `There is strong demand for ${targetRole || 'your skills'} in ${location || 'your area'}. Focus on upskilling while applying to associate roles.`
});

const mockInterviewResult = (role, type, skills) => {
  const matched = matchRole(role);
  const primarySkill = skills?.[0] || matched.skills[0];
  const secondarySkill = matched.skills[1] || matched.skills[0];

  const techQuestion = `Walk me through how you would apply ${primarySkill} to a real ${matched.label} task involving ${matched.focus}.`;
  const techAnswer = `I'd start by clarifying requirements, then apply ${primarySkill} following best practices — for example, breaking the problem down, validating assumptions with data or tests, and iterating based on ${secondarySkill}. I'd also flag trade-offs (time, complexity, maintainability) before committing to an approach.`;

  return {
    questions: [
      { id: 1, category: "hr", question: `Tell me about yourself and why you're pursuing a ${matched.label} role.`, hint: "Structure: 1min background + 1min skills + 30sec why this role.", modelAnswer: `I am a ${matched.label} candidate with hands-on experience in ${matched.skills.slice(0, 2).join(' and ')}. My background includes [specific projects]. I'm drawn to this role because it lets me focus on ${matched.focus}.`, difficulty: "easy", timeLimit: 120 },
      { id: 2, category: "technical", question: techQuestion, hint: "Focus on the core concepts and trade-offs relevant to the role.", modelAnswer: techAnswer, difficulty: "hard", timeLimit: 180 },
      { id: 3, category: "behavioral", question: "How do you handle disagreements with a team member regarding a technical or process decision?", hint: "Emphasize communication, data-driven decisions, and compromise.", modelAnswer: "I listen to their perspective, present objective data or a quick prototype to compare approaches, and defer to the team lead or consensus if we can't agree.", difficulty: "medium", timeLimit: 120 },
      { id: 4, category: "technical", question: `What tools or frameworks from your ${matched.label} toolkit (e.g. ${matched.skills.slice(2, 4).join(', ')}) have you used, and what would you improve about your usage of them?`, hint: "Be specific and honest about limitations.", modelAnswer: `I've used ${matched.skills.slice(2, 4).join(' and ')} on recent projects. One area I'd improve is deepening my understanding of edge cases and production-readiness concerns.`, difficulty: "medium", timeLimit: 150 },
      { id: 5, category: "hr", question: "Where do you see yourself in your career 2-3 years from now?", hint: "Show ambition that's realistic and aligned with growing in this role.", modelAnswer: `I want to grow from a solid ${matched.label} contributor into someone who can mentor others and own larger pieces of ${matched.focus}.`, difficulty: "easy", timeLimit: 90 }
    ],
    tips: ["Structure behavioral answers using STAR", "Don't be afraid to think out loud on technical questions", "Ask clarifying questions if the prompt is ambiguous"],
    commonMistakes: ["Jumping into a solution without understanding the constraints", "Giving overly brief answers without examples"],
    preparationPlan: [`Review core ${primarySkill} concepts`, `Practice explaining ${matched.focus} out loud`, "Do a mock interview with a peer"]
  };
};

const mockEvaluateAnswerResult = (question, userAnswer, role) => {
  const wordCount = userAnswer?.trim().split(/\s+/).filter(Boolean).length || 0;
  let score = wordCount < 10 ? 4 : wordCount < 30 ? 6 : 8;

  return {
    score,
    feedback: score < 6 ? "Your answer lacks depth. Expand your reasoning and give a concrete example." : "Good response, but could use more specific examples or metrics.",
    technicalAccuracy: score,
    communicationClarity: Math.max(score - 1, 3),
    confidence: score,
    problemSolving: Math.max(score - 1, 3),
    strengths: wordCount > 15 ? ["Showed understanding of the topic"] : ["Made an attempt to answer"],
    improvements: ["Use the STAR method for structure", "Include concrete metrics or examples from your past"],
    betterAnswer: `For a ${role || 'Developer'} role, ensure you clearly state the context, the exact actions you took, and the quantifiable results you achieved.`,
    keyPointsMissed: [],
    grade: score >= 8 ? 'A' : score >= 6 ? 'B' : score >= 4 ? 'C' : 'D',
    hireable: score >= 6
  };
};

const mockRoadmapResult = (profile) => {
  const matched = matchRole(profile.targetRole);
  const rawDuration = profile.duration || 30;
  const numDuration = parseInt(String(rawDuration).replace(/\D/g, '')) || 30;
  const role = matched.label;
  const roleSkills = matched.skills;

  const days = Array.from({ length: numDuration }, (_, i) => {
    const dayNum = i + 1;
    const isProjectDay = dayNum % 7 === 0;
    const skill = roleSkills[i % roleSkills.length];

    if (isProjectDay) {
      return {
        dayNumber: dayNum,
        theme: '🏆 Project Day',
        learning: `Consolidate everything learned so far about ${role} (${matched.focus})`,
        practice: `Revisit the toughest concept from the last 6 days and re-do it without notes`,
        build: `Build a small project that combines ${roleSkills.slice(0, 3).join(', ')}`,
        checkpoint: `Can you explain and demo what you built to someone unfamiliar with ${role}?`
      };
    }

    return {
      dayNumber: dayNum,
      theme: `${skill} Deep Dive`,
      learning: `Core concepts, common patterns and best practices for ${skill} in the context of ${role}`,
      practice: `Complete 2-3 focused exercises applying ${skill}`,
      build: `Create a small artifact (script, component, doc, or analysis) that demonstrates ${skill}`,
      checkpoint: `Can you explain ${skill} clearly and show a working example?`
    };
  });

  const projects = [
    { name: `${role} Starter Project`, description: `A small end-to-end project applying ${roleSkills.slice(0, 2).join(' and ')}`, skills: roleSkills.slice(0, 2), deliverable: 'Working project with documentation', day: 7 },
    { name: `${role} Intermediate Project`, description: `A more complex project combining ${roleSkills.slice(2, 4).join(' and ') || roleSkills[0]}`, skills: roleSkills.slice(2, 4).length ? roleSkills.slice(2, 4) : roleSkills.slice(0, 2), deliverable: 'Deployed or demoable output', day: Math.min(21, numDuration) },
    { name: `${role} Capstone Project`, description: `A portfolio-ready capstone showcasing ${role} readiness`, skills: roleSkills.slice(0, 4), deliverable: 'Portfolio-ready project + writeup', day: numDuration }
  ];

  return {
    duration: `${numDuration} Days`,
    role,
    goal: `Become a job-ready ${role} in ${numDuration} days through structured daily practice on ${matched.focus} and portfolio projects`,
    days,
    projects,
    finalOutcome: `After ${numDuration} days of focused learning, you will have the skills (${roleSkills.slice(0, 4).join(', ')}), projects, and interview readiness to apply and land a ${role} position`
  };
};

const mockOpportunitiesResult = (location, skills) => ({
  walkInDrives: [{ company: "Tech Giant India", role: "Associate", location: location || "Metro City", date: "Every Friday", contact: "careers@techgiant.com" }],
  governmentJobs: [{ portal: "NCS Portal", type: "IT Assistant", eligibility: "Graduate", lastDate: "Rolling", link: "https://www.ncs.gov.in" }],
  skillCenters: [{ name: "Skill India Center", location: location || "Local District", courses: ["Digital Skills Certification"], fee: "Subsidized" }],
  onlineOpportunities: [{ platform: "LinkedIn", type: "Full-Time", roles: ["Junior Role"], link: "https://linkedin.com/jobs" }],
  tip: "Leverage local networking events and consistently apply on major portals."
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
  const matched = matchRole(targetRole);
  const [skillA, skillB] = matched.skills;

  return {
    tasks: [
      { title: `Practice: ${skillA}`, durationStr: "45 minutes", difficulty: "medium", xpReward: 100, skillTarget: skillA },
      { title: `Apply: ${skillB || skillA}`, durationStr: "60 minutes", difficulty: "hard", xpReward: 150, skillTarget: skillB || skillA },
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
  generateWeeklyReport,
  generateDailyTasks
};
