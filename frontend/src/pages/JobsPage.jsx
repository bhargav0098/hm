import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Zap, MapPin, Clock, ExternalLink, BookmarkPlus, Filter, Star, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/layout/DashboardLayout';
import api from '../services/api';

const typeColors = {
  'full-time': 'text-green-400 bg-green-500/10 border-green-500/30',
  'internship': 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  'freelance': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  'remote': 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  'part-time': 'text-orange-400 bg-orange-500/10 border-orange-500/30'
};

const JobCard = ({ job, onSave, isSaved }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
    className="glass-card p-5 hover:border-primary-500/30 transition-all"
  >
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-bold truncate">{job.title}</h3>
        <p className="text-slate-400 text-sm">{job.company}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black
          ${job.matchScore >= 80 ? 'bg-green-500/20 text-green-400' : job.matchScore >= 60 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
          {job.matchScore}%
        </div>
      </div>
    </div>

    <div className="flex flex-wrap gap-2 mb-3">
      <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${typeColors[job.type] || typeColors['full-time']}`}>
        {job.type}
      </span>
      <span className="flex items-center gap-1 text-xs text-slate-400">
        <MapPin className="w-3 h-3" /> {job.location}
      </span>
      {job.salaryRange && (
        <span className="text-xs text-accent-green font-medium">💰 {job.salaryRange}</span>
      )}
      <span className="text-xs text-slate-500">{job.source}</span>
    </div>

    <p className="text-slate-400 text-xs mb-3 line-clamp-2">{job.description}</p>

    {/* Skills */}
    {job.requiredSkills?.length > 0 && (
      <div className="flex flex-wrap gap-1 mb-3">
        {job.requiredSkills.map(s => (
          <span key={s} className={`text-xs px-2 py-0.5 rounded ${job.missingSkills?.includes(s) ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
            {job.missingSkills?.includes(s) ? '✗' : '✓'} {s}
          </span>
        ))}
      </div>
    )}

    <div className="flex gap-2">
      <a href={job.applyUrl || '#'} target="_blank" rel="noopener noreferrer"
        className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm py-2">
        Apply Now <ExternalLink className="w-3 h-3" />
      </a>
      <button onClick={() => onSave(job, 'saved')}
        className={`btn-ghost py-2 px-3 flex items-center gap-1 text-sm ${isSaved ? 'text-yellow-400 border-yellow-400/40' : ''}`}>
        <BookmarkPlus className="w-4 h-4" />
      </button>
    </div>
  </motion.div>
);

const InternshipCard = ({ item, onSave }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
    className="glass-card p-5 border-l-4 border-accent-blue/60"
  >
    <div className="flex justify-between items-start mb-2">
      <h3 className="text-white font-bold">{item.title}</h3>
      <span className="text-accent-blue font-bold text-sm">{item.matchScore}% match</span>
    </div>
    <p className="text-slate-400 text-sm mb-1">{item.company}</p>
    <div className="flex flex-wrap gap-3 text-xs text-slate-400 mb-3">
      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {item.duration}</span>
      <span><MapPin className="w-3 h-3 inline mr-1" />{item.location}</span>
      {item.stipend && <span className="text-accent-green font-medium">💰 {item.stipend}</span>}
    </div>
    <div className="flex flex-wrap gap-1">
      {item.skills?.map(s => (
        <span key={s} className="text-xs bg-accent-blue/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">{s}</span>
      ))}
    </div>
  </motion.div>
);

