import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Zap, CheckCircle, AlertCircle, Plus, Trash2, Save, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/layout/DashboardLayout';
import api from '../services/api';
import useAuthStore from '../store/authStore';

const TABS = ['Personal Info', 'Summary', 'Experience', 'Education', 'Skills', 'Projects'];

const defaultResume = {
  personalInfo: { fullName: '', email: '', phone: '', location: '', linkedin: '', github: '', website: '' },
  summary: '',
  experience: [{ company: '', role: '', duration: '', description: '', achievements: [''] }],
  education: [{ degree: '', institution: '', year: '', grade: '' }],
  skills: [''],
  projects: [{ name: '', description: '', tech: [''], link: '' }]
};

export default function ResumePage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState(0);
  const [resume, setResume] = useState(defaultResume);
  const [targetRole, setTargetRole] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [atsScore, setAtsScore] = useState(null);

  useEffect(() => {
    api.get('/career/resume').then(r => {
      if (r.data.resume) {
        const { _id, user, __v, createdAt, updatedAt, ...rest } = r.data.resume;
        setResume({ ...defaultResume, ...rest });
        setAtsScore(r.data.resume.atsScore);
      }
    }).catch(() => {});

    // Pre-fill from user profile
    setResume(prev => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, fullName: user?.fullName || '', email: user?.email || '' }
    }));
  }, []);

  const updateField = (path, value) => {
    setResume(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = next;
      keys.slice(0, -1).forEach(k => obj = isNaN(k) ? obj[k] : obj[parseInt(k)]);
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/career/resume/save', { resumeData: resume });
      toast.success('Resume saved!');
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAiResult(null);
    try {
      const { data } = await api.post('/career/resume/analyze', { resumeData: resume, targetRole });
      setAiResult(data.result);
      setAtsScore(data.result.atsScore);
      toast.success(`ATS Score: ${data.result.atsScore}%! 📊`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Analysis failed');
    } finally { setAnalyzing(false); }
  };

  const handlePrint = () => window.print();

  // Score color
  const scoreColor = atsScore >= 75 ? 'text-green-400' : atsScore >= 50 ? 'text-yellow-400' : 'text-red-400';
  const scoreBg = atsScore >= 75 ? 'bg-green-500' : atsScore >= 50 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-purple to-primary-500 flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Resume Builder Agent</h1>
              <p className="text-slate-400 text-sm">AI-powered ATS-optimized resume creator</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {atsScore !== null && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                <div className={`w-2 h-2 rounded-full ${scoreBg}`} />
                <span className={`font-black text-lg ${scoreColor}`}>{atsScore}%</span>
                <span className="text-slate-400 text-sm">ATS Score</span>
              </div>
            )}
            <button onClick={handleSave} disabled={saving} className="btn-ghost flex items-center gap-2 py-2">
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Form Panel */}
          <div className="lg:col-span-3 space-y-4">
            {/* Tab Nav */}
            <div className="glass-card p-1 flex gap-1 overflow-x-auto">
              {TABS.map((t, i) => (
                <button key={t} onClick={() => setTab(i)}
                  className={`flex-1 min-w-max px-3 py-2 rounded-lg text-sm font-medium transition-all
                    ${tab === i ? 'bg-primary-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                  {t}
                </button>
              ))}
            </div>

            <div className="glass-card p-6">
              {/* Tab 0: Personal Info */}
              {tab === 0 && (
                <div className="grid sm:grid-cols-2 gap-4">
                  {Object.keys(resume.personalInfo).map(key => (
                    <div key={key}>
                      <label className="text-xs text-slate-400 capitalize mb-1 block">{key.replace(/([A-Z])/g, ' $1')}</label>
                      <input type={key === 'email' ? 'email' : 'text'} value={resume.personalInfo[key]}
                        onChange={e => updateField(`personalInfo.${key}`, e.target.value)}
                        placeholder={`Your ${key}`} className="input-field text-sm py-2" />
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 1: Summary */}
              {tab === 1 && (
                <div>
                  <label className="text-sm text-slate-300 font-medium mb-2 block">Professional Summary</label>
                  <textarea value={resume.summary} onChange={e => updateField('summary', e.target.value)}
                    placeholder="Write a compelling 2-3 sentence summary that highlights your skills, experience, and career goals..."
                    rows={5} className="input-field resize-none w-full" />
                  {aiResult?.improvedSummary && (
                    <div className="mt-3 p-3 rounded-xl bg-primary-500/10 border border-primary-500/30">
                      <p className="text-xs text-primary-400 font-semibold mb-1">✨ AI Improved Summary:</p>
                      <p className="text-slate-300 text-sm">{aiResult.improvedSummary}</p>
                      <button onClick={() => updateField('summary', aiResult.improvedSummary)}
                        className="mt-2 text-xs text-primary-400 hover:text-primary-300 font-medium">
                        Use this summary →
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Experience */}
              {tab === 2 && (
                <div className="space-y-4">
                  {resume.experience.map((exp, i) => (
                    <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/8 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400 font-medium">Experience {i + 1}</span>
                        {resume.experience.length > 1 && (
                          <button onClick={() => setResume(prev => ({ ...prev, experience: prev.experience.filter((_, j) => j !== i) }))}
                            className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {[['company', 'Company Name'], ['role', 'Job Title'], ['duration', 'Duration (e.g. Jan 2023 - Dec 2023)']].map(([k, label]) => (
                          <div key={k} className={k === 'duration' ? 'sm:col-span-2' : ''}>
                            <input value={exp[k]} onChange={e => updateField(`experience.${i}.${k}`, e.target.value)}
                              placeholder={label} className="input-field text-sm py-2 w-full" />
                          </div>
                        ))}
                      </div>
                      <textarea value={exp.description} onChange={e => updateField(`experience.${i}.description`, e.target.value)}
                        placeholder="Describe your responsibilities..." rows={2} className="input-field resize-none w-full text-sm" />
                    </div>
                  ))}
                  <button onClick={() => setResume(prev => ({ ...prev, experience: [...prev.experience, { company: '', role: '', duration: '', description: '', achievements: [''] }] }))}
                    className="btn-ghost w-full flex items-center justify-center gap-2 py-2 text-sm">
                    <Plus className="w-4 h-4" /> Add Experience
                  </button>
                </div>
              )}

              {/* Tab 3: Education */}
              {tab === 3 && (
                <div className="space-y-4">
                  {resume.education.map((edu, i) => (
                    <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/8 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400 font-medium">Education {i + 1}</span>
                        {resume.education.length > 1 && (
                          <button onClick={() => setResume(prev => ({ ...prev, education: prev.education.filter((_, j) => j !== i) }))}
                            className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {[['degree', 'Degree / Qualification'], ['institution', 'College / University'], ['year', 'Year of Passing'], ['grade', 'Grade / CGPA']].map(([k, label]) => (
                          <input key={k} value={edu[k]} onChange={e => updateField(`education.${i}.${k}`, e.target.value)}
                            placeholder={label} className="input-field text-sm py-2" />
                        ))}
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setResume(prev => ({ ...prev, education: [...prev.education, { degree: '', institution: '', year: '', grade: '' }] }))}
                    className="btn-ghost w-full flex items-center justify-center gap-2 py-2 text-sm">
                    <Plus className="w-4 h-4" /> Add Education
                  </button>
                </div>
              )}

              {/* Tab 4: Skills */}
              {tab === 4 && (
                <div className="space-y-3">
                  <label className="text-sm text-slate-300 font-medium block">Technical Skills</label>
                  <div className="flex flex-wrap gap-2">
                    {resume.skills.map((s, i) => (
                      <div key={i} className="flex items-center gap-1 bg-primary-500/20 border border-primary-500/30 rounded-lg px-2 py-1">
                        <input value={s} onChange={e => {
                          const next = [...resume.skills];
                          next[i] = e.target.value;
                          setResume(prev => ({ ...prev, skills: next }));
                        }} className="bg-transparent text-primary-300 text-sm outline-none w-24" placeholder="Skill..." />
                        <button onClick={() => setResume(prev => ({ ...prev, skills: prev.skills.filter((_, j) => j !== i) }))}
                          className="text-red-400 hover:text-red-300"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                    <button onClick={() => setResume(prev => ({ ...prev, skills: [...prev.skills, ''] }))}
                      className="flex items-center gap-1 text-sm text-slate-400 hover:text-white border border-dashed border-white/20 px-3 py-1 rounded-lg hover:border-primary-500/50 transition-all">
                      <Plus className="w-3 h-3" /> Add Skill
                    </button>
                  </div>
                  {aiResult?.keywordSuggestions?.length > 0 && (
                    <div className="mt-3 p-3 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20">
                      <p className="text-xs text-accent-cyan font-semibold mb-2">🔑 AI Keyword Suggestions:</p>
                      <div className="flex flex-wrap gap-1">
                        {aiResult.keywordSuggestions.map(kw => (
                          <button key={kw} onClick={() => setResume(prev => ({ ...prev, skills: [...prev.skills, kw] }))}
                            className="text-xs bg-white/5 text-slate-300 px-2 py-0.5 rounded hover:bg-primary-500/20 hover:text-primary-300 transition-all">
                            + {kw}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 5: Projects */}
              {tab === 5 && (
                <div className="space-y-4">
                  {resume.projects.map((proj, i) => (
                    <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/8 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400 font-medium">Project {i + 1}</span>
                        {resume.projects.length > 1 && (
                          <button onClick={() => setResume(prev => ({ ...prev, projects: prev.projects.filter((_, j) => j !== i) }))}
                            className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                      <input value={proj.name} onChange={e => updateField(`projects.${i}.name`, e.target.value)}
                        placeholder="Project Name" className="input-field text-sm py-2 w-full" />
                      <textarea value={proj.description} onChange={e => updateField(`projects.${i}.description`, e.target.value)}
                        placeholder="Describe what the project does, technologies used, and your role..." rows={2}
                        className="input-field resize-none w-full text-sm" />
                      <input value={proj.link} onChange={e => updateField(`projects.${i}.link`, e.target.value)}
                        placeholder="GitHub / Live Link" className="input-field text-sm py-2 w-full" />
                    </div>
                  ))}
                  <button onClick={() => setResume(prev => ({ ...prev, projects: [...prev.projects, { name: '', description: '', tech: [''], link: '' }] }))}
                    className="btn-ghost w-full flex items-center justify-center gap-2 py-2 text-sm">
                    <Plus className="w-4 h-4" /> Add Project
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* AI Panel */}
          <div className="lg:col-span-2 space-y-4">
            {/* AI Analyze */}
            <div className="glass-card p-5">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary-400" /> AI Optimization
              </h3>
              <input value={targetRole} onChange={e => setTargetRole(e.target.value)}
                placeholder="Target role (e.g. React Developer)" className="input-field text-sm mb-3" />
              <motion.button onClick={handleAnalyze} disabled={analyzing}
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
                {analyzing ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analyzing...</> : <><Zap className="w-4 h-4" /> Analyze & Optimize</>}
              </motion.button>
            </div>

            {/* AI Suggestions */}
            {aiResult && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                {/* ATS Score */}
                <div className="glass-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-semibold text-sm">ATS Score</span>
                    <span className={`text-xl font-black ${scoreColor}`}>{aiResult.atsScore}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${aiResult.atsScore}%` }}
                      transition={{ duration: 1 }} className={`h-full rounded-full ${scoreBg}`} />
                  </div>
                </div>

                {/* Suggestions */}
                <div className="glass-card p-4">
                  <h4 className="text-white font-semibold text-sm mb-3">💡 AI Suggestions</h4>
                  <div className="space-y-2">
                    {aiResult.suggestions?.map((s, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <AlertCircle className="w-3 h-3 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-400 text-xs">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Strengths */}
                {aiResult.strengthAreas?.length > 0 && (
                  <div className="glass-card p-4">
                    <h4 className="text-white font-semibold text-sm mb-3">✅ Strengths</h4>
                    <div className="space-y-1">
                      {aiResult.strengthAreas.map((s, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                          <span className="text-slate-400 text-xs">{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing Sections */}
                {aiResult.missingSections?.length > 0 && (
                  <div className="glass-card p-4">
                    <h4 className="text-white font-semibold text-sm mb-3">⚠️ Missing / Needed</h4>
                    <div className="space-y-1">
                      {aiResult.missingSections.map((s, i) => (
                        <p key={i} className="text-slate-400 text-xs">• {s}</p>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Save + Print */}
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm py-2.5">
                <Save className="w-4 h-4" /> Save
              </button>
              <button onClick={handlePrint} className="btn-ghost flex-1 flex items-center justify-center gap-2 text-sm py-2.5">
                <Download className="w-4 h-4" /> Export
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Fix missing X import
function X({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
}
