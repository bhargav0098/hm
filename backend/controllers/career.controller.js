const { SkillProfile, Resume, JobApplication, InterviewSession, Progress, CareerPlan, DailyTask, WeeklyReport } = require('../models/Career');
const ApiSettings = require('../models/ApiSettings');
const {
  runSkillAgent, runResumeAgent, runJobMatchAgent,
  runInterviewAgent, evaluateAnswer, generateCareerRoadmap, findLocalOpportunities,
  generateWeeklyReport, generateDailyTasks
} = require('../services/gemini.service');

// Helper: get user's complete LLM configuration (provider, model, key)
const getUserLLMConfig = async (userId) => {
  try {
    const settings = await ApiSettings.findOne({ user: userId });
    if (settings) {
      const keys = settings.getDecryptedKeys();
      const activeProvider = keys.activeProvider || 'default';
      const activeModel = keys.activeModel || 'gemini-2.0-flash';
      
      let key = null;
      let provider = activeProvider;
      
      if (activeProvider === 'default' || activeProvider === 'gemini') {
        key = keys.geminiKey || process.env.GEMINI_API_KEY;
        provider = 'gemini';
      } else if (activeProvider === 'openai') {
        key = keys.openaiKey;
      } else if (activeProvider === 'openrouter') {
        key = keys.openrouterKey;
      } else if (activeProvider === 'claude') {
        key = keys.claudeKey;
      } else if (activeProvider === 'groq') {
        key = keys.groqKey;
      } else if (activeProvider === 'deepseek') {
        key = keys.deepseekKey;
      }
      
      return { provider, model: activeModel, apiKey: key };
    }
  } catch {}
  
  return {
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    apiKey: process.env.GEMINI_API_KEY
  };
};

// Helper: update progress stats
const updateProgress = async (userId, field) => {
  try {
    await Progress.findOneAndUpdate(
      { user: userId },
      {
        $inc: { [`totalStats.${field}`]: 1 },
        $set: { lastActiveDate: new Date() }
      },
      { upsert: true }
    );
  } catch {}
};

// ─── SKILL AGENT ──────────────────────────────────────────────────────────
exports.analyzeSkills = async (req, res, next) => {
  try {
    const { skills, targetRole, experienceLevel, education } = req.body;
    if (!skills || !skills.length) return res.status(400).json({ success: false, message: 'Please provide at least one skill.' });

    const llmConfig = await getUserLLMConfig(req.user._id);
    const result = await runSkillAgent(skills, targetRole, experienceLevel, llmConfig);

    // Save/update skill profile
    const profile = await SkillProfile.findOneAndUpdate(
      { user: req.user._id },
      {
        currentSkills: skills.map(s => ({ name: s, level: 'beginner' })),
        targetRole, experienceLevel, education,
        careerPaths: result.careerPaths,
        learningRoadmap: result.learningRoadmap?.map(r => ({
          skill: r.skill, priority: r.priority || 'medium',
          resources: r.resources, estimatedWeeks: r.weeks, completed: false
        })),
        skillScore: result.overallReadiness || 0,
        lastAnalyzed: new Date()
      },
      { upsert: true, new: true }
    );

    await updateProgress(req.user._id, 'skillsLearned');
    res.json({ success: true, result, profile });
  } catch (error) {
    next(error);
  }
};

exports.getSkillProfile = async (req, res, next) => {
  try {
    const profile = await SkillProfile.findOne({ user: req.user._id });
    res.json({ success: true, profile: profile || null });
  } catch (error) { next(error); }
};

exports.markRoadmapComplete = async (req, res, next) => {
  try {
    const { skillIndex } = req.body;
    await SkillProfile.findOneAndUpdate(
      { user: req.user._id },
      { $set: { [`learningRoadmap.${skillIndex}.completed`]: true } }
    );
    res.json({ success: true, message: 'Marked as complete!' });
  } catch (error) { next(error); }
};

