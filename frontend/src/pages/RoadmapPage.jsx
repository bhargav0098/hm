import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Zap, CheckCircle, Calendar, Clock, Lightbulb, Download, ArrowRight, BookOpen, Briefcase, Mic, Brain, MapPin, Code, Hammer, BarChart3, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/layout/DashboardLayout';
import api from '../services/api';

const DURATION_OPTIONS = [
  { value: 30, label: '30 Days', desc: 'Quick sprint' },
  { value: 60, label: '60 Days', desc: 'Focused plan' },
  { value: 90, label: '90 Days', desc: 'Full roadmap' },
  { value: 120, label: '4 Months', desc: 'Deep dive' },
  { value: 180, label: '6 Months', desc: 'Career shift' },
];

const NEXT_STEPS = [
  { icon: Brain, label: 'Analyze Skills', desc: 'Find your skill gaps', path: '/skills', color: 'bg-primary-500' },
  { icon: BookOpen, label: 'Build Resume', desc: 'Create ATS-optimized resume', path: '/resume', color: 'bg-accent-purple' },
  { icon: Briefcase, label: 'Find Jobs', desc: 'Match with top roles', path: '/jobs', color: 'bg-accent-blue' },
  { icon: Mic, label: 'Practice Interview', desc: 'Mock interview prep', path: '/interview', color: 'bg-accent-cyan' },
  { icon: MapPin, label: 'Local Opportunities', desc: 'Jobs near you', path: '/opportunities', color: 'bg-accent-yellow' },
];

const dayColors = [
  'from-primary-500 to-accent-purple',
  'from-accent-cyan to-accent-blue',
  'from-accent-green to-teal-500',
  'from-accent-yellow from-pink-neon to-purple-neon',
  'from-pink-500 to-rose-500',
  'from-purple-500 to-violet-500',
  'from-emerald-500 from-cyan-neon to-emerald-neon',
];

const priorityColors = {
  critical: 'border-red-500/40 bg-red-500/10 text-red-400',
  high: 'border-pink-neon/40 bg-pink-neon/10 text-pink-neon',
  medium: 'border-pink-neon/40 bg-pink-neon/10 text-pink-neon',
  low: 'border-green-500/40 bg-green-500/10 text-green-400',
};

