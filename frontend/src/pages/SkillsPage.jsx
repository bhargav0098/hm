import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Plus, X, Zap, Target, TrendingUp, CheckCircle, BookOpen,
  ExternalLink, GraduationCap, Download, Search, ChevronDown,
  BarChart3, Star, Clock, Award, Lightbulb, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/layout/DashboardLayout';
import api from '../services/api';

// Comprehensive skill database across all domains
const ALL_SKILLS = {
  'Frontend': ['HTML', 'CSS', 'JavaScript', 'TypeScript', 'React', 'Vue.js', 'Angular', 'Next.js', 'Tailwind CSS', 'Bootstrap', 'Sass/SCSS', 'Redux', 'Zustand', 'Webpack', 'Vite'],
  'Backend': ['Node.js', 'Express.js', 'Python', 'Django', 'Flask', 'FastAPI', 'Java', 'Spring Boot', 'PHP', 'Laravel', 'Ruby on Rails', 'Go', 'Rust', 'C#', '.NET'],
  'Mobile': ['React Native', 'Flutter', 'Swift', 'Kotlin', 'Android', 'iOS', 'Expo', 'Ionic'],
  'Database': ['MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Firebase', 'Supabase', 'Elasticsearch', 'DynamoDB'],
  'Data Science': ['Python', 'R', 'Pandas', 'NumPy', 'Matplotlib', 'Seaborn', 'Scikit-learn', 'Statistics', 'Data Visualization', 'Power BI', 'Tableau', 'Excel', 'SQL'],
  'AI/ML': ['Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Keras', 'NLP', 'Computer Vision', 'LLMs', 'Prompt Engineering', 'OpenAI API', 'Hugging Face', 'MLOps'],
  'DevOps/Cloud': ['Docker', 'Kubernetes', 'AWS', 'Google Cloud', 'Azure', 'CI/CD', 'GitHub Actions', 'Jenkins', 'Terraform', 'Linux', 'Nginx'],
  'Design': ['Figma', 'Adobe XD', 'Sketch', 'UI Design', 'UX Research', 'Prototyping', 'Wireframing', 'Adobe Illustrator', 'Canva'],
  'Business': ['Project Management', 'Agile', 'Scrum', 'Business Analysis', 'Excel', 'PowerPoint', 'Communication', 'Leadership', 'Marketing', 'Sales'],
  'Other': ['Git', 'GitHub', 'REST APIs', 'GraphQL', 'WebSockets', 'Testing', 'Jest', 'Cypress', 'Blockchain', 'Web3'],
};

const FLAT_SKILLS = Object.values(ALL_SKILLS).flat();

const EXPERIENCE_LEVELS = [
  { value: 'fresher', label: 'Fresher (0 years)' },
  { value: 'junior', label: 'Junior (1-2 years)' },
  { value: 'mid', label: 'Mid Level (3-5 years)' },
  { value: 'senior', label: 'Senior (5+ years)' }
];

const POPULAR_ROLES = [
  'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Mobile Developer',
  'Data Analyst', 'Data Scientist', 'Machine Learning Engineer', 'AI Engineer',
  'DevOps Engineer', 'Cloud Architect', 'UI/UX Designer', 'QA Engineer',
  'Product Manager', 'Business Analyst', 'Cybersecurity Engineer', 'Blockchain Developer',
  'Game Developer', 'Embedded Systems Engineer', 'Technical Writer', 'Software Architect'
];

const priorityColors = {
  high: 'text-red-400 bg-red-500/10 border-red-500/30',
  medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  low: 'text-green-400 bg-green-500/10 border-green-500/30'
};

const demandColors = {
  'Very High': 'text-green-400',
  'High': 'text-emerald-400',
  'Medium': 'text-yellow-400',
  'Low': 'text-red-400'
};