// ─── RESUME AGENT ─────────────────────────────────────────────────────────
exports.analyzeResume = async (req, res, next) => {
  try {
    const { resumeData, targetRole } = req.body;
    if (!resumeData) return res.status(400).json({ success: false, message: 'Resume data required.' });

    const llmConfig = await getUserLLMConfig(req.user._id);
    const result = await runResumeAgent(resumeData, targetRole, llmConfig);

    // Save resume
    const resume = await Resume.findOneAndUpdate(
      { user: req.user._id, isActive: true },
      {
        ...resumeData,
        atsScore: result.atsScore || 0,
        aiSuggestions: result.suggestions || [],
        keywords: result.keywordSuggestions || [],
      },
      { upsert: true, new: true }
    );

    await updateProgress(req.user._id, 'resumeScore');
    res.json({ success: true, result, resumeId: resume._id });
  } catch (error) { next(error); }
};

exports.saveResume = async (req, res, next) => {
  try {
    const { resumeData } = req.body;
    const resume = await Resume.findOneAndUpdate(
      { user: req.user._id, isActive: true },
      { ...resumeData, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ success: true, message: 'Resume saved!', resume });
  } catch (error) { next(error); }
};

exports.getResume = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({ user: req.user._id, isActive: true }).sort({ updatedAt: -1 });
    res.json({ success: true, resume: resume || null });
  } catch (error) { next(error); }
};

// ─── JOB MATCHING AGENT ───────────────────────────────────────────────────
exports.matchJobs = async (req, res, next) => {
  try {
    const { skills, targetRole, location, experienceLevel } = req.body;
    if (!skills?.length) return res.status(400).json({ success: false, message: 'Skills required for job matching.' });

    const llmConfig = await getUserLLMConfig(req.user._id);
    const result = await runJobMatchAgent(skills, targetRole, location, experienceLevel, llmConfig);
    res.json({ success: true, result });
  } catch (error) { next(error); }
};

exports.saveJobApplication = async (req, res, next) => {
  try {
    const job = await JobApplication.create({ user: req.user._id, ...req.body });
    await updateProgress(req.user._id, 'jobsApplied');
    res.json({ success: true, message: 'Job saved!', job });
  } catch (error) { next(error); }
};

exports.getJobApplications = async (req, res, next) => {
  try {
    const jobs = await JobApplication.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, jobs });
  } catch (error) { next(error); }
};

exports.updateJobStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const job = await JobApplication.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { status, ...(status === 'applied' ? { appliedAt: new Date() } : {}) },
      { new: true }
    );
    res.json({ success: true, job });
  } catch (error) { next(error); }
};

// ─── INTERVIEW AGENT ──────────────────────────────────────────────────────
exports.generateInterview = async (req, res, next) => {
  try {
    const { role, type, skills } = req.body;
    const llmConfig = await getUserLLMConfig(req.user._id);
    const result = await runInterviewAgent(role, type, skills || [], llmConfig);

    const session = await InterviewSession.create({
      user: req.user._id, type: type || 'mixed', targetRole: role,
      questions: result.questions?.map(q => ({ question: q.question, userAnswer: '', aiFeedback: '', score: 0 })) || [],
      status: 'in-progress'
    });

    res.json({ success: true, session: { ...session.toObject(), questionDetails: result.questions }, tips: result.tips, preparationPlan: result.preparationPlan });
  } catch (error) { next(error); }
};

exports.submitAnswer = async (req, res, next) => {
  try {
    const { sessionId, questionIndex, answer, question, role } = req.body;
    const llmConfig = await getUserLLMConfig(req.user._id);

    const evaluation = await evaluateAnswer(question, answer, role, llmConfig);

    await InterviewSession.findByIdAndUpdate(sessionId, {
      $set: {
        [`questions.${questionIndex}.userAnswer`]: answer,
        [`questions.${questionIndex}.aiFeedback`]: evaluation.feedback,
        [`questions.${questionIndex}.score`]: evaluation.score
      }
    });

    res.json({ success: true, evaluation });
  } catch (error) { next(error); }
};

