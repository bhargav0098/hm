import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, LayoutDashboard, Briefcase, Mic, BookOpen,
  Target, MapPin, Settings, User, LogOut, Menu, X,
  ChevronRight, Zap, Users, FileText
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import FloatingAIChatbot from '../dashboard/FloatingAIChatbot';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Brain, label: 'Skill Analysis', path: '/skills' },
  { icon: BookOpen, label: 'Resume Builder', path: '/resume' },
  { icon: Briefcase, label: 'Job Matching', path: '/jobs' },
  { icon: Mic, label: 'Interview Prep', path: '/interview' },
  { icon: Target, label: 'Career Roadmap', path: '/roadmap' },
  { icon: MapPin, label: 'Local Jobs', path: '/opportunities' },
];

const intelligenceItems = [
  { icon: Users, label: 'Career Twin', path: '/career-twin' },
  { icon: FileText, label: 'Weekly Report', path: '/weekly-report' },
];

const bottomItems = [
  { icon: Settings, label: 'Settings', path: '/settings' },
  { icon: User, label: 'Profile', path: '/profile' },
];

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const NavLink = ({ item, onClick }) => {
    const active = location.pathname === item.path;
    return (
      <Link to={item.path} onClick={onClick}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
          ${active
            ? 'bg-gradient-to-r from-primary-500/20 to-accent-purple/10 text-white border border-primary-500/30'
            : 'text-white/50 hover:text-white hover:bg-white/8'
          }`}>
        <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-primary-400' : 'group-hover:text-primary-400 transition-colors'}`} />
        <span className="flex-1">{item.label}</span>
        {active && <ChevronRight className="w-3.5 h-3.5 text-primary-400" />}
      </Link>
    );
  };

  const SidebarContent = ({ onClose }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-white/8">
        <Link to="/dashboard" onClick={onClose} className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center shadow-lg shadow-primary-500/30">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-black text-white text-sm">CareerIQ AI</p>
            <p className="text-white/50 text-xs">Employment Platform</p>
          </div>
        </Link>
      </div>



      {/* Main Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="text-white/40 text-xs font-semibold uppercase tracking-wider px-3 mb-2">AI Agents</p>
        {navItems.map(item => (
          <NavLink key={item.path} item={item} onClick={onClose} />
        ))}

        <div className="pt-4 pb-1">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider px-3 mb-2">Intelligence</p>
        </div>
        {intelligenceItems.map(item => (
          <NavLink key={item.path} item={item} onClick={onClose} />
        ))}

        <div className="pt-4 pb-1">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider px-3 mb-2">Account</p>
        </div>
        {bottomItems.map(item => (
          <NavLink key={item.path} item={item} onClick={onClose} />
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-white/8">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 mb-3">
          <img
            src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`}
            alt="avatar" className="w-8 h-8 rounded-full border border-white/20 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{user?.fullName}</p>
            <p className="text-white/50 text-xs truncate">{user?.email}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-white/50 hover:text-red-400 hover:bg-red-500/10 text-sm transition-all">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-dark-900">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-dark-800/80 border-r border-white/8 backdrop-blur-xl fixed inset-y-0 left-0 z-30">
        <SidebarContent onClose={() => {}} />
      </aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden" />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-dark-800 border-r border-white/10 z-50 lg:hidden">
              <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
              <SidebarContent onClose={() => setSidebarOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center gap-4 px-4 py-4 bg-dark-800/80 backdrop-blur-xl border-b border-white/8 sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="text-white/50 hover:text-white transition-colors">
            <Menu className="w-6 h-6" />
          </button>
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-white text-sm">CareerIQ AI</span>
          </Link>
        </header>

        <main className="flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>
      <FloatingAIChatbot />
    </div>
  );
}
