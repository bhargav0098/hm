import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, TrendingUp, Briefcase, Mic, Target, MapPin,
  ArrowRight, Zap, CheckCircle, Clock, Star, BookOpen,
  Activity, Award, Flame, Calendar, ChevronRight,
  BarChart3, Sparkles, MessageSquare
} from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import DashboardLayout from '../components/layout/DashboardLayout';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import TodayTasksCard from '../components/dashboard/TodayTasksCard';
import WeeklyReportCard from '../components/dashboard/WeeklyReportCard';

const StatCard = ({ icon: Icon, label, value, sub, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
    className="glass-card p-4"
  >
    <div className="flex items-start justify-between mb-2">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <span className="text-[10px] text-white/50 bg-white/5 px-2 py-0.5 rounded-lg">{sub}</span>
    </div>
    <p className="text-xl font-black text-white mb-0.5">{value}</p>
    <p className="text-white/50 text-xs">{label}</p>
  </motion.div>
);

const Skeleton = ({ className }) => <div className={`shimmer rounded-lg ${className}`} />;

// AI Coach messages based on progress
const getCoachMessage = (stats) => {
  if (!stats) return { msg: "Set up your profile to get personalized AI coaching!", icon: '🤖' };
  const r = stats.careerReadiness || 0;
  const cp = stats.careerPlan;
  if (cp) {
    const pct = Math.round((cp.currentDay / cp.totalDays) * 100);
    if (pct >= 80) return { msg: `You're ${pct}% through your ${cp.targetRole} roadmap! Final stretch — stay consistent and land that job! 🏆`, icon: '🔥' };
    if (pct >= 50) return { msg: `Excellent progress! Day ${cp.currentDay}/${cp.totalDays} on your ${cp.targetRole} journey. You're ahead of most learners!`, icon: '⚡' };
    if (pct >= 20) return { msg: `Day ${cp.currentDay} of ${cp.totalDays} — momentum is building! Complete today's tasks to stay on track for ${cp.targetRole}.`, icon: '💪' };
    return { msg: `Day ${cp.currentDay} of ${cp.totalDays} started! You've taken the first step towards becoming a ${cp.targetRole}. Keep going!`, icon: '🚀' };
  }
  if (r >= 80) return { msg: "You're job-ready! Start applying with confidence. Your profile is in excellent shape.", icon: '🏆' };
  if (r >= 60) return { msg: "Good progress! Generate a career roadmap to accelerate your skill development.", icon: '📈' };
  if (r >= 30) return { msg: "You're building momentum! Complete your resume and analyze your skills to boost readiness.", icon: '💡' };
  return { msg: "Generate your AI Roadmap to get a personalized day-by-day learning plan and activate your daily tasks!", icon: '🗺️' };
};

export default function Dashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/career/dashboard').then(r => {
      setStats(r.data.stats);
    }).catch(() => {
      setStats({
        skillScore: 0, resumeScore: 0, totalSkills: 0, targetRole: 'Not set',
        jobsApplied: 0, interviewsDone: 0, avgInterviewScore: 0,
        careerReadiness: 0, roadmapProgress: 0, careerPlan: null,
        weekActivity: Array.from({ length: 7 }, (_, i) => ({
          day: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i], minutes: 0
        }))
      });
    }).finally(() => setLoading(false));
  }, []);

  const radarData = [
    { subject: 'Skills', A: stats?.skillScore || 0, fullMark: 100 },
    { subject: 'Resume', A: stats?.resumeScore || 0, fullMark: 100 },
    { subject: 'Interviews', A: stats?.avgInterviewScore || 0, fullMark: 100 },
    { subject: 'Applied', A: Math.min((stats?.jobsApplied || 0) * 10, 100), fullMark: 100 },
    { subject: 'Readiness', A: stats?.careerReadiness || 0, fullMark: 100 }
  ];

  const quickLinks = [
    { icon: Brain, label: 'Skills', path: '/skills', color: 'bg-primary-500/20 text-primary-400' },
    { icon: BookOpen, label: 'Resume', path: '/resume', color: 'bg-accent-purple/20 text-accent-purple' },
    { icon: Briefcase, label: 'Jobs', path: '/jobs', color: 'bg-accent-blue/20 text-accent-blue' },
    { icon: Mic, label: 'Interview', path: '/interview', color: 'bg-accent-cyan/20 text-accent-cyan' },
    { icon: Target, label: 'Roadmap', path: '/roadmap', color: 'bg-accent-green/20 text-accent-green' },
    { icon: MapPin, label: 'Local', path: '/opportunities', color: 'bg-accent-yellow/20 text-accent-yellow' }
  ];

  const coach = getCoachMessage(stats);
  const cp = stats?.careerPlan;
  const roadmapDayPct = cp ? Math.round((cp.currentDay / cp.totalDays) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Welcome Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">
              Welcome back, <span className="gradient-text">{user?.fullName?.split(' ')[0] || 'User'}! 👋</span>
            </h1>
            <p className="text-white/50 text-sm mt-1">
              {cp ? `Day ${cp.currentDay}/${cp.totalDays} · ${cp.targetRole}` :
               stats?.targetRole !== 'Not set' ? `Working towards: ${stats?.targetRole}` :
               'Complete your profile to get personalized guidance'}
            </p>
          </div>

          <div className="flex items-center gap-3 glass-card px-4 py-2 rounded-2xl">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-accent-purple/20 flex items-center justify-center border border-accent-purple/50">
                <span className="text-accent-purple font-bold text-xs">AI</span>
              </div>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="flex items-center gap-1.5 text-pink-neon bg-pink-neon/10 px-2 py-1.5 rounded-lg border border-pink-neon/20">
              <Flame className="w-4 h-4" />
              <span className="text-xs font-bold">{loading ? '--' : (stats?.streak || 0)} Day Streak</span>
            </div>
          </div>
        </motion.div>

        {/* AI Coach Banner */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="glass-card p-4 border border-primary-500/25 bg-gradient-to-r from-primary-500/10 to-accent-purple/10">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-500/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-primary-400 mb-0.5 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> AI Career Coach
              </p>
              <p className="text-white/70 text-sm leading-relaxed">
                <span className="mr-1">{coach.icon}</span>{coach.msg}
              </p>
            </div>
            {!cp && (
              <Link to="/roadmap">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="btn-primary text-xs px-3 py-1.5 rounded-lg whitespace-nowrap flex-shrink-0">
                  Get Roadmap
                </motion.button>
              </Link>
            )}
          </div>
        </motion.div>

        {/* Career Plan Progress (if active) */}
        {cp && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            className="glass-card p-5 border border-accent-green/25">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-accent-green" />
                <span className="text-white font-semibold">{cp.targetRole} Roadmap</span>
                <span className="text-xs bg-accent-green/20 text-accent-green px-2 py-0.5 rounded-full border border-accent-green/30">Active</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-white/50">Day <span className="text-white font-bold">{cp.currentDay}</span> of <span className="text-white font-bold">{cp.totalDays}</span></span>
                <span className="text-accent-green font-black text-lg">{roadmapDayPct}%</span>
              </div>
            </div>
            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${roadmapDayPct}%` }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-accent-green to-teal-400"
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-white/50 text-xs">Started {new Date(cp.startDate).toLocaleDateString()}</span>
              <Link to="/roadmap" className="text-xs text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1">
                View full plan <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </motion.div>
        )}

        {/* Quick Access */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {quickLinks.map((link, i) => (
            <Link key={i} to={link.path}>
              <motion.div
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-card hover:bg-white/10 transition-colors whitespace-nowrap"
              >
                <div className={`w-6 h-6 rounded-md flex items-center justify-center ${link.color}`}>
                  <link.icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-white text-sm font-semibold">{link.label}</span>
              </motion.div>
            </Link>
          ))}
        </div>

        {/* Career Readiness */}
        {!loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary-400" />
                <span className="text-white font-semibold">Career Readiness Score</span>
              </div>
              <span className="text-2xl font-black text-primary-400">{stats?.careerReadiness || 0}%</span>
            </div>
            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${stats?.careerReadiness || 0}%` }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-primary-500 via-accent-purple to-accent-cyan"
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-white/50 text-xs">Just starting</span>
              <span className="text-white/50 text-xs">Job ready! 🎯</span>
            </div>
          </motion.div>
        )}

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-5">

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {loading ? Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28" />) : (
                <>
                  <StatCard icon={Brain} label="Skill Score" value={`${stats?.skillScore || 0}%`} sub="AI Analyzed" color="bg-primary-500" delay={0.1} />
                  <StatCard icon={BookOpen} label="Resume Score" value={`${stats?.resumeScore || 0}%`} sub="ATS" color="bg-accent-purple" delay={0.15} />
                  <StatCard icon={Briefcase} label="Jobs Applied" value={stats?.jobsApplied || 0} sub="Total" color="bg-accent-blue" delay={0.2} />
                  <StatCard icon={Mic} label="Mock Interviews" value={stats?.interviewsDone || 0} sub="Practice" color="bg-accent-cyan" delay={0.25} />
                </>
              )}
            </div>

            {/* Roadmap Progress Bar (separate track) */}
            {!loading && (stats?.roadmapProgress > 0 || cp) && (
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-accent-yellow" />
                    <span className="text-white text-sm font-semibold">Skills Roadmap Progress</span>
                  </div>
                  <span className="text-accent-yellow font-bold text-sm">{stats?.roadmapProgress || 0}%</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${stats?.roadmapProgress || 0}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-accent-yellow from-pink-neon to-purple-neon"
                  />
                </div>
              </div>
            )}

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-5">
              {/* Radar */}
              <div className="glass-card p-5">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-sm">
                  <Activity className="w-4 h-4 text-primary-400" /> Profile Overview
                </h3>
                {loading ? <Skeleton className="h-48" /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="rgba(255,255,255,0.1)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <Radar name="You" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Weekly Activity */}
              <div className="glass-card p-5">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-accent-green" /> Weekly Study Activity
                </h3>
                {loading ? <Skeleton className="h-48" /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stats?.weekActivity || []}>
                      <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: '#1a1a3e', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', color: '#e2e8f0' }}
                        formatter={(v) => [`${v} min`, 'Study Time']}
                      />
                      <Bar dataKey="minutes" fill="url(#barGrad)" radius={[4, 4, 0, 0]} />
                      <defs>
                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Weekly Report */}
            <WeeklyReportCard />
          </div>

          {/* Right Column */}
          <div className="space-y-5">
            <TodayTasksCard />

            {/* Get Started CTA (if no career plan) */}
            {!loading && !cp && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="glass-card p-5 border border-accent-green/25 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-green to-teal-500 flex items-center justify-center mx-auto mb-3">
                  <Target className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-white font-bold mb-1">Activate Your Career Plan</h3>
                <p className="text-white/50 text-xs mb-4">Generate your AI roadmap and get personalized daily tasks based on your target role.</p>
                <div className="space-y-2">
                  <Link to="/roadmap">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      className="btn-primary w-full flex items-center justify-center gap-2">
                      <Zap className="w-4 h-4" /> Generate AI Roadmap
                    </motion.button>
                  </Link>
                  <Link to="/skills">
                    <button className="w-full py-2 text-xs text-white/50 hover:text-white transition-colors">
                      Or analyze your skills first →
                    </button>
                  </Link>
                </div>
              </motion.div>
            )}

            {/* Quick Action Links */}
            <div className="glass-card p-4">
              <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-primary-400" /> Next Actions
              </h3>
              <div className="space-y-2">
                {[
                  { icon: Brain, label: 'Analyze Skills', sub: 'Find your gaps', path: '/skills', color: 'text-primary-400' },
                  { icon: BookOpen, label: 'Build Resume', sub: 'ATS optimized', path: '/resume', color: 'text-accent-purple' },
                  { icon: Mic, label: 'Mock Interview', sub: 'Practice now', path: '/interview', color: 'text-accent-cyan' },
                  { icon: Briefcase, label: 'Find Jobs', sub: 'AI matched', path: '/jobs', color: 'text-accent-blue' },
                ].map((item, i) => (
                  <Link key={i} to={item.path}>
                    <motion.div whileHover={{ x: 4 }}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-all cursor-pointer group">
                      <item.icon className={`w-4 h-4 ${item.color} flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">{item.label}</p>
                        <p className="text-white/50 text-xs">{item.sub}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white/50 transition-colors" />
                    </motion.div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