exports.completeInterview = async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    const session = await InterviewSession.findOne({ _id: sessionId, user: req.user._id });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });

    const answeredQuestions = session.questions.filter(q => q.score > 0);
    const scores = answeredQuestions.map(q => q.score);
    const overallScore = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) : 0;

    // Build real strengths/improvements from question evaluations
    const allFeedbacks = session.questions.filter(q => q.aiFeedback).map(q => q.aiFeedback);
    const highScoreQuestions = session.questions.filter(q => q.score >= 7);
    const lowScoreQuestions = session.questions.filter(q => q.score > 0 && q.score < 6);

    const strengths = highScoreQuestions.length > 0
      ? highScoreQuestions.map(q => `Strong answer on: "${q.question?.slice(0, 50)}..."`)
      : ['Completed the full interview session', 'Attempted all questions presented'];

    const improvements = lowScoreQuestions.length > 0
      ? lowScoreQuestions.map(q => `Needs work on: "${q.question?.slice(0, 50)}..."`)
      : ['Practice adding more specific examples to answers', 'Use the STAR method for behavioral questions'];

    const performanceLevel = overallScore >= 80 ? 'Excellent' : overallScore >= 65 ? 'Good' : overallScore >= 50 ? 'Average' : 'Needs Improvement';
    const readinessScore = Math.min(100, overallScore + (answeredQuestions.length * 2));

    const updated = await InterviewSession.findByIdAndUpdate(sessionId, {
      overallScore,
      status: 'completed',
      strengths: strengths.slice(0, 3),
      improvements: improvements.slice(0, 3)
    }, { new: true });

    await updateProgress(req.user._id, 'interviewsPracticed');
    res.json({
      success: true,
      session: updated,
      overallScore,
      performanceLevel,
      readinessScore,
      answeredCount: answeredQuestions.length,
      totalQuestions: session.questions.length,
      report: {
        summary: `You scored ${overallScore}% across ${answeredQuestions.length} questions. Performance level: ${performanceLevel}.`,
        strengths: strengths.slice(0, 3),
        improvements: improvements.slice(0, 3),
        nextSteps: [
          'Review model answers for questions you scored below 6',
          'Practice STAR method for behavioral questions',
          'Schedule another mock interview in 2-3 days'
        ]
      }
    });
  } catch (error) { next(error); }
};

exports.getInterviewHistory = async (req, res, next) => {
  try {
    const sessions = await InterviewSession.find({ user: req.user._id })
      .select('-questions').sort({ createdAt: -1 }).limit(10);
    res.json({ success: true, sessions });
  } catch (error) { next(error); }
};

// ─── ROADMAP & LOCAL OPPORTUNITIES ───────────────────────────────────────
exports.generateRoadmap = async (req, res, next) => {
  try {
    if (!req.body.targetRole && !req.body.skills?.length) {
      // Try to pull from profile
      const profile = await SkillProfile.findOne({ user: req.user._id });
      if (!profile?.targetRole) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a target role and your current skills to generate a roadmap.'
        });
      }
    }

    const profile = await SkillProfile.findOne({ user: req.user._id });
    const duration = parseInt(req.body.duration) || 30;

    const userProfile = {
      skills: req.body.skills?.length
        ? req.body.skills
        : (profile?.currentSkills?.map(s => s.name) || ['basic programming']),
      targetRole: req.body.targetRole || profile?.targetRole || 'Software Developer',
      experienceLevel: profile?.experienceLevel || req.body.experienceLevel || 'fresher',
      education: profile?.education || {},
      duration
    };

    const llmConfig = await getUserLLMConfig(req.user._id);
    const result = await generateCareerRoadmap(userProfile, llmConfig);

    if (!result || (!result.days && !result.weeks && !result.months)) {
      return res.status(500).json({
        success: false,
        message: 'AI generation failed. Please check your API key in Settings and try again.'
      });
    }

    res.json({ success: true, result });
  } catch (error) {
    console.error('[generateRoadmap]', error.message);
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      return res.status(400).json({ success: false, message: 'Invalid API key. Please update it in Settings.' });
    }
    if (status === 429) {
      return res.status(429).json({ success: false, message: 'Rate limit reached. Please wait 60 seconds and try again.' });
    }
    next(error);
  }
};

