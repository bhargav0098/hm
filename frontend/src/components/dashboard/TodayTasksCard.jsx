import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ListTodo, CheckCircle, Circle, BookOpen, Hammer, BarChart3, Flag, ArrowRight, Zap, SkipForward, MessageSquare, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

const TYPE_ICONS = {
  learning: { icon: BookOpen, color: 'text-cyan-neon', bg: 'bg-cyan-neon/10', label: 'Learn' },
  practice: { icon: BarChart3, color: 'text-primary-500', bg: 'bg-purple-500/10', label: 'Practice' },
  build: { icon: Hammer, color: 'text-pink-neon', bg: 'bg-pink-neon/10', label: 'Build' },
  checkpoint: { icon: Flag, color: 'text-green-700', bg: 'bg-green-500/10', label: 'Check' },
  general: { icon: ListTodo, color: 'text-primary-500', bg: 'bg-primary-500/10', label: 'Task' },
};

const DIFFICULTY_COLORS = {
  easy: 'text-green-700 bg-green-500/10',
  medium: 'text-pink-neon bg-pink-neon/10',
  hard: 'text-red-600 bg-red-500/10',
};

export default function TodayTasksCard() {
  const [tasks, setTasks] = useState([]);
  const [meta, setMeta] = useState({ currentDay: 1, totalDays: null, targetRole: null });
  const [loading, setLoading] = useState(true);
  const [feedbackModal, setFeedbackModal] = useState(null); // task id or null
  const [coachMsg, setCoachMsg] = useState(null);

  const fetchTasks = () => {
    setLoading(true);
    api.get('/career/daily-tasks')
      .then(res => {
        setTasks(res.data.tasks || []);
        setMeta({
          currentDay: res.data.currentDay || 1,
          totalDays: res.data.totalDays || null,
          targetRole: res.data.targetRole || null,
        });
      })
      .catch(err => console.error('Failed to load daily tasks', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTasks(); }, []);

  const handleComplete = async (taskId, feedback) => {
    try {
      const { data } = await api.post(`/career/tasks/${taskId}/complete`, { feedback });
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, completed: true, status: 'completed', feedback } : t));
      setFeedbackModal(null);
      if (data.coachMessage) setCoachMsg(data.coachMessage);
      toast.success(`+${data.xpEarned || 50} XP earned! ⚡`);
    } catch {
      toast.error('Failed to complete task.');
    }
  };

  const handleSkip = async (taskId) => {
    try {
      await api.post(`/career/tasks/${taskId}/skip`);
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: 'skipped' } : t));
      toast('Task skipped.', { icon: '⏭️' });
    } catch {
      toast.error('Failed to skip task.');
    }
  };

  const completed = tasks.filter(t => t.completed || t.status === 'completed').length;
  const total = tasks.length || 1;
  const progress = Math.round((completed / total) * 100);

  if (loading) return (
    <div className="glass-card p-5 h-64 flex flex-col items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mb-4" />
      <p className="text-ink/70 text-sm">Loading today's mission...</p>
    </div>
  );

  const pendingTask = feedbackModal ? tasks.find(t => t._id === feedbackModal) : null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-5">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-ink font-bold flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-primary-500" /> Today's Mission
          </h3>
          {meta.targetRole && (
            <p className="text-xs text-ink/70 mt-0.5">
              {meta.targetRole}
              {meta.totalDays && <span className="ml-2 text-primary-500">Day {meta.currentDay}/{meta.totalDays}</span>}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-primary-500 bg-primary-500/10 px-2 py-1 rounded-lg">
            {completed}/{tasks.length} done
          </span>
        </div>
      </div>

      {tasks.length > 0 ? (
        <>
          {/* Progress bar */}
          <div className="w-full h-2 bg-primary-100 rounded-full overflow-hidden mb-4">
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-cyan"
            />
          </div>
          {progress === 100 && (
            <div className="text-center text-xs text-accent-green font-bold mb-3">🎉 All tasks complete! Great work today!</div>
          )}

          {/* Task list */}
          <div className="space-y-2 mb-4">
            {tasks.map((task) => {
              const typeInfo = TYPE_ICONS[task.type] || TYPE_ICONS.general;
              const TypeIcon = typeInfo.icon;
              const isDone = task.completed || task.status === 'completed';
              const isSkipped = task.status === 'skipped';

              return (
                <motion.div key={task._id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  className={`rounded-xl border transition-all ${
                    isDone ? 'bg-green-500/5 border-green-500/20' :
                    isSkipped ? 'bg-white/50 border-primary-300/30 opacity-50' :
                    'bg-white/70 border-primary-300/40 hover:border-primary-500/30'
                  }`}>
                  <div className="flex items-center gap-3 p-3">
                    {/* Type icon */}
                    <div className={`w-8 h-8 rounded-lg ${typeInfo.bg} flex items-center justify-center flex-shrink-0`}>
                      {isDone ? <CheckCircle className="w-4 h-4 text-accent-green" /> :
                       isSkipped ? <SkipForward className="w-4 h-4 text-ink/70" /> :
                       <TypeIcon className={`w-4 h-4 ${typeInfo.color}`} />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isDone ? 'text-ink/70 line-through' : isSkipped ? 'text-ink/60' : 'text-ink'}`}>
                        {task.title}
                      </p>
                      {task.description && !isDone && (
                        <p className="text-ink/70 text-xs truncate mt-0.5">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${DIFFICULTY_COLORS[task.difficulty] || ''}`}>{task.difficulty}</span>
                        <span className="text-xs text-ink/60">{task.durationStr}</span>
                        <span className="text-xs text-primary-500">+{task.xpReward} XP</span>
                      </div>
                    </div>

                    {/* Actions */}
                    {!isDone && !isSkipped && (
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => setFeedbackModal(task._id)}
                          className="text-xs px-2 py-1 bg-primary-500/20 hover:bg-primary-500/40 text-primary-600 rounded-lg transition-all">
                          Done
                        </button>
                        <button onClick={() => handleSkip(task._id)}
                          className="text-xs px-2 py-1 bg-white/70 hover:bg-primary-100 text-ink/70 rounded-lg transition-all">
                          Skip
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="text-center py-4">
          <p className="text-ink/70 text-sm mb-3">No AI tasks yet. Generate a roadmap to activate your daily plan!</p>
          <div className="flex gap-2 justify-center">
            <Link to="/skills" className="btn-primary text-xs py-1.5 px-3 rounded-lg flex-1">Analyze Skills</Link>
            <Link to="/roadmap" className="btn-secondary text-xs py-1.5 px-3 rounded-lg flex-1 bg-white/70 hover:bg-primary-100 text-ink border border-primary-300/40">Get Roadmap</Link>
          </div>
        </div>
      )}

      {/* Coach message */}
      <AnimatePresence>
        {coachMsg && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-3 p-3 bg-accent-cyan/10 border border-accent-cyan/20 rounded-xl flex items-start gap-2">
            <Zap className="w-4 h-4 text-accent-cyan flex-shrink-0 mt-0.5" />
            <p className="text-xs text-ink/70 flex-1">{coachMsg}</p>
            <button onClick={() => setCoachMsg(null)}><X className="w-3 h-3 text-ink/70" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {tasks.length > 0 && (
        <Link to="/roadmap" className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600 transition-colors mt-2">
          View Full Roadmap <ArrowRight className="w-3 h-3" />
        </Link>
      )}

      {/* Feedback Modal */}
      <AnimatePresence>
        {feedbackModal && pendingTask && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/60 flex items-center justify-center z-50 p-4"
            onClick={() => setFeedbackModal(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-ink font-bold flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary-500" /> How was this task?
                </h3>
                <button onClick={() => setFeedbackModal(null)}><X className="w-4 h-4 text-ink/70" /></button>
              </div>
              <p className="text-ink/70 text-xs mb-4 truncate">{pendingTask.title}</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'easy', label: '😄 Easy', color: 'border-green-500/40 hover:bg-green-500/20 text-green-700' },
                  { key: 'normal', label: '😊 Normal', color: 'border-cyan-neon/40 hover:bg-cyan-neon/20 text-cyan-neon' },
                  { key: 'difficult', label: '😅 Difficult', color: 'border-red-500/40 hover:bg-red-500/20 text-red-600' },
                ].map(f => (
                  <button key={f.key} onClick={() => handleComplete(feedbackModal, f.key)}
                    className={`p-3 rounded-xl border text-center text-sm font-medium transition-all ${f.color}`}>
                    {f.label}
                  </button>
                ))}
              </div>
              <button onClick={() => handleComplete(feedbackModal, null)}
                className="w-full mt-3 text-xs text-ink/70 hover:text-white/50 transition-colors">
                Skip feedback &amp; mark done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