export default function JobsPage() {
  const [skills, setSkills] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [location, setLocation] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('fresher');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [savedJobs, setSavedJobs] = useState([]);
  const [activeTab, setActiveTab] = useState('jobs');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.get('/career/jobs').then(r => {
      setSavedJobs(r.data.jobs?.map(j => j.jobTitle + j.company) || []);
    }).catch(() => {});

    // Load skill profile
    api.get('/career/skills/profile').then(r => {
      if (r.data.profile) {
        setTargetRole(r.data.profile.targetRole || '');
        setSkills(r.data.profile.currentSkills?.map(s => s.name).join(', ') || '');
        setExperienceLevel(r.data.profile.experienceLevel || 'fresher');
      }
    }).catch(() => {});
  }, []);

  const handleMatch = async () => {
    const skillList = skills.split(',').map(s => s.trim()).filter(Boolean);
    if (!skillList.length) return toast.error('Enter at least one skill');
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post('/career/jobs/match', {
        skills: skillList, targetRole, location, experienceLevel
      });
      setResult(data.result);
      toast.success(`Found ${data.result.jobMatches?.length || 0} job matches! 🎯`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Matching failed');
    } finally { setLoading(false); }
  };

  const handleSave = async (job, status) => {
    try {
      await api.post('/career/jobs/save', {
        jobTitle: job.title, company: job.company, location: job.location,
        jobType: job.type, status, salaryRange: job.salaryRange,
        matchScore: job.matchScore, jobUrl: job.applyUrl, source: job.source
      });
      setSavedJobs(prev => [...prev, job.title + job.company]);
      toast.success('Job saved!');
    } catch { toast.error('Save failed'); }
  };

  const filteredJobs = result?.jobMatches?.filter(j => filter === 'all' || j.type === filter) || [];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center">
            <Briefcase className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Job Matching Agent</h1>
            <p className="text-slate-400 text-sm">AI-powered job matching for your skills and goals</p>
          </div>
        </motion.div>

        {/* Search Form */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card p-6">
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="sm:col-span-2">
              <label className="text-sm text-slate-300 font-medium mb-1.5 block">Your Skills (comma separated)</label>
              <input value={skills} onChange={e => setSkills(e.target.value)}
                placeholder="e.g. JavaScript, React, Node.js, Python" className="input-field" />
            </div>
            <div>
              <label className="text-sm text-slate-300 font-medium mb-1.5 block">Target Role</label>
              <input value={targetRole} onChange={e => setTargetRole(e.target.value)}
                placeholder="e.g. Frontend Developer" className="input-field" />
            </div>
            <div>
              <label className="text-sm text-slate-300 font-medium mb-1.5 block">Preferred Location</label>
              <input value={location} onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Bangalore, Remote, India" className="input-field" />
            </div>
            <div>
              <label className="text-sm text-slate-300 font-medium mb-1.5 block">Experience Level</label>
              <select value={experienceLevel} onChange={e => setExperienceLevel(e.target.value)} className="input-field">
                <option value="fresher">Fresher</option>
                <option value="junior">Junior (1-2 years)</option>
                <option value="mid">Mid Level (3-5 years)</option>
                <option value="senior">Senior (5+ years)</option>
              </select>
            </div>
          </div>
          <motion.button onClick={handleMatch} disabled={loading}
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Finding best matches...</> : <><Zap className="w-5 h-5" /> Find My Jobs</>}
          </motion.button>
        </motion.div>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            <p className="text-slate-300 bg-primary-500/10 border border-primary-500/20 rounded-xl p-3 text-sm">
              💡 {result.summary}
            </p>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                { id: 'jobs', label: `Jobs (${result.jobMatches?.length || 0})`, icon: Briefcase },
                { id: 'internships', label: `Internships (${result.internships?.length || 0})`, icon: Star },
                { id: 'freelance', label: `Freelance (${result.freelanceOpportunities?.length || 0})`, icon: TrendingUp }
              ].map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all
                    ${activeTab === t.id ? 'bg-primary-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}>
                  <t.icon className="w-4 h-4" /> {t.label}
                </button>
              ))}
            </div>

            {/* Job filter */}
            {activeTab === 'jobs' && (
              <div className="flex gap-2 flex-wrap">
                {['all', 'full-time', 'remote', 'part-time'].map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`text-xs px-3 py-1.5 rounded-lg capitalize transition-all
                      ${filter === f ? 'bg-primary-500/30 text-primary-300 border border-primary-500/50' : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'}`}>
                    <Filter className="w-3 h-3 inline mr-1" />{f}
                  </button>
                ))}
              </div>
            )}

            {/* Jobs Grid */}
            {activeTab === 'jobs' && (
              <div className="grid sm:grid-cols-2 gap-4">
                {filteredJobs.map((job, i) => (
                  <JobCard key={i} job={job} onSave={handleSave} isSaved={savedJobs.includes(job.title + job.company)} />
                ))}
              </div>
            )}

            {/* Internships */}
            {activeTab === 'internships' && (
              <div className="grid sm:grid-cols-2 gap-4">
                {result.internships?.map((item, i) => (
                  <InternshipCard key={i} item={item} onSave={handleSave} />
                ))}
              </div>
            )}

            {/* Freelance */}
            {activeTab === 'freelance' && (
              <div className="grid sm:grid-cols-2 gap-4">
                {result.freelanceOpportunities?.map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-5 border-l-4 border-yellow-500/60">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-white font-bold">{item.platform}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${item.demandLevel === 'High' ? 'text-green-400 bg-green-500/10 border-green-500/30' : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'}`}>
                        {item.demandLevel} Demand
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm mb-1">{item.skill}</p>
                    <p className="text-accent-green font-semibold text-sm">Avg: {item.avgEarning}</p>
                    <a href="#" target="_blank" className="mt-3 flex items-center gap-1 text-primary-400 text-xs hover:text-primary-300">
                      Explore on {item.platform} <ExternalLink className="w-3 h-3" />
                    </a>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