exports.saveRoadmap = async (req, res, next) => {
  try {
    const { roadmapData } = req.body;
    if (!roadmapData) return res.status(400).json({ success: false, message: 'Roadmap data required' });

    const role = roadmapData.role || roadmapData.targetRole || 'Software Developer';
    const rawDuration = roadmapData.duration || '30 Days';
    const numDuration = parseInt(String(rawDuration).replace(/\D/g, '')) || 30;
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    // ─── 1. Save / update CareerPlan ───────────────────────────────────
    await CareerPlan.findOneAndUpdate(
      { user: req.user._id },
      {
        user: req.user._id,
        targetRole: role,
        duration: numDuration,
        startDate,
        currentDay: 1,
        roadmapData,
        projects: roadmapData.projects || [],
        finalOutcome: roadmapData.finalOutcome || '',
        isActive: true
      },
      { upsert: true, new: true }
    );

    // ─── 2. Update SkillProfile learningRoadmap ───────────────────────
    const tasks = [];
    if (roadmapData.days?.length > 0) {
      roadmapData.days.forEach(day => {
        tasks.push({
          skill: day.theme || `Day ${day.dayNumber}`,
          priority: 'high',
          resources: [day.practice, day.build].filter(Boolean),
          estimatedWeeks: Math.ceil(numDuration / 7),
          completed: false
        });
      });
    } else if (roadmapData.weeks?.length > 0) {
      roadmapData.weeks.forEach(week => {
        (week.skillsToLearn || []).forEach(skill => {
          tasks.push({ skill, priority: 'high', resources: week.dailyTasks || [], estimatedWeeks: 1, completed: false });
        });
      });
    } else if (roadmapData.months?.length > 0) {
      roadmapData.months.forEach(month => {
        (month.skills || []).forEach(skill => {
          tasks.push({ skill, priority: 'high', resources: month.weeklyFocus || [], estimatedWeeks: 4, completed: false });
        });
      });
    }

    if (tasks.length > 0) {
      await SkillProfile.findOneAndUpdate(
        { user: req.user._id },
        { $set: { learningRoadmap: tasks, targetRole: role } },
        { upsert: true }
      );
    }

    // ─── 3. Generate Day 1 DailyTask records in the DB ───────────────
    // Remove any existing tasks for today (clean slate)
    await DailyTask.deleteMany({ user: req.user._id, date: { $gte: startDate } });

    if (roadmapData.days?.length > 0) {
      const day1 = roadmapData.days[0];
      await DailyTask.insertMany([
        {
          user: req.user._id, date: startDate, dayNumber: 1,
          title: `📚 Learn: ${day1.theme}`,
          description: day1.learning,
          type: 'learning', durationStr: '60 min', difficulty: 'medium', xpReward: 100,
          skillTarget: day1.theme, status: 'pending'
        },
        {
          user: req.user._id, date: startDate, dayNumber: 1,
          title: `💪 Practice: ${day1.theme}`,
          description: day1.practice,
          type: 'practice', durationStr: '45 min', difficulty: 'medium', xpReward: 80,
          skillTarget: day1.theme, status: 'pending'
        },
        {
          user: req.user._id, date: startDate, dayNumber: 1,
          title: `🔨 Build: ${day1.theme}`,
          description: day1.build,
          type: 'build', durationStr: '90 min', difficulty: 'hard', xpReward: 150,
          skillTarget: day1.theme, status: 'pending'
        },
        {
          user: req.user._id, date: startDate, dayNumber: 1,
          title: `✅ Checkpoint: ${day1.theme}`,
          description: day1.checkpoint,
          type: 'checkpoint', durationStr: '15 min', difficulty: 'easy', xpReward: 50,
          skillTarget: day1.theme, status: 'pending'
        }
      ]);
    } else if (roadmapData.weeks?.length > 0) {
      const week1 = roadmapData.weeks[0];
      const weekTasks = (week1.dailyTasks || []).map((t, i) => ({
        user: req.user._id, date: startDate, dayNumber: 1,
        title: t, description: '', type: 'general',
        durationStr: '45 min', difficulty: 'medium', xpReward: 80,
        skillTarget: (week1.skillsToLearn || [])[0] || week1.theme,
        status: 'pending'
      }));
      if (weekTasks.length > 0) await DailyTask.insertMany(weekTasks);
    }

    res.json({ success: true, message: `Roadmap saved! Day 1 of ${numDuration} tasks are ready on your dashboard. 🚀` });
  } catch (error) {
    console.error('[saveRoadmap] Error:', error);
    next(error);
  }
};

