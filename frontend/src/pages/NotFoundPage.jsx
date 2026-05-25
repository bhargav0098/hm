import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, ArrowLeft, Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary-500/30">
          <Brain className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-8xl font-black text-primary-400 mb-4">404</h1>
        <h2 className="text-2xl font-bold text-white mb-3">Page Not Found</h2>
        <p className="text-slate-400 mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <div className="flex gap-3 justify-center">
          <Link to="/">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn-ghost flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Go Back
            </motion.button>
          </Link>
          <Link to="/dashboard">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn-primary flex items-center gap-2">
              <Home className="w-4 h-4" /> Dashboard
            </motion.button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
