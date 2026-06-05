import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Brain, Briefcase, Mic, BookOpen, Target, MapPin,
  ArrowRight, CheckCircle, Star, Zap, Users, TrendingUp,
  ChevronDown, ChevronUp, Github, Linkedin, Mail
} from 'lucide-react';

const FEATURES = [
  { icon: Brain, title: 'Skill Analysis Agent', desc: 'Upload your skills and get instant AI-powered gap analysis, career path suggestions, and a personalized learning roadmap.', color: 'from-primary-500 to-accent-purple' },
  { icon: BookOpen, title: 'Resume Builder Agent', desc: 'Create ATS-optimized resumes with AI suggestions, keyword optimization, and real-time scoring to get past automated filters.', color: 'from-accent-purple to-accent-cyan' },
  { icon: Briefcase, title: 'Job Matching Agent', desc: 'Get matched with relevant jobs, internships, and freelance projects based on your exact skills and career goals.', color: 'from-accent-cyan to-accent-blue' },
  { icon: Mic, title: 'Interview Prep Agent', desc: 'Practice with realistic mock interviews, get AI feedback on your answers, and improve your confidence before the real thing.', color: 'from-accent-blue to-accent-green' },
  { icon: Target, title: 'Career Roadmap Agent', desc: 'Get a personalized 90-day action plan with daily routines, key milestones, and step-by-step guidance to land your dream job.', color: 'from-accent-green to-accent-yellow' },
  { icon: MapPin, title: 'Local Opportunity Agent', desc: 'Find walk-in drives, government job openings, nearby skill centers, and online portals tailored to your location.', color: 'from-accent-yellow to-orange-500' },
];

const WORKFLOW = [
  { step: '01', title: 'Create Your Profile', desc: 'Register and enter your current skills, education, and target role.' },
  { step: '02', title: 'AI Analyzes Your Profile', desc: 'Skill Analysis Agent identifies gaps and creates your learning roadmap.' },
  { step: '03', title: 'Build Your Resume', desc: 'Resume Agent optimizes your CV for ATS with keyword recommendations.' },
  { step: '04', title: 'Discover Matching Jobs', desc: 'Job Matching Agent finds relevant opportunities based on your profile.' },
  { step: '05', title: 'Practice Interviews', desc: 'Interview Agent conducts mock sessions with real-time AI feedback.' },
  { step: '06', title: 'Get Hired!', desc: 'Follow your 90-day roadmap and track progress until you land the job.' },
];

const FAQS = [
  { q: 'Is this platform completely free?', a: 'Yes! The platform is free to use. You can optionally add your own AI API keys (like Gemini free tier) for enhanced performance, but the platform works with its default configuration too.' },
  { q: 'What if I have no prior work experience?', a: 'The platform is specifically designed for freshers and job seekers at all levels. The Skill Analysis Agent will create a roadmap from your current knowledge level.' },
  { q: 'How accurate is the job matching?', a: 'Job matching is powered by Gemini AI which analyzes your skills against current market demand. The more detail you provide about your skills, the more accurate the matches.' },
  { q: 'Can I practice interview questions for any role?', a: 'Yes! The Interview Prep Agent generates role-specific HR, technical, and behavioral questions for any job title you specify.' },
  { q: 'Is my data safe?', a: 'All data is encrypted and stored securely in MongoDB Atlas. API keys are encrypted with AES-256 before storage. We never share your data with third parties.' },
  { q: 'Can I use my own Gemini or OpenAI API key?', a: 'Absolutely! Go to Settings and add your own API keys. This uses your personal quota and can provide faster responses.' },
];