exports.findOpportunities = async (req, res, next) => {
  try {
    const { location } = req.body;
    const profile = await SkillProfile.findOne({ user: req.user._id });
    const skills = profile?.currentSkills?.map(s => s.name) || ['JavaScript', 'HTML', 'CSS'];
    const llmConfig = await getUserLLMConfig(req.user._id);
    const result = await findLocalOpportunities(location || req.user.location || 'India', skills, llmConfig);
    res.json({ success: true, result });
  } catch (error) { next(error); }
};

// ─── PROGRESS ─────────────────────────────────────────────────────────────
exports.getProgress = async (req, res, next) => {
  try {
    let progress = await Progress.findOne({ user: req.user._id });
    if (!progress) {
      progress = await Progress.create({ user: req.user._id });
    }

    // Streak logic
    const today = new Date().toDateString();
    const lastActive = progress.lastActiveDate ? new Date(progress.lastActiveDate).toDateString() : null;
    if (lastActive && lastActive !== today) {
      const diff = (new Date() - new Date(progress.lastActiveDate)) / (1000 * 60 * 60 * 24);
      if (diff > 1) {
        progress.streak = 0;
        await progress.save();
      }
    }

    // Compute career readiness from other models
    const skillProfile = await SkillProfile.findOne({ user: req.user._id });
    const resume = await Resume.findOne({ user: req.user._id, isActive: true });
    const interviews = await InterviewSession.countDocuments({ user: req.user._id, status: 'completed' });
    const jobs = await JobApplication.countDocuments({ user: req.user._id });

    const roadmapProgress = skillProfile?.learningRoadmap
      ? Math.round((skillProfile.learningRoadmap.filter(r => r.completed).length / (skillProfile.learningRoadmap.length || 1)) * 100)
      : 0;

    const avgInterviewScore = interviews > 0 ? 75 : 0; // rough estimate since we don't have the scores loaded here

    const readiness = Math.min(100, Math.round(
      (skillProfile?.skillScore || 0) * 0.25 +
      (resume?.atsScore || 0) * 0.25 +
      (avgInterviewScore || 0) * 0.20 +
      (roadmapProgress || 0) * 0.20 +
      Math.min(interviews * 5, 10)
    ));

    progress.careerReadinessScore = readiness;
    progress.totalStats.resumeScore = resume?.atsScore || 0;
    await progress.save();

    res.json({
      success: true,
      progress,
      snapshot: {
        skillScore: skillProfile?.skillScore || 0,
        resumeScore: resume?.atsScore || 0,
        interviewsDone: interviews,
        jobsApplied: jobs,
        careerReadiness: readiness,
        streak: progress.streak,
        targetRole: skillProfile?.targetRole || 'Not set'
      }
    });
  } catch (error) { next(error); }
};

