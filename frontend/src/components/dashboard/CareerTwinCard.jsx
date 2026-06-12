import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Zap, CheckCircle, ArrowRight, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

export default function CareerTwinCard() {
  const [twin, setTwin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/career/twin')
      .then(res => setTwin(res.data.report))
      .catch(err => console.error("Failed to load Career Twin", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="glass-card p-5 h-64 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Finding your Career Twin...</p>
      </div>
    );
  }

  if (!twin) {
    return (
      <div className="glass-card p-5">
        <p className="text-slate-400">Please complete your profile to see your Career Twin.</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} 
      className="glass-card p-5 relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-primary-500/20 transition-all duration-500" />
      
      <div className="flex items-center justify-between mb-4 relative z-10">
        <h3 className="text-white font-bold flex items-center gap-2">
          <Users className="w-5 h-5 text-accent-purple" /> Career Twin
        </h3>
        <span className="text-xs bg-accent-purple/20 text-accent-purple border border-accent-purple/30 px-2 py-0.5 rounded-full flex items-center gap-1">
          <Zap className="w-3 h-3" /> AI Matched
        </span>
      </div>

      <div className="flex items-start gap-4 mb-5 relative z-10">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border-2 border-primary-500/40 flex items-center justify-center flex-shrink-0">
           <UserCheck className="w-6 h-6 text-primary-400" />
        </div>
        <div>
          <p className="text-white font-semibold">{twin.similarProfile || 'Successful Professional'}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-2 bg-white/10 rounded-full w-24">
              <div className="h-full bg-gradient-to-r from-accent-purple to-primary-500 rounded-full" style={{ width: `${twin.similarityScore || 0}%` }} />
            </div>
            <span className="text-primary-400 text-xs font-bold">{twin.similarityScore || 0}% Match</span>
          </div>
        </div>
      </div>

      <div className="space-y-4 relative z-10">
        <div>
          <p className="text-slate-300 text-xs font-semibold mb-2">Missing Skills to Match:</p>
          <div className="flex flex-wrap gap-2">
            {(twin.missingSkills || []).map((skill, i) => (
              <span key={i} className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded-md">
                {skill}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="text-slate-300 text-xs font-semibold mb-2">Their Successful Path:</p>
          <ul className="space-y-2 text-xs text-slate-400">
             {(twin.successfulPath || []).map((step, i) => (
               <li key={i} className="flex items-start gap-2">
                 <CheckCircle className="w-3.5 h-3.5 text-accent-green flex-shrink-0 mt-0.5" />
                 <span><strong className="text-slate-300">Step {step.step}:</strong> {step.description}</span>
               </li>
             ))}
          </ul>
        </div>
        
        <div>
          <p className="text-slate-300 text-xs font-semibold mb-2">Your Next Actions:</p>
          <ul className="space-y-2 text-xs text-slate-400">
             {(twin.nextActions || []).map((action, i) => (
               <li key={i} className="flex items-start gap-2">
                 <ArrowRight className="w-3.5 h-3.5 text-primary-400 flex-shrink-0 mt-0.5" />
                 <span>{action}</span>
               </li>
             ))}
          </ul>
        </div>
        
        <Link to="/roadmap" className="inline-flex items-center gap-1 text-primary-400 text-xs hover:text-primary-300 font-medium pt-2 group-hover:translate-x-1 transition-transform">
          Add missing skills to Roadmap <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </motion.div>
  );
}
