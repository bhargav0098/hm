import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, Key, Lock, RefreshCw, CheckCircle, Brain, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const STEPS = { EMAIL: 'email', OTP: 'otp', PASSWORD: 'password', SUCCESS: 'success' };

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(STEPS.EMAIL);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(600); // 10 minutes
  const [canResend, setCanResend] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const otpRefs = useRef([]);
  const navigate = useNavigate();

  // Countdown timer
  useEffect(() => {
    if (step === STEPS.OTP && timer > 0) {
      const t = setInterval(() => setTimer(s => s - 1), 1000);
      return () => clearInterval(t);
    }
  }, [step, timer]);

  // Resend timer
  useEffect(() => {
    if (step === STEPS.OTP && resendTimer > 0) {
      const t = setInterval(() => setResendTimer(s => {
        if (s <= 1) { setCanResend(true); return 0; }
        return s - 1;
      }), 1000);
      return () => clearInterval(t);
    }
  }, [step, resendTimer]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Enter your email');
    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('OTP sent! Check your inbox.');
      setStep(STEPS.OTP);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    // Auto-submit when all filled
    if (value && index === 5 && newOtp.every(d => d)) {
      handleVerifyOTP(newOtp.join(''));
    }
  };

  const handleOTPKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async (code) => {
    const otpCode = code || otp.join('');
    if (otpCode.length !== 6) return toast.error('Enter all 6 digits');
    setIsLoading(true);
    try {
      await api.post('/auth/verify-otp', { email, otp: otpCode, type: 'password_reset' });
      toast.success('OTP verified!');
      setStep(STEPS.PASSWORD);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('New OTP sent!');
      setOtp(['', '', '', '', '', '']);
      setTimer(600);
      setResendTimer(60);
      setCanResend(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) return toast.error('Passwords do not match');
    if (password.length < 8) return toast.error('Password must be at least 8 characters');
    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', { email, otp: otp.join(''), password });
      setStep(STEPS.SUCCESS);
      toast.success('Password reset successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-dark-900 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-80 h-80 bg-primary-500/8 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-accent-purple/8 rounded-full blur-3xl" />
      
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white">Startup Intelligence</span>
        </Link>
        
        <AnimatePresence mode="wait">
          {/* STEP 1: Email */}
          {step === STEPS.EMAIL && (
            <motion.div key="email" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="glass-card p-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-purple/20 border border-primary-500/30 flex items-center justify-center mb-6">
                <Mail className="w-7 h-7 text-primary-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Forgot password?</h2>
              <p className="text-slate-400 text-sm mb-8">Enter your email and we'll send you a verification code.</p>
              
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com" className="input-field pl-10" autoFocus />
                </div>
                <motion.button type="submit" disabled={isLoading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  className="btn-primary w-full flex items-center justify-center gap-2">
                  {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Send OTP'}
                </motion.button>
              </form>
              
              <Link to="/login" className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mt-6 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to login
              </Link>
            </motion.div>
          )}
          
          {/* STEP 2: OTP */}
          {step === STEPS.OTP && (
            <motion.div key="otp" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="glass-card p-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-green/20 to-primary-500/20 border border-accent-green/30 flex items-center justify-center mb-6">
                <Key className="w-7 h-7 text-accent-green" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Enter OTP</h2>
              <p className="text-slate-400 text-sm mb-2">We sent a 6-digit code to</p>
              <p className="text-primary-400 font-medium text-sm mb-8">{email}</p>
              
              {/* OTP Input */}
              <div className="flex gap-2 justify-center mb-6">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => otpRefs.current[i] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOTPChange(i, e.target.value)}
                    onKeyDown={e => handleOTPKeyDown(i, e)}
                    className="w-12 h-14 text-center text-xl font-bold bg-white/5 border border-white/15 rounded-xl text-white outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                    autoFocus={i === 0}
                  />
                ))}
              </div>
              
              {/* Timer */}
              <div className="flex items-center justify-between mb-6">
                <p className="text-slate-500 text-sm">
                  Expires in <span className={`font-mono font-bold ${timer < 60 ? 'text-red-400' : 'text-primary-400'}`}>{formatTime(timer)}</span>
                </p>
                {canResend ? (
                  <button onClick={handleResend} disabled={isLoading}
                    className="flex items-center gap-1 text-primary-400 hover:text-primary-300 text-sm transition-colors">
                    <RefreshCw className="w-3 h-3" /> Resend OTP
                  </button>
                ) : (
                  <p className="text-slate-500 text-sm">Resend in {resendTimer}s</p>
                )}
              </div>
              
              <motion.button onClick={() => handleVerifyOTP()} disabled={isLoading || otp.join('').length !== 6}
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="btn-primary w-full flex items-center justify-center gap-2">
                {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Verify OTP'}
              </motion.button>
              
              <button onClick={() => setStep(STEPS.EMAIL)} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mt-6 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Change email
              </button>
            </motion.div>
          )}
          
          {/* STEP 3: New Password */}
          {step === STEPS.PASSWORD && (
            <motion.div key="password" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="glass-card p-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-purple/20 to-primary-500/20 border border-accent-purple/30 flex items-center justify-center mb-6">
                <Lock className="w-7 h-7 text-accent-purple" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">New password</h2>
              <p className="text-slate-400 text-sm mb-8">Create a new secure password for your account.</p>
              
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="New password (min 8 chars)" className="input-field pl-10 pr-10" />
                  <button type="button" onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password" className="input-field pl-10" />
                </div>
                <motion.button type="submit" disabled={isLoading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  className="btn-primary w-full flex items-center justify-center gap-2">
                  {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Reset Password'}
                </motion.button>
              </form>
            </motion.div>
          )}
          
          {/* STEP 4: Success */}
          {step === STEPS.SUCCESS && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-8 text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-accent-green/30 to-primary-500/20 border border-accent-green/40 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-accent-green" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-2">Password reset!</h2>
              <p className="text-slate-400 mb-8">Your password has been reset successfully. You can now sign in with your new password.</p>
              <Link to="/login">
                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="btn-primary w-full">
                  Back to Login
                </motion.button>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