exports.getDashboardStats = async (req, res, next) => {
  try {
    const [skillProfile, resume, interviews, jobs, progress, careerPlan] = await Promise.all([
      SkillProfile.findOne({ user: req.user._id }),
      Resume.findOne({ user: req.user._id, isActive: true }),
      InterviewSession.find({ user: req.user._id, status: 'completed' }).select('overallScore createdAt targetRole'),
      JobApplication.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(5),
      Progress.findOne({ user: req.user._id }),
      CareerPlan.findOne({ user: req.user._id, isActive: true })
    ]);

    const avgInterviewScore = interviews.length
      ? Math.round(interviews.reduce((a, b) => a + b.overallScore, 0) / interviews.length)
      : 0;

    // Real Activity last 7 days from progress
    const weekActivity = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      
      const activityForDay = progress?.dailyActivity?.find(a => {
        const actDate = new Date(a.date);
        actDate.setHours(0, 0, 0, 0);
        return actDate.getTime() === d.getTime();
      });

      return {
        day: d.toLocaleDateString('en', { weekday: 'short' }),
        minutes: activityForDay?.minutesSpent || 0
      };
    });

    const roadmapProgress = skillProfile?.learningRoadmap
      ? Math.round((skillProfile.learningRoadmap.filter(r => r.completed).length / (skillProfile.learningRoadmap.length || 1)) * 100)
      : 0;

    const careerReadiness = Math.min(100, Math.round(
      (skillProfile?.skillScore || 0) * 0.25 +
      (resume?.atsScore || 0) * 0.25 +
      (avgInterviewScore || 0) * 0.20 +
      (roadmapProgress || 0) * 0.20 +
      Math.min(interviews.length * 5, 10)
    ));

    res.json({
      success: true,
      stats: {
        skillScore: skillProfile?.skillScore || 0,
        resumeScore: resume?.atsScore || 0,
        totalSkills: skillProfile?.currentSkills?.length || 0,
        targetRole: skillProfile?.targetRole || careerPlan?.targetRole || 'Not set',
        jobsApplied: await JobApplication.countDocuments({ user: req.user._id }),
        jobsSaved: await JobApplication.countDocuments({ user: req.user._id, status: 'saved' }),
        interviewsDone: interviews.length,
        avgInterviewScore,
        recentJobs: jobs,
        recentInterviews: interviews.slice(0, 3),
        weekActivity,
        careerReadiness,
        roadmapProgress,
        careerPlan: careerPlan ? {
          currentDay: careerPlan.currentDay,
          totalDays: careerPlan.duration,
          targetRole: careerPlan.targetRole,
          startDate: careerPlan.startDate
        } : null
      }
    });
  } catch (error) { next(error); }
};

// ─── NEW INTELLIGENCE ENDPOINTS ─────────────────────────────────────────

