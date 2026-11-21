import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, animate, useReducedMotion } from 'framer-motion';
import {
  Brain, Briefcase, Mic, Target, MapPin, ArrowRight, Zap, BookOpen,
  Activity, Award, Flame, Calendar, ChevronRight, Sparkles, Clock
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import DashboardLayout from '../components/layout/DashboardLayout';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import TodayTasksCard from '../components/dashboard/TodayTasksCard';
import WeeklyReportCard from '../components/dashboard/WeeklyReportCard';

const EASE = [0.22, 1, 0.36, 1];

/* ── small pieces ─────────────────────────────────────────────── */

function CountUp({ value = 0, suffix = '', duration = 1.3 }) {
  const reduce = useReducedMotion();
  const target = Number(value) || 0;
  const [n, setN] = useState(reduce ? target : 0);
  useEffect(() => {
    if (reduce) { setN(target); return undefined; }
    const controls = animate(0, target, { duration, ease: EASE, onUpdate: (v) => setN(Math.round(v)) });
    return () => controls.stop();
  }, [target, reduce, duration]);
  return <>{n}{suffix}</>;
}

function Ring({ pct = 0, size = 136, stroke = 13, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5B21B6" /><stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EDE9FE" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#ringGrad)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - Math.min(pct, 100) / 100) }}
          transition={{ duration: 1.5, ease: EASE, delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

const StatCard = ({ icon: Icon, label, value, suffix, sub, tone }) => (
  <div className="glass-card p-5">
    <div className="flex items-start justify-between mb-5">
      <span className={`w-11 h-11 rounded-full flex items-center justify-center ${tone}`}><Icon className="w-5 h-5" /></span>
      <span className="chip">{sub}</span>
    </div>
    <p className="font-display text-3xl font-bold text-ink tabular"><CountUp value={value} suffix={suffix} /></p>
    <p className="text-ink-soft text-sm mt-0.5">{label}</p>
  </div>
);

const Skeleton = ({ className }) => <div className={`shimmer rounded-3xl ${className}`} />;

const getCoachMessage = (stats) => {
  if (!stats) return 'Set up your profile to get personalized AI coaching.';
  const r = stats.careerReadiness || 0;
  const cp = stats.careerPlan;
  if (cp) {
    const pct = Math.round((cp.currentDay / cp.totalDays) * 100);
    if (pct >= 80) return `You're ${pct}% through your ${cp.targetRole} roadmap. Final stretch: stay consistent and land that job.`;
    if (pct >= 50) return `Day ${cp.currentDay} of ${cp.totalDays} on your ${cp.targetRole} journey. You're ahead of most learners.`;
    if (pct >= 20) return `Day ${cp.currentDay} of ${cp.totalDays}, and momentum is building. Complete today's tasks to stay on track for ${cp.targetRole}.`;
    return `Day ${cp.currentDay} of ${cp.totalDays} is underway. You've taken the first step toward becoming a ${cp.targetRole}.`;
  }
  if (r >= 80) return "You're job-ready. Start applying with confidence; your profile is in excellent shape.";
  if (r >= 60) return 'Good progress. Generate a career roadmap to speed up your skill development.';
  if (r >= 30) return 'Momentum is building. Complete your resume and analyze your skills to raise your readiness.';
  return "Generate your AI roadmap to get a personalized day-by-day learning plan and activate today's tasks.";
};

const QUICK_LINKS = [
  { icon: Brain, label: 'Skills', path: '/skills' },
  { icon: BookOpen, label: 'Resume', path: '/resume' },
  { icon: Briefcase, label: 'Jobs', path: '/jobs' },
  { icon: Mic, label: 'Interview', path: '/interview' },
  { icon: Target, label: 'Roadmap', path: '/roadmap' },
  { icon: MapPin, label: 'Local', path: '/opportunities' },
];

const NEXT_ACTIONS = [
  { icon: Brain, label: 'Analyze skills', sub: 'Find your gaps', path: '/skills' },
  { icon: BookOpen, label: 'Build resume', sub: 'ATS optimized', path: '/resume' },
  { icon: Mic, label: 'Mock interview', sub: 'Practice now', path: '/interview' },
  { icon: Briefcase, label: 'Find jobs', sub: 'AI matched', path: '/jobs' },
];

const chartTip = {
  background: '#FFFFFF', border: '1px solid #C7B3FF', borderRadius: '16px',
  color: '#1E1042', boxShadow: '0 14px 30px -14px rgba(91,33,182,0.4)', fontSize: 13
};

/* ── page ─────────────────────────────────────────────────────── */

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
          day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i], minutes: 0
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

  const cp = stats?.careerPlan;
  const roadmapDayPct = cp ? Math.round((cp.currentDay / cp.totalDays) * 100) : 0;
  const readiness = stats?.careerReadiness || 0;
  const firstName = user?.fullName?.split(' ')[0] || 'there';

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight">Welcome back, {firstName}</h1>
            <p className="text-ink-soft mt-1.5">
              {cp ? `Day ${cp.currentDay} of ${cp.totalDays} on your ${cp.targetRole} roadmap` :
                stats?.targetRole && stats.targetRole !== 'Not set' ? `Working toward: ${stats.targetRole}` :
                  'Complete your profile to get personalized guidance'}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white/80 border border-primary-300/50 shadow-soft pl-2 pr-4 py-1.5">
            <span className="w-8 h-8 rounded-full bg-pill-accent text-white flex items-center justify-center"><Flame className="w-4 h-4" /></span>
            <span className="text-sm font-semibold text-ink tabular">{loading ? '–' : (stats?.streak || 0)} day streak</span>
          </div>
        </div>

        {/* Hero band: readiness + roadmap */}
        <div className="grid lg:grid-cols-3 gap-5">
          <motion.section
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}
            className="lg:col-span-2 relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700 text-white p-6 sm:p-8 shadow-soft-lg"
          >
            <div aria-hidden className="absolute -right-12 -top-10 hidden sm:block">
              {['w-64 bg-white/10', 'w-72 bg-white/[0.07] -ml-8', 'w-56 bg-white/[0.05] ml-4'].map((c, i) => (
                <motion.div key={i} className={`h-14 rounded-full -mt-3 first:mt-0 ${c}`}
                  animate={{ x: [0, i % 2 ? -10 : 10, 0] }} transition={{ duration: 8 + i * 2, repeat: Infinity, ease: 'easeInOut' }} />
              ))}
            </div>

            <div className="relative flex items-center gap-2 text-primary-100 text-sm font-semibold">
              <Award className="w-4 h-4" /> Career readiness
            </div>
            <p className="relative font-display text-7xl sm:text-8xl font-bold leading-none mt-3 tracking-tight tabular">
              {loading ? <span className="opacity-40">–</span> : <CountUp value={readiness} suffix="%" />}
            </p>

            <div className="relative mt-6 h-4 rounded-full bg-white/15 overflow-hidden" role="progressbar" aria-valuenow={readiness} aria-valuemin={0} aria-valuemax={100} aria-label="Career readiness">
              <motion.div
                initial={{ width: 0 }} animate={{ width: loading ? 0 : `${readiness}%` }} transition={{ duration: 1.5, ease: EASE, delay: 0.15 }}
                className="h-full rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.6)]"
              />
            </div>
            <div className="relative flex justify-between mt-2 text-xs text-primary-100"><span>Just starting</span><span>Job ready</span></div>

            <div className="relative mt-6 flex items-start gap-3 rounded-3xl bg-white/10 border border-white/15 backdrop-blur-sm p-4">
              <span className="w-10 h-10 rounded-full bg-white text-primary-500 flex items-center justify-center flex-shrink-0"><Sparkles className="w-5 h-5" /></span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">AI career coach</p>
                <p className="text-sm text-primary-100 leading-relaxed mt-0.5">{getCoachMessage(stats)}</p>
              </div>
              {!cp && !loading && (
                <Link to="/roadmap" className="flex-shrink-0 self-center rounded-full bg-white text-primary-500 text-sm font-semibold px-4 py-2 hover:bg-primary-50 hover:-translate-y-0.5 transition-all">
                  Get roadmap
                </Link>
              )}
            </div>
          </motion.section>

          {loading ? <Skeleton className="h-full min-h-[18rem]" /> : cp ? (
            <section className="glass-card p-6 flex flex-col items-center text-center justify-center">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary-500 mb-5">
                <Calendar className="w-4 h-4" /> {cp.targetRole} roadmap
                <span className="chip !bg-green-50 !text-green-700 !border-green-200">Active</span>
              </div>
              <Ring pct={roadmapDayPct}>
                <span className="font-display text-3xl font-bold text-ink tabular"><CountUp value={roadmapDayPct} suffix="%" /></span>
                <span className="text-xs text-ink-mute">complete</span>
              </Ring>
              <p className="mt-5 text-ink">Day <b className="font-display text-lg">{cp.currentDay}</b> of <b className="font-display text-lg">{cp.totalDays}</b></p>
              <p className="text-ink-mute text-xs mt-1">Started {new Date(cp.startDate).toLocaleDateString()}</p>
              <Link to="/roadmap" className="mt-4 text-sm font-semibold text-primary-500 hover:text-primary-700 flex items-center gap-1 transition-colors">
                View full plan <ChevronRight className="w-4 h-4" />
              </Link>
            </section>
          ) : (
            <section className="glass-card p-6 flex flex-col items-center text-center justify-center">
              <span className="w-16 h-16 rounded-full bg-pill-accent shadow-pill text-white flex items-center justify-center mb-4"><Target className="w-8 h-8" /></span>
              <h3 className="font-display text-xl font-bold text-ink">Activate your career plan</h3>
              <p className="text-ink-soft text-sm mt-2 mb-5 max-w-[16rem]">Generate your AI roadmap and get daily tasks based on your target role.</p>
              <Link to="/roadmap" className="btn-primary w-full"><Zap className="w-4 h-4" /> Generate AI roadmap</Link>
              <Link to="/skills" className="mt-3 text-sm font-semibold text-ink-mute hover:text-primary-500 transition-colors">Or analyze your skills first</Link>
            </section>
          )}
        </div>

        {/* Quick access */}
        <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
          {QUICK_LINKS.map((link) => (
            <Link key={link.path} to={link.path}
              className="group flex items-center gap-2.5 pl-2 pr-5 py-2 rounded-full bg-white/80 border border-primary-300/50 shadow-soft whitespace-nowrap hover:-translate-y-0.5 hover:border-primary-400 hover:bg-white transition-all duration-300">
              <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-500 flex items-center justify-center group-hover:bg-primary-500 group-hover:text-white transition-colors duration-300">
                <link.icon className="w-4 h-4" />
              </span>
              <span className="text-sm font-semibold text-ink">{link.label}</span>
            </Link>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {loading ? Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-36" />) : (
                <>
                  <StatCard icon={Brain} label="Skill score" value={stats?.skillScore || 0} suffix="%" sub="AI" tone="bg-pill-primary text-white shadow-pill" />
                  <StatCard icon={BookOpen} label="Resume score" value={stats?.resumeScore || 0} suffix="%" sub="ATS" tone="bg-pill-accent text-white shadow-pill" />
                  <StatCard icon={Briefcase} label="Jobs applied" value={stats?.jobsApplied || 0} sub="Total" tone="bg-pill-secondary text-primary-700 shadow-pill-light" />
                  <StatCard icon={Mic} label="Mock interviews" value={stats?.interviewsDone || 0} sub="Practice" tone="bg-primary-100 text-primary-500 shadow-pill-light" />
                </>
              )}
            </div>

            {!loading && (stats?.roadmapProgress > 0 || cp) && (
              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-ink font-semibold"><Target className="w-4 h-4 text-primary-400" /> Skills roadmap progress</div>
                  <span className="font-display font-bold text-primary-500 tabular">{stats?.roadmapProgress || 0}%</span>
                </div>
                <div className="h-3 rounded-full bg-primary-100 overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${stats?.roadmapProgress || 0}%` }} transition={{ duration: 1.3, ease: EASE }}
                    className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-400" />
                </div>
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-5">
              <div className="glass-card p-5">
                <h3 className="text-ink font-bold mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-primary-400" /> Profile overview</h3>
                {loading ? <Skeleton className="h-52" /> : (
                  <ResponsiveContainer width="100%" height={230}>
                    <RadarChart data={radarData} outerRadius="72%">
                      <PolarGrid stroke="rgba(139,92,246,0.22)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#4A3B78', fontSize: 12, fontWeight: 600 }} />
                      <Radar name="You" dataKey="A" stroke="#5B21B6" strokeWidth={2.5} fill="#8B5CF6" fillOpacity={0.3} animationDuration={1200} />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="glass-card p-5">
                <h3 className="text-ink font-bold mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-primary-400" /> Weekly study activity</h3>
                {loading ? <Skeleton className="h-52" /> : (
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={stats?.weekActivity || []} barCategoryGap="28%">
                      <CartesianGrid vertical={false} stroke="rgba(139,92,246,0.15)" strokeDasharray="3 5" />
                      <XAxis dataKey="day" tick={{ fill: '#6B5C96', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#6B5C96', fontSize: 12 }} axisLine={false} tickLine={false} width={34} />
                      <Tooltip cursor={{ fill: 'rgba(199,179,255,0.25)', radius: 12 }} contentStyle={chartTip} formatter={(v) => [`${v} min`, 'Study time']} />
                      <defs>
                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8B5CF6" /><stop offset="100%" stopColor="#5B21B6" />
                        </linearGradient>
                      </defs>
                      <Bar dataKey="minutes" fill="url(#barGrad)" radius={[999, 999, 999, 999]} animationDuration={1100} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <WeeklyReportCard />
          </div>

          <div className="space-y-5">
            <TodayTasksCard />

            <div className="glass-card p-4">
              <h3 className="text-ink font-bold px-2 pt-1 pb-3">Next actions</h3>
              <div className="space-y-1">
                {NEXT_ACTIONS.map((item) => (
                  <Link key={item.path} to={item.path} className="group flex items-center gap-3 p-2 pr-4 rounded-full hover:bg-primary-100/80 transition-colors">
                    <span className="w-10 h-10 rounded-full bg-primary-100 text-primary-500 flex items-center justify-center group-hover:bg-white transition-colors flex-shrink-0">
                      <item.icon className="w-[18px] h-[18px]" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-ink text-sm font-semibold">{item.label}</span>
                      <span className="block text-ink-mute text-xs">{item.sub}</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-primary-300 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all" />
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