export default function RoadmapPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [targetRole, setTargetRole] = useState('');
  const [skills, setSkills] = useState('');
  const [duration, setDuration] = useState(30);
  const [completedDays, setCompletedDays] = useState([]);
  const [expandedDay, setExpandedDay] = useState(null);
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline' | 'compact'
  const [loadingMsg, setLoadingMsg] = useState('Generating your personalized roadmap...');
  const printRef = useRef(null);
  const loadingTimerRef = useRef(null);

  useEffect(() => {
    api.get('/career/skills/profile').then(r => {
      if (r.data.profile) {
        setTargetRole(r.data.profile.targetRole || '');
        setSkills(r.data.profile.currentSkills?.map(s => s.name).join(', ') || '');
      }
    }).catch(() => {});
  }, []);

  const generate = async () => {
    if (!targetRole.trim()) {
      toast.error('Please enter a target role first.');
      return;
    }
    setLoading(true);
    setLoadingMsg('Analyzing your profile with AI...');

    // Progressive loading messages
    const msgs = [
      'Building your personalized day-by-day plan...',
      'Selecting role-specific skills and resources...',
      'Creating project milestones...',
      'Almost done — finalizing your roadmap...',
    ];
    let msgIdx = 0;
    loadingTimerRef.current = setInterval(() => {
      msgIdx = (msgIdx + 1) % msgs.length;
      setLoadingMsg(msgs[msgIdx]);
    }, 5000);

    try {
      const { data } = await api.post('/career/roadmap', {
        skills: skills.split(',').map(s => s.trim()).filter(Boolean),
        targetRole: targetRole.trim(),
        duration
      });
      if (!data.success || !data.result) {
        throw new Error(data.message || 'No roadmap returned from AI');
      }
      setResult(data.result);
      setCompletedDays([]);
      setExpandedDay(null);
      toast.success(`${duration}-day ${targetRole} roadmap generated! 🗺️`);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Generation failed. Check your API key in Settings.';
      toast.error(msg, { duration: 6000 });
    } finally {
      clearInterval(loadingTimerRef.current);
      setLoading(false);
    }
  };

  const toggleDay = (dayNum) => {
    setCompletedDays(prev =>
      prev.includes(dayNum) ? prev.filter(d => d !== dayNum) : [...prev, dayNum]
    );
  };

  const downloadPDF = () => {
    if (!result) return;
    const printWindow = window.open('', '_blank');
    const role = result.role || targetRole || 'Software Developer';

    // Build timeline HTML based on schema type
    let timelineHtml = '';
    if (result.days?.length > 0) {
      timelineHtml = `
        <h2>📅 Day-by-Day Plan (${result.days.length} Days)</h2>
        ${result.days.map(d => `
          <div class="day-card">
            <div class="day-header">
              <span class="day-badge">Day ${d.dayNumber}</span>
              <strong>${d.theme}</strong>
            </div>
            <div class="day-section"><strong>📚 Learn:</strong> ${d.learning}</div>
            <div class="day-section"><strong>💪 Practice:</strong> ${d.practice}</div>
            <div class="day-section"><strong>🔨 Build:</strong> ${d.build}</div>
            <div class="day-checkpoint"><strong>✓ Checkpoint:</strong> ${d.checkpoint}</div>
          </div>
        `).join('')}
      `;
    } else if (result.weeks?.length > 0) {
      timelineHtml = `
        <h2>📅 Week-by-Week Plan (${result.weeks.length} Weeks)</h2>
        ${result.weeks.map((w, i) => `
          <div class="day-card">
            <div class="day-header"><span class="day-badge">Week ${i+1}</span><strong>${w.theme || w.week}</strong></div>
            <div class="day-section"><strong>Skills:</strong> ${w.skillsToLearn?.join(', ')}</div>
            <div class="day-section"><strong>Daily Tasks:</strong> ${w.dailyTasks?.join(' | ')}</div>
            <div class="day-section"><strong>Weekend Project:</strong> ${w.weekendProject || w.project}</div>
            <div class="day-checkpoint"><strong>✓ Checkpoint:</strong> ${w.checkpoint}</div>
          </div>
        `).join('')}
      `;
    } else if (result.months?.length > 0) {
      timelineHtml = `
        <h2>📅 Month-by-Month Plan</h2>
        ${result.months.map((m, i) => `
          <div class="day-card">
            <div class="day-header"><span class="day-badge">Month ${i+1}</span><strong>${m.theme}</strong></div>
            <div class="day-section"><strong>Goals:</strong> ${m.goals?.join(', ')}</div>
            <div class="day-section"><strong>Skills:</strong> ${m.skills?.join(', ')}</div>
            <div class="day-section"><strong>Weekly Focus:</strong> ${m.weeklyFocus?.join(' → ')}</div>
            <div class="day-checkpoint"><strong>✓ Milestone:</strong> ${m.milestone}</div>
          </div>
        `).join('')}
      `;
    }

    printWindow.document.write(`
      <!DOCTYPE html><html><head>
      <title>Career Roadmap - ${role}</title>
      <style>
        body{font-family:'Segoe UI',sans-serif;background:#fff;color:#1a1a2e;padding:32px;max-width:900px;margin:0 auto}
        h1{color:#6366f1;font-size:26px;margin-bottom:4px}
        h2{color:#4f46e5;font-size:16px;margin:24px 0 10px;border-bottom:2px solid #e0e7ff;padding-bottom:6px}
        .meta{color:#6b7280;font-size:12px;margin-bottom:20px}
        .goal{background:#f5f3ff;border-left:4px solid #6366f1;padding:12px 16px;border-radius:6px;margin:16px 0;font-weight:600;color:#4338ca}
        .day-card{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin:8px 0;page-break-inside:avoid}
        .day-header{display:flex;align-items:center;gap:10px;margin-bottom:8px}
        .day-badge{background:#6366f1;color:#fff;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;flex-shrink:0}
        .day-section{color:#374151;font-size:12px;margin:5px 0;padding:4px 0}
        .day-checkpoint{background:#ecfdf5;border-left:3px solid #10b981;padding:6px 10px;border-radius:4px;margin-top:8px;font-size:12px;color:#065f46}
        .project-card{background:#eff6ff;border:1px solid #bfdbfe;padding:12px;border-radius:8px;margin:8px 0}
        .outcome{background:#f0fdf4;border:1px solid #86efac;padding:14px;border-radius:8px;margin-top:20px;font-weight:700;color:#166534}
        @media print{body{padding:16px}.day-card{page-break-inside:avoid}}
      </style></head><body>
      <h1>🗺️ ${result.duration || duration + ' Days'} Career Roadmap</h1>
      <div class="meta">
        <strong>Target Role:</strong> ${role} &nbsp;|&nbsp;
        <strong>Skills:</strong> ${skills || 'Various'} &nbsp;|&nbsp;
        <strong>Generated:</strong> ${new Date().toLocaleDateString()}
      </div>
      <div class="goal">🎯 Goal: ${result.goal}</div>

      ${timelineHtml}

      ${result.projects?.length ? `
        <h2>🚀 Portfolio Projects</h2>
        ${result.projects.map(p => `
          <div class="project-card">
            <strong>${p.name}</strong> ${p.day ? `<em>— Due by Day ${p.day}</em>` : ''}<br>
            <span style="color:#4b5563;font-size:12px">${p.description}</span><br>
            <span style="color:#6366f1;font-size:11px">Skills: ${p.skills?.join(', ')}</span><br>
            <span style="color:#059669;font-size:11px">✓ Deliverable: ${p.deliverable}</span>
          </div>
        `).join('')}
      ` : ''}

      <div class="outcome">🏆 Final Outcome: ${result.finalOutcome}</div>
      <p style="margin-top:24px;color:#9ca3af;font-size:11px;text-align:center">Generated by CareerIQ AI Platform</p>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  // ── Detect schema type ──
  const isDayByDay = result?.days?.length > 0;
  const isWeekly = !isDayByDay && result?.weeks?.length > 0;
  const isMonthly = !isDayByDay && !isWeekly && result?.months?.length > 0;

  const progress = isDayByDay
    ? Math.round((completedDays.length / (result.days.length || 1)) * 100)
    : 0;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-green to-teal-500 flex items-center justify-center">
            <Target className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Career Roadmap Agent</h1>
            <p className="text-white/50 text-sm">AI generates a personalized day-by-day plan for your exact target role</p>
          </div>
        </motion.div>

        {/* Generate Form */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card p-6 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-white/50 font-medium mb-1.5 block">Target Role</label>
              <input value={targetRole} onChange={e => setTargetRole(e.target.value)}
                placeholder="e.g. Machine Learning Engineer" className="input-field" />
            </div>
            <div>
              <label className="text-sm text-white/50 font-medium mb-1.5 block">Current Skills</label>
              <input value={skills} onChange={e => setSkills(e.target.value)}
                placeholder="Python, SQL, JavaScript..." className="input-field" />
            </div>
          </div>

          {/* Duration Selector */}
          <div>
            <label className="text-sm text-white/50 font-medium mb-3 block">Roadmap Duration</label>
            <div className="grid grid-cols-5 gap-2">
              {DURATION_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setDuration(opt.value)}
                  className={`p-3 rounded-xl border text-center transition-all
                    ${duration === opt.value
                      ? 'border-primary-500/60 bg-primary-500/20 text-white'
                      : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:text-white'}`}>
                  <p className="font-bold text-sm">{opt.label}</p>
                  <p className="text-xs opacity-70 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <motion.button onClick={generate} disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.01 }} whileTap={{ scale: 0.99 }}
            className="btn-primary w-full flex items-center justify-center gap-2 min-h-[48px]">
            {loading
              ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" /><span className="text-sm animate-pulse">{loadingMsg}</span></>
              : <><Zap className="w-5 h-5" /> Generate My {duration}-Day AI Roadmap</>}
          </motion.button>
        </motion.div>

        <AnimatePresence>
          {result && (
            <motion.div ref={printRef} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

              {/* Header bar */}
              <div className="glass-card p-5 border border-primary-500/30">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <h2 className="text-white font-black text-xl">{result.role || targetRole}</h2>
                    <p className="text-white/50 text-sm">{result.duration} • AI-generated personalized plan</p>
                    <p className="text-primary-400 text-sm mt-1 font-medium">🎯 {result.goal}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={downloadPDF} className="btn-ghost flex items-center gap-2 text-sm">
                      <Download className="w-4 h-4" /> PDF
                    </button>
                  </div>
                </div>

                {/* Progress bar (day-by-day only) */}
                {isDayByDay && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-white/50 mb-1">
                      <span>{completedDays.length} / {result.days.length} days completed</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-green"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ── DAY-BY-DAY VIEW ── */}
              {isDayByDay && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-white font-bold text-lg flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary-400" /> {result.days.length}-Day Journey
                    </h2>
                    <div className="flex gap-2">
                      <button onClick={() => setViewMode('timeline')}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${viewMode === 'timeline' ? 'border-primary-500 bg-primary-500/20 text-white' : 'border-white/10 text-white/50'}`}>
                        Full Detail
                      </button>
                      <button onClick={() => setViewMode('compact')}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${viewMode === 'compact' ? 'border-primary-500 bg-primary-500/20 text-white' : 'border-white/10 text-white/50'}`}>
                        Compact
                      </button>
                    </div>
                  </div>

                  {viewMode === 'compact' ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {result.days.map((day, idx) => (
                        <motion.button key={idx} whileHover={{ scale: 1.02 }}
                          onClick={() => toggleDay(day.dayNumber)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            completedDays.includes(day.dayNumber)
                              ? 'bg-green-500/10 border-green-500/30'
                              : 'bg-white/5 border-white/10 hover:border-primary-500/30'
                          }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                              completedDays.includes(day.dayNumber) ? 'bg-green-500 text-white' : `bg-gradient-to-br ${dayColors[idx % dayColors.length]} text-white`
                            }`}>
                              {completedDays.includes(day.dayNumber) ? '✓' : day.dayNumber}
                            </span>
                            <span className={`text-xs font-semibold truncate ${completedDays.includes(day.dayNumber) ? 'text-green-400 line-through' : 'text-white'}`}>{day.theme}</span>
                          </div>
                          <p className="text-white/50 text-xs truncate">{day.learning}</p>
                        </motion.button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {result.days.map((day, idx) => (
                        <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(idx * 0.02, 0.5) }}>
                          <div
                            className={`glass-card overflow-hidden border transition-all cursor-pointer ${
                              completedDays.includes(day.dayNumber) ? 'border-green-500/30 bg-green-500/5' : 'border-white/8 hover:border-primary-500/30'
                            }`}>
                            {/* Day header */}
                            <div className="p-4 flex items-center gap-4" onClick={() => setExpandedDay(expandedDay === idx ? null : idx)}>
                              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${dayColors[idx % dayColors.length]} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                                <span className="text-white text-xs font-black">{day.dayNumber}</span>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className={`font-semibold text-sm ${completedDays.includes(day.dayNumber) ? 'text-green-400' : 'text-white'}`}>{day.theme}</span>
                                  {day.dayNumber % 7 === 0 && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent-yellow/20 text-accent-yellow border border-accent-yellow/30">🏆 Project Day</span>
                                  )}
                                </div>
                                <p className="text-white/50 text-xs">{day.learning}</p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  onClick={e => { e.stopPropagation(); toggleDay(day.dayNumber); }}
                                  className={`text-xs px-3 py-1 rounded-lg border transition-all ${
                                    completedDays.includes(day.dayNumber)
                                      ? 'border-green-500/40 bg-green-500/20 text-green-400'
                                      : 'border-white/10 text-white/50 hover:border-green-500/30 hover:text-green-400'
                                  }`}>
                                  {completedDays.includes(day.dayNumber) ? '✓ Done' : 'Mark Done'}
                                </button>
                                <span className="text-white/40 text-xs">{expandedDay === idx ? '▲' : '▼'}</span>
                              </div>
                            </div>

                            {/* Expanded content */}
                            <AnimatePresence>
                              {expandedDay === idx && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden border-t border-white/8">
                                  <div className="p-4 grid sm:grid-cols-2 gap-3">
                                    <div className="bg-cyan-neon/10 border border-cyan-neon/20 p-3 rounded-xl">
                                      <div className="flex items-center gap-2 mb-2">
                                        <BookOpen className="w-4 h-4 text-cyan-neon" />
                                        <span className="text-cyan-neon text-xs font-bold uppercase tracking-wider">Learn</span>
                                      </div>
                                      <p className="text-white/70 text-sm">{day.learning}</p>
                                    </div>
                                    <div className="bg-purple-500/10 border border-purple-500/20 p-3 rounded-xl">
                                      <div className="flex items-center gap-2 mb-2">
                                        <BarChart3 className="w-4 h-4 text-purple-400" />
                                        <span className="text-purple-400 text-xs font-bold uppercase tracking-wider">Practice</span>
                                      </div>
                                      <p className="text-white/70 text-sm">{day.practice}</p>
                                    </div>
                                    <div className="bg-pink-neon/10 border border-pink-neon/20 p-3 rounded-xl">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Hammer className="w-4 h-4 text-pink-neon" />
                                        <span className="text-pink-neon text-xs font-bold uppercase tracking-wider">Build</span>
                                      </div>
                                      <p className="text-white/70 text-sm">{day.build}</p>
                                    </div>
                                    <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-xl">
                                      <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle className="w-4 h-4 text-green-400" />
                                        <span className="text-green-400 text-xs font-bold uppercase tracking-wider">Checkpoint</span>
                                      </div>
                                      <p className="text-white/70 text-sm">{day.checkpoint}</p>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── WEEKLY VIEW ── */}
              {isWeekly && (
                <div className="space-y-4">
                  <h2 className="text-white font-bold text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary-400" /> {result.weeks.length}-Week Plan
                  </h2>
                  {result.weeks.map((w, idx) => (
                    <motion.div key={idx} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.08 }} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${dayColors[idx % dayColors.length]} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                          <span className="text-white text-xs font-black">{idx + 1}</span>
                        </div>
                        {idx < result.weeks.length - 1 && <div className="w-0.5 h-full mt-2 bg-white/10 min-h-8" />}
                      </div>
                      <div className="flex-1 glass-card p-5 mb-2">
                        <div className="flex items-center justify-between mb-3">
                          <span className={`text-sm font-bold bg-gradient-to-r ${dayColors[idx % dayColors.length]} bg-clip-text text-transparent`}>{w.week}</span>
                          <span className="text-xs text-white/50 bg-white/5 px-2 py-0.5 rounded-lg">{w.theme}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-3">
                          {w.skillsToLearn?.map((s, i) => (
                            <span key={i} className="text-xs bg-primary-500/20 text-primary-300 px-2 py-0.5 rounded">{s}</span>
                          ))}
                        </div>
                        <div className="space-y-1.5 mb-3">
                          {w.dailyTasks?.map((t, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-white/50">
                              <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/50 flex-shrink-0">{i+1}</span>
                              {t}
                            </div>
                          ))}
                        </div>
                        <div className="bg-pink-neon/10 border border-pink-neon/20 p-2 rounded-lg">
                          <p className="text-xs text-pink-neon font-medium">🔨 Weekend Project: {w.weekendProject || w.project}</p>
                        </div>
                        <div className="bg-green-500/10 border border-green-500/20 p-2 rounded-lg mt-2">
                          <p className="text-xs text-green-400 font-medium">✓ Checkpoint: {w.checkpoint}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* ── MONTHLY VIEW ── */}
              {isMonthly && (
                <div className="space-y-4">
                  <h2 className="text-white font-bold text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary-400" /> {result.months.length}-Month Career Plan
                  </h2>
                  {result.months.map((m, idx) => (
                    <motion.div key={idx} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }} className="glass-card p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${dayColors[idx % dayColors.length]} flex items-center justify-center flex-shrink-0`}>
                          <span className="text-white text-xs font-black">{idx + 1}</span>
                        </div>
                        <div>
                          <span className={`font-bold bg-gradient-to-r ${dayColors[idx % dayColors.length]} bg-clip-text text-transparent`}>{m.month}</span>
                          <p className="text-white/50 text-xs">{m.theme}</p>
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3 mb-3">
                        <div className="bg-white/5 p-3 rounded-xl">
                          <p className="text-xs text-white/50 mb-1 font-medium">Skills</p>
                          <div className="flex flex-wrap gap-1">{m.skills?.map((s, i) => <span key={i} className="text-xs bg-primary-500/20 text-primary-300 px-2 py-0.5 rounded">{s}</span>)}</div>
                        </div>
                        <div className="bg-white/5 p-3 rounded-xl">
                          <p className="text-xs text-white/50 mb-1 font-medium">Weekly Focus</p>
                          <div className="space-y-1">{m.weeklyFocus?.map((wf, i) => <p key={i} className="text-xs text-white/50">{wf}</p>)}</div>
                        </div>
                      </div>
                      <div className="bg-pink-neon/10 border border-pink-neon/20 p-2 rounded-lg mb-2">
                        <p className="text-xs text-pink-neon font-medium">🔨 Project: {m.project}</p>
                      </div>
                      <div className="bg-green-500/10 border border-green-500/20 p-2 rounded-lg">
                        <p className="text-xs text-green-400 font-medium">✓ Milestone: {m.milestone}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* ── PORTFOLIO PROJECTS ── */}
              {result.projects?.length > 0 && (
                <div className="glass-card p-6">
                  <h2 className="text-white font-bold mb-4 flex items-center gap-2">
                    <Code className="w-5 h-5 text-accent-cyan" /> Portfolio Projects
                  </h2>
                  <div className="grid sm:grid-cols-3 gap-4">
                    {result.projects.map((p, i) => (
                      <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/8 hover:border-accent-cyan/30 transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-semibold text-sm">{p.name}</span>
                          {p.day && <span className="text-xs text-white/50">Day {p.day}</span>}
                        </div>
                        <p className="text-white/50 text-xs mb-3">{p.description}</p>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {p.skills?.map((s, si) => (
                            <span key={si} className="text-xs bg-accent-cyan/10 text-accent-cyan px-1.5 py-0.5 rounded">{s}</span>
                          ))}
                        </div>
                        <div className="bg-green-500/10 border border-green-500/20 px-2 py-1.5 rounded-lg">
                          <p className="text-xs text-green-400">✓ {p.deliverable}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── FINAL OUTCOME ── */}
              <div className="glass-card p-5 border border-accent-green/30 bg-accent-green/5">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-accent-green flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-bold text-sm mb-1">Final Outcome</p>
                    <p className="text-white/70 text-sm">{result.finalOutcome}</p>
                  </div>
                </div>
              </div>

              {/* ── NEXT STEPS GUIDE ── */}
              <div className="glass-card p-6 border border-primary-500/20">
                <h2 className="text-white font-bold mb-2 flex items-center gap-2">
                  <ArrowRight className="w-5 h-5 text-primary-400" /> Follow These Steps Next
                </h2>
                <p className="text-white/50 text-sm mb-4">Your roadmap is ready. Complete each step below to maximize your chances of getting hired.</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {NEXT_STEPS.map((step) => (
                    <Link key={step.path} to={step.path}>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/8 hover:border-primary-500/30 transition-all cursor-pointer group">
                        <div className={`w-9 h-9 rounded-xl ${step.color} flex items-center justify-center flex-shrink-0`}>
                          <step.icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold">{step.label}</p>
                          <p className="text-white/50 text-xs truncate">{step.desc}</p>
                        </div>
                      </motion.div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button onClick={generate} disabled={loading} className="btn-ghost flex-1 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4" /> Regenerate
                </button>
                <button onClick={async () => {
                  try {
                    const toastId = toast.loading('Saving to dashboard...');
                    await api.post('/career/roadmap/save', { roadmapData: result });
                    toast.success('Roadmap saved to dashboard! Today\'s tasks are ready. 🚀', { id: toastId });
                    setTimeout(() => window.location.href = '/dashboard', 1200);
                  } catch { toast.error('Failed to save to dashboard'); }
                }}
                  className="btn-primary flex-[1.5] flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/20">
                  <CheckCircle className="w-5 h-5" /> Add Roadmap to Dashboard
                </button>
                <button onClick={downloadPDF} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" /> Download PDF
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