exports.getWeeklyReport = async (req, res, next) => {
  try {
    // Week window: last 7 days
    const weekEnd = new Date();
    weekEnd.setHours(23, 59, 59, 999);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    // Monday-aligned key for deduplication
    const monKey = new Date(weekStart);

    // Return cached report if already generated this week
    let existingReport = await WeeklyReport.findOne({ user: req.user._id, weekStartDate: { $gte: monKey } });
    if (existingReport) return res.json({ success: true, report: existingReport });

    // ── Gather real data ──────────────────────────────────────────────
    const [progress, careerPlan, weekTasks, skillProfile] = await Promise.all([
      Progress.findOne({ user: req.user._id }),
      CareerPlan.findOne({ user: req.user._id, isActive: true }),
      DailyTask.find({ user: req.user._id, date: { $gte: weekStart, $lte: weekEnd } }),
      SkillProfile.findOne({ user: req.user._id })
    ]);

    const completedTasks = weekTasks.filter(t => t.completed || t.status === 'completed');
    const skippedTasks   = weekTasks.filter(t => t.status === 'skipped');
    const taskRate       = weekTasks.length > 0 ? Math.round((completedTasks.length / weekTasks.length) * 100) : 0;
    const xpEarned       = completedTasks.reduce((sum, t) => sum + (t.xpReward || 50), 0);

    // Skill targets from completed tasks
    const skillHits = {};
    completedTasks.forEach(t => { if (t.skillTarget) skillHits[t.skillTarget] = (skillHits[t.skillTarget] || 0) + 1; });
    const topSkills = Object.entries(skillHits).sort((a,b) => b[1]-a[1]).slice(0,3).map(([s]) => s);

    // Missed themes
    const missedThemes = [...new Set(skippedTasks.map(t => t.skillTarget).filter(Boolean))].slice(0,3);

    // Week number in career plan
    const weekNumber = careerPlan
      ? Math.ceil(careerPlan.currentDay / 7)
      : Math.ceil((progress?.totalStats?.tasksCompleted || 1) / 5);

    const llmConfig = await getUserLLMConfig(req.user._id);

    const context = {
      targetRole: careerPlan?.targetRole || skillProfile?.targetRole || 'Software Developer',
      weekNumber,
      currentDay: careerPlan?.currentDay || 1,
      totalDays: careerPlan?.duration || 90,
      taskRate,
      xpEarned,
      completedCount: completedTasks.length,
      totalCount: weekTasks.length,
      topSkillsPracticed: topSkills,
      missedSkills: missedThemes,
      totalStats: progress?.totalStats || {},
      streak: progress?.streak || 0
    };

    const generated = await generateWeeklyReport(context, llmConfig);

    existingReport = await WeeklyReport.create({
      user: req.user._id,
      weekStartDate: monKey,
      weekNumber,
      taskRate,
      xpEarned,
      ...generated
    });

    res.json({ success: true, report: existingReport });
  } catch (error) { next(error); }
};

exports.getDailyTasks = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // ── Find active career plan to know which roadmap day we're on ──
    const careerPlan = await CareerPlan.findOne({ user: req.user._id, isActive: true });

    let currentDay = 1;
    let dayData = null;

    if (careerPlan) {
      // Calculate how many days since start
      const diffMs = today.getTime() - new Date(careerPlan.startDate).setHours(0,0,0,0);
      currentDay = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
      currentDay = Math.min(currentDay, careerPlan.duration); // cap to duration

      // Update the plan's currentDay
      if (careerPlan.currentDay !== currentDay) {
        await CareerPlan.findOneAndUpdate({ user: req.user._id }, { currentDay });
      }

      // Get the day data from the stored roadmap
      const roadmap = careerPlan.roadmapData;
      if (roadmap?.days?.length >= currentDay) {
        dayData = roadmap.days[currentDay - 1];
      }
    }

    // ── Check if we already have tasks for today ──
    let tasks = await DailyTask.find({ user: req.user._id, date: { $gte: today, $lt: tomorrow } });

    if (tasks.length === 0) {
      // Generate tasks based on career plan day data or AI fallback
      const taskDocs = [];

      if (dayData) {
        // Create from roadmap day data
        taskDocs.push(
          { user: req.user._id, date: today, dayNumber: currentDay, title: `📚 Learn: ${dayData.theme}`, description: dayData.learning, type: 'learning', durationStr: '60 min', difficulty: 'medium', xpReward: 100, skillTarget: dayData.theme, status: 'pending' },
          { user: req.user._id, date: today, dayNumber: currentDay, title: `💪 Practice: ${dayData.theme}`, description: dayData.practice, type: 'practice', durationStr: '45 min', difficulty: 'medium', xpReward: 80, skillTarget: dayData.theme, status: 'pending' },
          { user: req.user._id, date: today, dayNumber: currentDay, title: `🔨 Build: ${dayData.theme}`, description: dayData.build, type: 'build', durationStr: '90 min', difficulty: 'hard', xpReward: 150, skillTarget: dayData.theme, status: 'pending' },
          { user: req.user._id, date: today, dayNumber: currentDay, title: `✅ Checkpoint`, description: dayData.checkpoint, type: 'checkpoint', durationStr: '15 min', difficulty: 'easy', xpReward: 50, skillTarget: dayData.theme, status: 'pending' }
        );
      } else {
        // AI-generated fallback tasks
        const profile = await SkillProfile.findOne({ user: req.user._id });
        const progress = await Progress.findOne({ user: req.user._id });
        const llmConfig = await getUserLLMConfig(req.user._id);
        const generated = await generateDailyTasks(
          profile?.targetRole,
          profile?.learningRoadmap?.filter(r => !r.completed) || [],
          progress?.totalStats || {},
          llmConfig
        );
        generated.tasks.forEach(t => {
          taskDocs.push({
            user: req.user._id, date: today, dayNumber: currentDay,
            title: t.title, description: '', type: 'general',
            durationStr: t.durationStr, difficulty: t.difficulty,
            xpReward: t.xpReward, skillTarget: t.skillTarget, status: 'pending'
          });
        });
      }

      if (taskDocs.length > 0) {
        tasks = await DailyTask.insertMany(taskDocs);
      }
    }

    res.json({
      success: true,
      tasks,
      currentDay,
      totalDays: careerPlan?.duration || null,
      targetRole: careerPlan?.targetRole || null,
      startDate: careerPlan?.startDate || null
    });
  } catch (error) { next(error); }
};

