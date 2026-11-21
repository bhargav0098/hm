import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import AuthLayout from '../../components/auth/AuthLayout';
import Brand from '../../components/common/Brand';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error('Enter your email and password');
      return;
    }
    const result = await login(form.email, form.password, rememberMe);
    if (result.success) navigate('/dashboard');
    else toast.error(result.message);
  };

  return (
    <AuthLayout>
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <Brand className="lg:hidden mb-8" />

        <div className="glass-card p-8 sm:p-10">
          <h2 className="font-display text-3xl font-bold text-ink">Welcome back</h2>
          <p className="text-ink-soft mt-1.5 mb-8">Sign in to pick up where you left off.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="text-sm font-semibold text-ink mb-1.5 block">Email address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                <input id="email" type="email" name="email" value={form.email} onChange={handleChange}
                  placeholder="you@example.com" className="input-field pl-11" autoComplete="email" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="text-sm font-semibold text-ink mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                <input id="password" type={showPass ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange}
                  placeholder="Your password" className="input-field pl-11 pr-12" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPass(s => !s)} aria-label={showPass ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-ink-mute hover:text-primary-500 hover:bg-primary-100 transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-primary-300 text-primary-500 focus:ring-primary-400/30 accent-[#5B21B6]" />
                <span className="text-sm text-ink-soft">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm font-semibold text-primary-500 hover:text-primary-700 transition-colors">Forgot password?</Link>
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full !py-3.5 text-base">
              {isLoading ? <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-ink-soft mt-7">
            New here?{' '}
            <Link to="/register" className="text-primary-500 hover:text-primary-700 font-semibold transition-colors">Create a free account</Link>
          </p>
        </div>
      </motion.div>
    </AuthLayout>
  );
}