export default function SkillsPage() {
  const [skills, setSkills] = useState([]);
  const [inputSkill, setInputSkill] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('fresher');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const suggestRef = useRef(null);

  useEffect(() => {
    api.get('/career/skills/profile').then(r => {
      if (r.data.profile) {
        setSkills(r.data.profile.currentSkills?.map(s => s.name) || []);
        const role = r.data.profile.targetRole || '';
        if (POPULAR_ROLES.includes(role)) {
          setTargetRole(role);
        } else if (role) {
          setTargetRole('custom');
          setCustomRole(role);
        }
        setExperienceLevel(r.data.profile.experienceLevel || 'fresher');
        const completed = r.data.profile.learningRoadmap?.filter(r => r.completed).map((_, i) => i) || [];
        setCompletedSteps(completed);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSkillInput = (value) => {
    setInputSkill(value);
    if (value.length >= 1) {
      const filtered = FLAT_SKILLS
        .filter(s => s.toLowerCase().includes(value.toLowerCase()) && !skills.includes(s))
        .slice(0, 8);
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const addSkill = (s) => {
    const skill = (typeof s === 'string' ? s : inputSkill).trim();
    if (!skill) return;
    if (skills.map(sk => sk.toLowerCase()).includes(skill.toLowerCase())) {
      return toast.error('Skill already added');
    }
    setSkills(prev => [...prev, skill]);
    setInputSkill('');
    setShowSuggestions(false);
  };

  const removeSkill = (s) => setSkills(prev => prev.filter(x => x !== s));

  const getEffectiveRole = () => targetRole === 'custom' ? customRole : targetRole;

  const handleAnalyze = async () => {
    if (!skills.length) return toast.error('Add at least one skill');
    const role = getEffectiveRole();
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post('/career/skills/analyze', {
        skills,
        targetRole: role,
        experienceLevel
      });
      setResult(data.result);
      toast.success('Skill analysis complete! 🎯');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Analysis failed. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const markComplete = async (index) => {
    try {
      await api.put('/career/skills/roadmap/complete', { skillIndex: index });
      setCompletedSteps(prev => [...prev, index]);
      toast.success('Marked as complete! 🎉');
    } catch {}
  };

  const filteredSkillsForBrowse = () => {
    const categorySkills = activeCategory === 'All'
      ? FLAT_SKILLS
      : (ALL_SKILLS[activeCategory] || []);
    return categorySkills.filter(s =>
      s.toLowerCase().includes(searchQuery.toLowerCase()) && !skills.includes(s)
    );
  };

  const downloadPDF = () => {
    if (!result) return;
    const role = getEffectiveRole();
    const printWindow = window.open('', '_blank');
    const sorted = [...(result.analyzedSkills || [])].sort((a, b) => (a.learningOrder || 99) - (b.learningOrder || 99));
    printWindow.document.write(`<!DOCTYPE html><html><head>
      <title>Skill Analysis Report</title>
      <style>
        body{font-family:'Segoe UI',sans-serif;padding:32px;max-width:800px;margin:0 auto;background:#fff;color:#1a1a2e}
        h1{color:#6366f1;font-size:26px;margin-bottom:4px}
        h2{color:#4f46e5;font-size:16px;margin:24px 0 8px;border-bottom:2px solid #e0e7ff;padding-bottom:6px}
        p,li{color:#4b5563;font-size:13px;line-height:1.7}
        .meta{color:#6b7280;font-size:12px;margin-bottom:20px}
        .skill-row{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;align-items:center;padding:10px 12px;border-radius:8px;margin:5px 0;font-size:12px;border:1px solid #e5e7eb}
        .skill-row.critical{background:#fef2f2;border-color:#fca5a5}
        .skill-row.high{background:#fffbeb;border-color:#fcd34d}
        .skill-row.medium{background:#f0fdf4;border-color:#86efac}
        .skill-row.low{background:#eff6ff;border-color:#bfdbfe}
        .skill-name{font-weight:700;color:#111;font-size:13px}
        .badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600;text-transform:capitalize}
        .badge.critical{background:#fee2e2;color:#dc2626}
        .badge.high{background:#fef3c7;color:#d97706}
        .badge.medium{background:#dcfce7;color:#16a34a}
        .badge.low{background:#dbeafe;color:#2563eb}
        .gap-text{color:#6b7280;font-size:11px;margin-top:4px;grid-column:1/-1;font-style:italic}
        .recommendation{padding:8px 14px;background:#f0fdf4;border-left:3px solid #10b981;border-radius:4px;margin:5px 0;font-size:13px;color:#065f46}
        .header-grid{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;padding:8px 12px;background:#6366f1;color:#fff;border-radius:8px;font-size:11px;font-weight:700;margin-bottom:8px}
        @media print{body{padding:16px}}
      </style></head><body>
      <h1>🧠 Advanced Skill Gap Analysis</h1>
      <div class="meta">
        <strong>Target Role:</strong> ${role || 'Not specified'} |
        <strong>Skills Analyzed:</strong> ${sorted.length} |
        <strong>Generated:</strong> ${new Date().toLocaleDateString()}
      </div>
      
      <h2>📊 Skill Gap Matrix (Sorted by Learning Priority)</h2>
      <div class="header-grid">
        <span>Skill</span>
        <span>Your Level → Required</span>
        <span>Priority</span>
        <span>Order</span>
      </div>
      ${sorted.map(s => `
        <div class="skill-row ${s.priority || 'medium'}">
          <div class="skill-name">${s.skill}</div>
          <div style="font-size:11px;color:#374151">${s.currentLevel === 'none' ? 'Not Started' : s.currentLevel} → <strong style="color:#059669">${s.requiredLevel}</strong></div>
          <div><span class="badge ${s.priority || 'medium'}">${s.priority || 'medium'}</span></div>
          <div style="font-weight:700;color:#6366f1">#${s.learningOrder || '-'}</div>
          <div class="gap-text">${s.gap}</div>
        </div>
      `).join('')}
      
      <h2>⚡ AI Recommendations</h2>
      ${(result.recommendations || []).map((r, i) => `
        <div class="recommendation">${i + 1}. ${r}</div>
      `).join('')}
      
      <p style="margin-top:32px;color:#9ca3af;font-size:11px;text-align:center">Generated by CareerIQ AI Platform</p>
    </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  const categories = ['All', ...Object.keys(ALL_SKILLS)];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center shadow-lg shadow-primary-500/30">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Skill Analysis Agent</h1>
            <p className="text-slate-400 text-sm">AI-powered career gap analysis and personalized learning roadmap</p>
          </div>
        </motion.div>

        {/* Input Section */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card p-6 space-y-5">
          {/* Skills Input with Auto-suggest */}
          <div>
            <label className="text-sm text-slate-300 font-medium mb-2 block">
              Your Current Skills <span className="text-slate-500">(type any skill — not limited to suggestions)</span>
            </label>
            <div ref={suggestRef} className="relative">
              <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    value={inputSkill}
                    onChange={e => handleSkillInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addSkill()}
                    placeholder="Type any skill (React, Python, Excel, Marketing...) and press Enter"
                    className="input-field pl-10"
                  />
                  {/* Suggestions dropdown */}
                  <AnimatePresence>
                    {showSuggestions && suggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full left-0 right-0 z-50 mt-1 bg-dark-700 border border-white/15 rounded-xl shadow-2xl overflow-hidden"
                      >
                        {suggestions.map(s => (
                          <button key={s} onClick={() => addSkill(s)}
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-primary-500/20 hover:text-white transition-colors flex items-center gap-2">
                            <Plus className="w-3 h-3 text-primary-400" /> {s}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <motion.button onClick={() => addSkill()} whileTap={{ scale: 0.95 }}
                  className="btn-primary px-4 py-2 flex items-center gap-1">
                  <Plus className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Category filter */}
              <div className="flex gap-2 mb-3 flex-wrap">
                {categories.map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                      activeCategory === cat
                        ? 'bg-primary-500/20 border-primary-500/50 text-primary-300'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>

              {/* Search within category */}
              {activeCategory !== 'All' && (
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={`Search ${activeCategory} skills...`}
                    className="input-field pl-9 text-sm py-2"
                  />
                </div>
              )}

              {/* Skill tags from category */}
              <div className="flex flex-wrap gap-1.5 mb-3 max-h-24 overflow-y-auto">
                {filteredSkillsForBrowse().slice(0, 30).map(s => (
                  <button key={s} onClick={() => addSkill(s)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:border-primary-500/50 hover:bg-primary-500/10 transition-all">
                    + {s}
                  </button>
                ))}
              </div>

              {/* Selected skills */}
              {skills.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Selected skills ({skills.length}):</p>
                  <div className="flex flex-wrap gap-2">
                    {skills.map(s => (
                      <span key={s} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-500/20 border border-primary-500/40 text-primary-300 text-sm">
                        {s}
                        <button onClick={() => removeSkill(s)} className="hover:text-red-400 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Target Role & Experience */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-300 font-medium mb-2 block">Target Role</label>
              <select value={targetRole} onChange={e => setTargetRole(e.target.value)} className="input-field mb-2">
                <option value="">Select target role...</option>
                {POPULAR_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                <option value="custom">Custom role (type below)</option>
              </select>
              {targetRole === 'custom' && (
                <input
                  value={customRole}
                  onChange={e => setCustomRole(e.target.value)}
                  placeholder="Enter your specific target role..."
                  className="input-field text-sm"
                />
              )}
            </div>
            <div>
              <label className="text-sm text-slate-300 font-medium mb-2 block">Experience Level</label>
              <select value={experienceLevel} onChange={e => setExperienceLevel(e.target.value)} className="input-field">
                {EXPERIENCE_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>

          <motion.button
            onClick={handleAnalyze} disabled={loading || !skills.length}
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analyzing your profile with AI...</>
            ) : (
              <><Zap className="w-5 h-5" /> Analyze Skills with AI — {skills.length} skill{skills.length !== 1 ? 's' : ''} selected</>
            )}
          </motion.button>
        </motion.div>

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

              {/* Download Button */}
              <div className="flex justify-end">
                <button onClick={downloadPDF} className="btn-ghost flex items-center gap-2 text-sm">
                  <Download className="w-4 h-4" /> Download PDF Report
                </button>
              </div>

              {/* Analyzed Skills - Full Gap Analysis Table */}
              {result.analyzedSkills?.length > 0 && (
                <div className="glass-card p-6 border-l-4 border-primary-500">
                  <div className="flex items-center gap-3 mb-5">
                    <Brain className="w-6 h-6 text-primary-400" />
                    <h2 className="text-white font-bold text-lg">Advanced Skill Gap Analysis</h2>
                    <span className="text-xs bg-primary-500/20 text-primary-300 px-2 py-0.5 rounded-full border border-primary-500/30">
                      {result.analyzedSkills.length} skills analyzed
                    </span>
                  </div>

                  {/* Sort by learningOrder */}
                  <div className="space-y-3">
                    {[...result.analyzedSkills]
                      .sort((a, b) => (a.learningOrder || 99) - (b.learningOrder || 99))
                      .map((s, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                        className={`p-4 rounded-xl border ${priorityColors[s.priority] || priorityColors.medium}`}>
                        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-xs font-black text-white flex-shrink-0">
                              {s.learningOrder || i + 1}
                            </span>
                            <span className="font-bold text-white">{s.skill}</span>
                          </div>
                          <span className={`text-xs capitalize px-2 py-0.5 rounded-full border font-medium ${priorityColors[s.priority]}`}>
                            {s.priority}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="bg-black/20 rounded-lg p-2 text-center">
                            <p className="text-xs text-slate-500 mb-0.5">Your Level</p>
                            <p className={`text-xs font-bold capitalize ${
                              s.currentLevel === 'none' ? 'text-red-400' :
                              s.currentLevel === 'beginner' ? 'text-yellow-400' :
                              s.currentLevel === 'intermediate' ? 'text-blue-400' : 'text-green-400'
                            }`}>{s.currentLevel === 'none' ? 'Not Started' : s.currentLevel}</p>
                          </div>
                          <div className="bg-black/20 rounded-lg p-2 text-center">
                            <p className="text-xs text-slate-500 mb-0.5">Required</p>
                            <p className="text-xs font-bold text-accent-green capitalize">{s.requiredLevel}</p>
                          </div>
                          <div className="bg-black/20 rounded-lg p-2 text-center">
                            <p className="text-xs text-slate-500 mb-0.5">Learn Order</p>
                            <p className="text-xs font-bold text-primary-400">#{s.learningOrder || i + 1}</p>
                          </div>
                        </div>

                        <p className="text-slate-400 text-xs leading-relaxed">{s.gap}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {result.recommendations?.length > 0 && (
                <div className="glass-card p-6 border border-accent-green/20">
                  <h2 className="text-white font-bold mb-3 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-accent-yellow" /> AI Recommendations
                  </h2>
                  <div className="space-y-2">
                    {result.recommendations.map((step, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                        <span className="w-6 h-6 rounded-full bg-accent-green/20 text-accent-green text-xs flex items-center justify-center font-bold flex-shrink-0">{i + 1}</span>
                        <span className="text-slate-300 text-sm">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button onClick={async () => {
                  toast.success('Skill Plan added to Dashboard! 🚀');
                  setTimeout(() => window.location.href = '/dashboard', 1000);
                }}
                  className="btn-primary flex-[1.5] flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/20">
                  <CheckCircle className="w-5 h-5" /> Add Skill Plan to Dashboard
                </button>
                <button onClick={downloadPDF} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" /> Download Full Analysis PDF
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
