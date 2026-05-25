import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Brain, TrendingUp, Briefcase, Mic, Target, MapPin,
  ArrowRight, Zap, CheckCircle, Clock, Star, BookOpen,
  ChevronRight, Activity, Award
} from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line } from 'recharts';
import DashboardLayout from '../components/layout/DashboardLayout';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import toast from 'react-hot-toast';

const StatCard = ({ icon: Icon, label, value, sub, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
    className="glass-card p-5"
  >
    <div className="flex items-start justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <span className="text-xs text-slate-500 bg-white/5 px-2 py-1 rounded-lg">{sub}</span>
    </div>
    <p className="text-2xl font-black text-white mb-1">{value}</p>
    <p className="text-slate-400 text-sm">{label}</p>
  </motion.div>
);

const AgentCard = ({ icon: Icon, label, desc, path, color, badge }) => (
  <Link to={path}>
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
      className="glass-card p-5 cursor-pointer hover:border-primary-500/40 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color} shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {badge && <span className="text-xs bg-accent-green/20 text-accent-green border border-accent-green/30 px-2 py-0.5 rounded-full">{badge}</span>}
      </div>
      <p className="text-white font-bold mb-1">{label}</p>
      <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
      <div className="flex items-center gap-1 mt-3 text-primary-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
        Open Agent <ArrowRight className="w-3 h-3" />
      </div>
    </motion.div>
  </Link>
);

// Skeleton loader
const Skeleton = ({ className }) => <div className={`shimmer rounded-lg ${className}`} />;

export default function Dashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/career/dashboard').then(r => {
      setStats(r.data.stats);
    }).catch(() => {
      // Use mock data if API not ready
      setStats({
        skillScore: 0, resumeScore: 0, totalSkills: 0, targetRole: 'Not set',
        jobsApplied: 0, interviewsDone: 0, avgInterviewScore: 0,
        careerReadiness: 0, roadmapProgress: 0,
        weekActivity: Array.from({ length: 7 }, (_, i) => ({
          day: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i], minutes: 0
        }))
      });
    }).finally(() => setLoading(false));
  }, []);

  const agents = [
    { icon: Brain, label: 'Skill Analysis', desc: 'Analyze your skills and get personalized learning roadmap', path: '/skills', color: 'bg-primary-500', badge: 'AI Powered' },
    { icon: BookOpen, label: 'Resume Builder', desc: 'Create ATS-optimized resume with AI enhancement', path: '/resume', color: 'bg-accent-purple' },
    { icon: Briefcase, label: 'Job Matching', desc: 'Get matched with jobs, internships and freelance work', path: '/jobs', color: 'bg-accent-blue', badge: 'Hot' },
    { icon: Mic, label: 'Interview Prep', desc: 'Practice mock interviews with real-time AI feedback', path: '/interview', color: 'bg-accent-cyan' },
    { icon: Target, label: 'Career Roadmap', desc: '90-day personalized action plan to get hired', path: '/roadmap', color: 'bg-accent-green' },
    { icon: MapPin, label: 'Local Opportunities', desc: 'Find nearby jobs, walk-in drives & skill centers', path: '/opportunities', color: 'bg-accent-yellow' }
  ];

  const radarData = [
    { subject: 'Skills', A: stats?.skillScore || 0, fullMark: 100 },
    { subject: 'Resume', A: stats?.resumeScore || 0, fullMark: 100 },
    { subject: 'Interviews', A: stats?.avgInterviewScore || 0, fullMark: 100 },
    { subject: 'Applications', A: Math.min((stats?.jobsApplied || 0) * 10, 100), fullMark: 100 },
    { subject: 'Readiness', A: stats?.careerReadiness || 0, fullMark: 100 }
  ];

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Welcome Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">
              Welcome back, <span className="gradient-text">{user?.fullName?.split(' ')[0]}! 👋</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {stats?.targetRole !== 'Not set' ? `Working towards: ${stats?.targetRole}` : 'Complete your profile to get personalized guidance'}
            </p>
          </div>
          {user?.isDemo && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-yellow/10 border border-accent-yellow/30">
              <Zap className="w-4 h-4 text-accent-yellow" />
              <span className="text-accent-yellow text-sm font-medium">Demo Mode — Read Only</span>
            </div>
          )}
        </motion.div>

        {/* Career Readiness Bar */}
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
              <span className="text-slate-500 text-xs">Just starting</span>
              <span className="text-slate-500 text-xs">Job ready!</span>
            </div>
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32" />) : (
            <>
              <StatCard icon={Brain} label="Skill Score" value={`${stats?.skillScore || 0}%`} sub={`${stats?.totalSkills || 0} skills`} color="bg-primary-500" delay={0.1} />
              <StatCard icon={BookOpen} label="Resume Score" value={`${stats?.resumeScore || 0}%`} sub="ATS score" color="bg-accent-purple" delay={0.15} />
              <StatCard icon={Briefcase} label="Jobs Applied" value={stats?.jobsApplied || 0} sub="total" color="bg-accent-blue" delay={0.2} />
              <StatCard icon={Mic} label="Mock Interviews" value={stats?.interviewsDone || 0} sub={stats?.avgInterviewScore ? `avg ${stats.avgInterviewScore}%` : 'practice'} color="bg-accent-cyan" delay={0.25} />
            </>
          )}
        </div>

        {/* Charts + Quick Actions Row */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Radar Chart */}
          <div className="glass-card p-5">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary-400" /> Profile Overview
            </h3>
            {loading ? <Skeleton className="h-48" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Radar name="You" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Weekly Activity */}
          <div className="glass-card p-5">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent-green" /> Weekly Activity
            </h3>
            {loading ? <Skeleton className="h-48" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats?.weekActivity || []}>
                  <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
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

          {/* Roadmap Progress */}
          <div className="glass-card p-5">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-accent-yellow" /> Roadmap Progress
            </h3>
            {loading ? <Skeleton className="h-48" /> : (
              <div className="flex flex-col items-center justify-center h-44 gap-4">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#f59e0b" strokeWidth="10"
                      strokeDasharray={`${(stats?.roadmapProgress || 0) * 3.14} 314`}
                      strokeLinecap="round" className="transition-all duration-1000" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-black text-white">{stats?.roadmapProgress || 0}%</span>
                  </div>
                </div>
                <p className="text-slate-400 text-sm text-center">Roadmap completed</p>
                <Link to="/roadmap" className="text-primary-400 text-xs hover:text-primary-300 flex items-center gap-1">
                  View full roadmap <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* AI Agents Grid */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary-400" /> AI Career Agents
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent, i) => (
              <motion.div key={agent.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <AgentCard {...agent} />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Quick Tips */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="glass-card p-5">
          <h3 className="text-white font-bold mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-accent-yellow" /> Today's Tip
          </h3>
          <p className="text-slate-300 text-sm leading-relaxed">
            💡 <strong>Consistency is key.</strong> Spending just 1 hour daily on learning and job applications consistently is more effective than 8-hour bursts once a week.
            Set a daily reminder and treat your job search like a job!
          </p>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
