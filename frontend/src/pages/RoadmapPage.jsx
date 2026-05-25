import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Zap, CheckCircle, Calendar, Clock, Lightbulb, Star, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/layout/DashboardLayout';
import api from '../services/api';

const weekKeys = ['week1_2', 'week3_4', 'month2', 'month3'];
const weekLabels = { week1_2: 'Week 1-2', week3_4: 'Week 3-4', month2: 'Month 2', month3: 'Month 3' };
const weekColors = ['from-primary-500 to-accent-purple', 'from-accent-cyan to-accent-blue', 'from-accent-green to-teal-500', 'from-accent-yellow to-orange-500'];

export default function RoadmapPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [targetRole, setTargetRole] = useState('');
  const [skills, setSkills] = useState('');
  const [completedMilestones, setCompletedMilestones] = useState([]);

  useEffect(() => {
    api.get('/career/skills/profile').then(r => {
      if (r.data.profile) {
        setTargetRole(r.data.profile.targetRole || '');
        setSkills(r.data.profile.currentSkills?.map(s => s.name).join(', ') || '');
      }
    }).catch(() => {});
  }, []);

  const generate = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/career/roadmap', {
        skills: skills.split(',').map(s => s.trim()).filter(Boolean),
        targetRole
      });
      setResult(data.result);
      setCompletedMilestones([]);
      toast.success('90-day roadmap generated! 🗺️');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Generation failed');
    } finally { setLoading(false); }
  };

  const toggleMilestone = (day) => {
    setCompletedMilestones(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

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
            <p className="text-slate-400 text-sm">Your personalized 90-day action plan to get hired</p>
          </div>
        </motion.div>

        {/* Generate Form */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card p-6">
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-slate-300 font-medium mb-1.5 block">Target Role</label>
              <input value={targetRole} onChange={e => setTargetRole(e.target.value)}
                placeholder="e.g. Full Stack Developer" className="input-field" />
            </div>
            <div>
              <label className="text-sm text-slate-300 font-medium mb-1.5 block">Current Skills</label>
              <input value={skills} onChange={e => setSkills(e.target.value)}
                placeholder="HTML, CSS, JavaScript..." className="input-field" />
            </div>
          </div>
          <motion.button onClick={generate} disabled={loading}
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            className="btn-primary w-full flex items-center justify-center gap-2">
            {loading
              ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating your roadmap...</>
              : <><Zap className="w-5 h-5" /> Generate My 90-Day Plan</>}
          </motion.button>
        </motion.div>

        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

              {/* Motivational Tip */}
              <div className="glass-card p-5 border border-accent-yellow/30 bg-accent-yellow/5">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-accent-yellow flex-shrink-0 mt-0.5" />
                  <p className="text-slate-200 text-sm leading-relaxed italic">"{result.motivationalTip}"</p>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-4">
                <h2 className="text-white font-bold text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary-400" /> 90-Day Timeline
                </h2>
                {weekKeys.map((key, idx) => {
                  const phase = result.roadmap?.[key];
                  if (!phase) return null;
                  return (
                    <motion.div key={key} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }} className="flex gap-4">
                      {/* Timeline indicator */}
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${weekColors[idx]} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                          <span className="text-white text-xs font-bold">{idx + 1}</span>
                        </div>
                        {idx < weekKeys.length - 1 && (
                          <div className="w-0.5 h-full mt-2 bg-white/10 min-h-8" />
                        )}
                      </div>
                      <div className="flex-1 glass-card p-5 mb-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-bold bg-gradient-to-r ${weekColors[idx]} bg-clip-text text-transparent`}>
                            {weekLabels[key]}
                          </span>
                          <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-lg">{phase.focus}</span>
                        </div>
                        <p className="text-slate-300 text-sm font-medium mb-3">🎯 Goal: {phase.goal}</p>
                        <div className="space-y-2">
                          {phase.tasks?.map((task, i) => (
                            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                              <CheckCircle className="w-4 h-4 text-slate-600 flex-shrink-0" />
                              <span className="text-slate-300 text-sm">{task}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Daily Routine */}
              {result.dailyRoutine?.length > 0 && (
                <div className="glass-card p-6">
                  <h2 className="text-white font-bold mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-accent-cyan" /> Recommended Daily Routine
                  </h2>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {result.dailyRoutine.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/8">
                        <span className="w-7 h-7 rounded-full bg-primary-500/20 text-primary-400 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                        <span className="text-slate-300 text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Milestones */}
              {result.milestones?.length > 0 && (
                <div className="glass-card p-6">
                  <h2 className="text-white font-bold mb-4 flex items-center gap-2">
                    <Star className="w-5 h-5 text-accent-yellow" /> Key Milestones
                  </h2>
                  <div className="space-y-3">
                    {result.milestones.map((m, i) => (
                      <motion.div key={i}
                        whileHover={{ scale: 1.01 }}
                        onClick={() => toggleMilestone(m.day)}
                        className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all
                          ${completedMilestones.includes(m.day)
                            ? 'bg-green-500/10 border-green-500/30'
                            : 'bg-white/5 border-white/8 hover:border-white/20'}`}>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
                          ${completedMilestones.includes(m.day) ? 'bg-green-500/20' : 'bg-white/5'}`}>
                          {completedMilestones.includes(m.day)
                            ? <CheckCircle className="w-6 h-6 text-green-400" />
                            : <span className="text-white font-black text-sm">D{m.day}</span>}
                        </div>
                        <div className="flex-1">
                          <p className={`font-semibold text-sm ${completedMilestones.includes(m.day) ? 'text-green-400 line-through' : 'text-white'}`}>
                            {m.milestone}
                          </p>
                          <p className="text-slate-500 text-xs">Day {m.day} target</p>
                        </div>
                        <span className="text-slate-600 text-xs">{completedMilestones.includes(m.day) ? '✓ Done' : 'Tap to complete'}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={generate} disabled={loading}
                className="btn-ghost w-full flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" /> Regenerate Roadmap
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