exports.completeTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { feedback, userNotes } = req.body || {};

    const task = await DailyTask.findOneAndUpdate(
      { _id: id, user: req.user._id },
      {
        completed: true, completedAt: new Date(),
        status: 'completed',
        ...(feedback ? { feedback } : {}),
        ...(userNotes ? { userNotes } : {})
      },
      { new: true }
    );

    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    // Mark related skill roadmap item as completed if matches
    if (task.skillTarget) {
      await SkillProfile.findOneAndUpdate(
        { user: req.user._id, 'learningRoadmap.skill': task.skillTarget },
        {
          $set: { 'learningRoadmap.$.completed': true },
          $inc: { skillScore: Math.round(task.xpReward / 10) }
        }
      );
    } else {
      await SkillProfile.findOneAndUpdate(
        { user: req.user._id },
        { $inc: { skillScore: Math.round(task.xpReward / 10) } }
      );
    }

    // Update Progress stats and streak
    const today = new Date().toDateString();
    const progress = await Progress.findOne({ user: req.user._id });
    const lastActive = progress?.lastActiveDate ? new Date(progress.lastActiveDate).toDateString() : null;
    const streakIncrement = lastActive === today ? 0 : 1;

    await Progress.findOneAndUpdate(
      { user: req.user._id },
      {
        $inc: { 'totalStats.skillsLearned': 1, 'totalStats.tasksCompleted': 1, streak: streakIncrement },
        $set: { lastActiveDate: new Date() }
      },
      { upsert: true }
    );

    // If feedback was 'difficult', check if AI adjustment is needed
    let coachMessage = null;
    if (feedback === 'difficult') {
      coachMessage = 'You found today challenging — no worries! Tomorrow will include a brief revision of today\'s topic before moving forward.';
    } else if (feedback === 'easy') {
      coachMessage = 'Great job! You\'re ahead of pace. Keep up the momentum!';
    }

    res.json({ success: true, task, xpEarned: task.xpReward, coachMessage });
  } catch (error) { next(error); }
};

exports.skipTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const task = await DailyTask.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { status: 'skipped' },
      { new: true }
    );
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, task });
  } catch (error) { next(error); }
};

exports.getCareerPlan = async (req, res, next) => {
  try {
    const plan = await CareerPlan.findOne({ user: req.user._id, isActive: true });
    res.json({ success: true, plan: plan || null });
  } catch (error) { next(error); }
};