const TESTIMONIALS = [
  { name: 'Priya S.', role: 'Got hired as React Developer', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=priya', text: 'The skill analysis was spot on. It told me to learn React and TypeScript, and within 2 months I landed my first dev job!', rating: 5 },
  { name: 'Rahul M.', role: 'Junior Data Analyst at Infosys', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rahul', text: 'The mock interview practice was incredible. I felt confident going into my actual interview because I had already practiced similar questions.', rating: 5 },
  { name: 'Anjali K.', role: 'Full Stack Intern at startup', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=anjali', text: 'As a fresher with no experience, this platform guided me from zero to landing an internship in just 6 weeks. The roadmap really works!', rating: 5 },
];

function FAQ({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors">
        <span className="text-white font-medium text-sm pr-4">{q}</span>
        {open ? <ChevronUp className="w-5 h-5 text-primary-400 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />}
      </button>
      {open && (
        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="px-5 pb-5">
          <p className="text-slate-400 text-sm leading-relaxed">{a}</p>
        </motion.div>
      )}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-dark-900 text-slate-100">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-dark-900/80 backdrop-blur-xl border-b border-white/8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-white">CareerIQ AI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-slate-400 hover:text-white text-sm transition-colors px-3 py-1.5">Sign In</Link>
            <Link to="/register">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn-primary text-sm py-2 px-4">
                Get Started Free
              </motion.button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial from-primary-900/30 via-transparent to-transparent" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent-purple/8 rounded-full blur-3xl" />

        {/* Animated particles */}
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="absolute rounded-full opacity-15 pointer-events-none"
            style={{
              width: `${40 + i * 15}px`, height: `${40 + i * 15}px`,
              left: `${10 + i * 12}%`, top: `${20 + (i % 3) * 25}%`,
              background: `radial-gradient(circle, ${['#6366f1','#8b5cf6','#06b6d4','#10b981'][i%4]}60, transparent)`,
              animation: `particle-float ${4 + i}s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`
            }} />
        ))}

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
            <span className="inline-flex items-center gap-2 text-sm text-primary-400 bg-primary-500/10 border border-primary-500/20 px-4 py-1.5 rounded-full">
              <Zap className="w-3 h-3" /> Powered by Multi-Agent AI · Built for Job Seekers
            </span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-black mb-6 leading-tight">
            Your AI Career{' '}
            <span className="bg-gradient-to-r from-primary-400 via-accent-purple to-accent-cyan bg-clip-text text-transparent">
              Coach & Guide
            </span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-slate-400 text-xl mb-10 leading-relaxed max-w-2xl mx-auto">
            Six AI agents work together to analyze your skills, build your resume, match you with jobs,
            prep you for interviews, and guide you with a personalized roadmap — all in one platform.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="btn-primary flex items-center gap-2 text-lg px-8 py-4">
                Start for Free <ArrowRight className="w-5 h-5" />
              </motion.button>
            </Link>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="flex items-center justify-center gap-6 mt-8 text-slate-500 text-sm">
            {[['Free to use', CheckCircle], ['No credit card', CheckCircle], ['AI-powered', CheckCircle]].map(([label, Icon]) => (
              <span key={label} className="flex items-center gap-1.5">
                <Icon className="w-4 h-4 text-accent-green" /> {label}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4 border-y border-white/8">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[['6', 'AI Agents'], ['90 Days', 'To Get Hired'], ['100%', 'Free Platform'], ['24/7', 'AI Support']].map(([val, label]) => (
            <motion.div key={label} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <p className="text-3xl font-black text-primary-400 mb-1">{val}</p>
              <p className="text-slate-400 text-sm">{label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">Six AI Agents, One Goal</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">Each specialized agent tackles a key part of your job search, collaborating to give you the best possible outcome.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="glass-card p-6 hover:border-white/20 transition-all">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white font-bold mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-4 bg-dark-800/40">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">How It Works</h2>
            <p className="text-slate-400 text-lg">From zero to job offer in 90 days — here's the path.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {WORKFLOW.map((w, i) => (
              <motion.div key={w.step} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="glass-card p-5 relative">
                <span className="text-5xl font-black text-primary-500/20 absolute top-3 right-4">{w.step}</span>
                <p className="text-primary-400 font-bold text-sm mb-2">Step {w.step}</p>
                <h3 className="text-white font-bold mb-2">{w.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{w.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">Success Stories</h2>
            <p className="text-slate-400">Real people, real results.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={t.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="glass-card p-6">
                <div className="flex gap-1 mb-4">
                  {Array(t.rating).fill(0).map((_, i) => <Star key={i} className="w-4 h-4 text-accent-yellow fill-accent-yellow" />)}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-4 italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full border border-white/20" />
                  <div>
                    <p className="text-white font-semibold text-sm">{t.name}</p>
                    <p className="text-accent-green text-xs">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 bg-dark-800/40">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-white mb-4">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => <FAQ key={i} {...faq} />)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            className="glass-card p-12">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary-500/30">
              <Brain className="w-9 h-9 text-white" />
            </div>
            <h2 className="text-4xl font-black text-white mb-4">Ready to Land Your Dream Job?</h2>
            <p className="text-slate-400 text-lg mb-8">Join thousands of job seekers using AI to accelerate their career journey. Free, no credit card needed.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="btn-primary flex items-center gap-2 text-lg px-8 py-4">
                  Create Free Account <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/8 py-10 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-sm">CareerIQ AI</span>
          </div>
          <p className="text-slate-500 text-sm">AI-powered career assistance · Helping job seekers find their path</p>
          <div className="flex items-center gap-4 text-slate-500 text-xs">
            <span>© 2024 CareerIQ AI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
