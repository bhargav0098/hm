import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, Zap, Brain, TrendingUp, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

// Animated particle component
const Particle = ({ style }) => (
  <div
    className="absolute rounded-full opacity-20 pointer-events-none"
    style={style}
  />
);

const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  style: {
    width: `${Math.random() * 80 + 20}px`,
    height: `${Math.random() * 80 + 20}px`,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    background: `radial-gradient(circle, ${['#6366f1', '#8b5cf6', '#06b6d4', '#10b981'][i % 4]}40, transparent)`,
    animation: `particle-float ${Math.random() * 4 + 4}s ease-in-out infinite`,
    animationDelay: `${Math.random() * 4}s`
  }
}));

const features = [
  { icon: Brain, label: 'Multi-Agent AI Analysis', desc: 'Three specialized AI agents working in parallel' },
  { icon: TrendingUp, label: 'Market Intelligence', desc: 'Real-time competitor and trend analysis' },
  { icon: Shield, label: 'Risk Assessment', desc: 'Comprehensive startup risk profiling' },
  { icon: Zap, label: 'Instant Reports', desc: 'Complete analysis in under 60 seconds' }
];

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { login, demoLogin, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error('Please fill all fields');
      return;
    }
    const result = await login(form.email, form.password, rememberMe);
    if (result.success) navigate('/dashboard');
    else toast.error(result.message);
  };

  const handleDemo = async () => {
    const result = await demoLogin();
    if (result.success) navigate('/dashboard');
    else toast.error(result.message);
  };

  return (
    <div className="min-h-screen flex overflow-hidden bg-dark-900">
      {/* Left Panel - Features */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-center px-16 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/40 via-dark-900 to-dark-800" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        
        {PARTICLES.map(p => <Particle key={p.id} style={p.style} />)}
        
        <div className="relative z-10">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-16"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center shadow-lg shadow-primary-500/30">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Startup Intelligence</span>
          </motion.div>
          
          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-12"
          >
            <h1 className="text-5xl font-black text-white leading-tight mb-4">
              Analyze Startups<br />
              <span className="bg-gradient-to-r from-primary-400 to-accent-cyan bg-clip-text text-transparent">
                With AI Power
              </span>
            </h1>
            <p className="text-slate-400 text-lg">
              Multi-agent AI platform for investors, incubators, and analysts to evaluate startups instantly.
            </p>
          </motion.div>
          
          {/* Features */}
          <div className="space-y-4">
            {features.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/8 backdrop-blur-sm"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500/20 to-accent-purple/20 border border-primary-500/30 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-5 h-5 text-primary-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{f.label}</p>
                  <p className="text-slate-400 text-xs">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
          
          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-12 flex gap-8"
          >
            {[['500+', 'Startups Analyzed'], ['97%', 'Accuracy Rate'], ['60s', 'Avg Analysis Time']].map(([val, label]) => (
              <div key={label}>
                <p className="text-2xl font-black text-primary-400">{val}</p>
                <p className="text-slate-500 text-xs">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
      
      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
        <div className="absolute inset-0 bg-dark-800/50" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">Startup Intelligence</span>
          </div>
          
          <div className="glass-card p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
              <p className="text-slate-400 text-sm">Sign in to your account to continue</p>
            </div>
            
            {/* Demo Banner */}
            <motion.button
              onClick={handleDemo}
              disabled={isLoading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full mb-6 p-3 rounded-xl bg-gradient-to-r from-accent-yellow/15 to-accent-green/10 border border-accent-yellow/30 flex items-center gap-3 hover:border-accent-yellow/50 transition-all"
            >
              <Zap className="w-5 h-5 text-accent-yellow flex-shrink-0" />
              <div className="text-left">
                <p className="text-accent-yellow font-semibold text-sm">Try Demo Account</p>
                <p className="text-slate-400 text-xs">Explore with sample startup data — no signup needed</p>
              </div>
            </motion.button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-slate-500 text-xs">or sign in with email</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@company.com"
                    className="input-field pl-10"
                    autoComplete="email"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="input-field pl-10 pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary-500 focus:ring-primary-500/30"
                  />
                  <span className="text-sm text-slate-400">Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-sm text-primary-400 hover:text-primary-300 transition-colors">
                  Forgot password?
                </Link>
              </div>
              
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : 'Sign In'}
              </motion.button>
            </form>
            
            <p className="text-center text-sm text-slate-500 mt-6">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                Create account
              </Link>
            </p>
          </div>
          
          <p className="text-center text-xs text-slate-600 mt-4">
            Protected by enterprise-grade security · JWT + bcrypt
          </p>
        </motion.div>
      </div>
    </div>
  );
}
