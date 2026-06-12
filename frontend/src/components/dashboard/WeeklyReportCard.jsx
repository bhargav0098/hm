import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, TrendingUp, TrendingDown, Star, Activity, Award, ChevronDown, ChevronUp, RefreshCw, Zap } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function WeeklyReportCard() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReport = (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);

    api.get('/career/weekly-report')
      .then(res => setReport(res.data.report))
      .catch(err => {
        console.error('Failed to load weekly report', err);
      })
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => { fetchReport(); }, []);

  if (loading) return (
    <div className="glass-card p-5 h-48 flex flex-col items-center justify-center">
      <div className="w-8 h-8 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin mb-3" />
      <p className="text-slate-400 text-sm">Generating AI Weekly Report...</p>
    </div>
  );

  if (!report) return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white font-bold flex items-center gap-2 text-sm">
          <FileText className="w-4 h-4 text-accent-blue" /> Weekly AI Report
        </h3>
      </div>
      <p className="text-slate-400 text-xs">Complete some daily tasks to generate your first weekly AI coaching report.</p>
    </div>
  );

  const taskRate = report.taskRate ?? 0;
  const xpEarned = report.xpEarned ?? 0;
  const weekLabel = report.weekNumber ? `Week ${report.weekNumber}` : 'This Week';
  const rateColor = taskRate >= 80 ? 'text-accent-green' : taskRate >= 50 ? 'text-accent-yellow' : 'text-red-400';
  const rateBg = taskRate >= 80 ? 'bg-accent-green/10 border-accent-green/20' : taskRate >= 50 ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-red-500/10 border-red-500/20';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
      className="glass-card p-5 border border-accent-blue/15"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold flex items-center gap-2 text-sm">
          <FileText className="w-4 h-4 text-accent-blue" /> AI Weekly Report
          <span className="text-xs text-slate-500 font-normal bg-white/5 px-2 py-0.5 rounded-lg">{weekLabel}</span>
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchReport(true)} disabled={refreshing}
            className="text-slate-500 hover:text-white transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setExpanded(e => !e)} className="text-slate-500 hover:text-white transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Coach Message */}
      <div className="bg-gradient-to-r from-accent-blue/10 to-primary-500/10 border border-accent-blue/20 rounded-xl p-3 mb-4">
        <p className="text-slate-200 text-xs leading-relaxed italic">"{report.summaryMessage}"</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className={`rounded-xl border p-3 text-center ${rateBg}`}>
          <Activity className={`w-4 h-4 mx-auto mb-1 ${rateColor}`} />
          <p className={`text-lg font-black ${rateColor}`}>{taskRate}%</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Task Rate</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <Zap className="w-4 h-4 text-accent-yellow mx-auto mb-1" />
          <p className="text-lg font-black text-white">+{xpEarned}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">XP Earned</p>
        </div>
      </div>

      {/* Highlights (always visible) */}
      {report.completedHighlights?.length > 0 && (
        <div className="mb-3">
          <p className="text-slate-400 text-xs font-semibold mb-1.5 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-accent-green" /> Highlights
          </p>
          <div className="space-y-1">
            {report.completedHighlights.map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                <span className="text-accent-green mt-0.5 flex-shrink-0">✓</span> {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Week Preview */}
      {!expanded && report.nextWeekPlan?.length > 0 && (
        <div className="pt-2 border-t border-white/8">
          <p className="text-slate-400 text-xs font-semibold mb-1 flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-accent-yellow" /> Next Up
          </p>
          <p className="text-xs text-primary-400">→ {report.nextWeekPlan[0]}</p>
        </div>
      )}

      {/* Expandable Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <div className="space-y-3 pt-3 border-t border-white/8 mt-1">

              {/* Missed Goals */}
              {report.missedGoals?.filter(g => g && g !== 'Keep up the momentum').length > 0 && (
                <div>
                  <p className="text-slate-400 text-xs font-semibold mb-1.5 flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5 text-red-400" /> Areas to Improve
                  </p>
                  {report.missedGoals.map((item, i) => (
                    <div key={i} className="text-xs text-slate-400 flex items-start gap-2">
                      <span className="text-red-400 flex-shrink-0">→</span> {item}
                    </div>
                  ))}
                </div>
              )}

              {/* Improvement Area */}
              {report.improvementArea && (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-2.5">
                  <p className="text-xs text-orange-400 font-medium">💡 Focus Area</p>
                  <p className="text-xs text-slate-300 mt-0.5">{report.improvementArea}</p>
                </div>
              )}

              {/* Next Week Full Plan */}
              {report.nextWeekPlan?.length > 0 && (
                <div>
                  <p className="text-slate-400 text-xs font-semibold mb-1.5 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-accent-yellow" /> Next Week Plan
                  </p>
                  <ul className="space-y-1">
                    {report.nextWeekPlan.map((item, i) => (
                      <li key={i} className="text-xs text-primary-400 flex items-start gap-2">
                        <span className="font-bold flex-shrink-0">{i + 1}.</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Show more toggle */}
      <button onClick={() => setExpanded(e => !e)}
        className="w-full mt-3 text-xs text-slate-600 hover:text-slate-400 transition-colors flex items-center justify-center gap-1">
        {expanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Full report</>}
      </button>
    </motion.div>
  );
}
