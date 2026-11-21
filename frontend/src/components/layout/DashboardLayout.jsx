import React, { Suspense, createContext, useContext, useState } from 'react';
import { Link, useLocation, useNavigate, useOutlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, LayoutDashboard, Briefcase, Mic, BookOpen,
  Target, MapPin, Settings, User, LogOut, Menu, X, FileText
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import FloatingAIChatbot from '../dashboard/FloatingAIChatbot';
import Brand from '../common/Brand';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Brain, label: 'Skill Analysis', path: '/skills' },
  { icon: BookOpen, label: 'Resume Builder', path: '/resume' },
  { icon: Briefcase, label: 'Job Matching', path: '/jobs' },
  { icon: Mic, label: 'Interview Prep', path: '/interview' },
  { icon: Target, label: 'Career Roadmap', path: '/roadmap' },
  { icon: MapPin, label: 'Local Jobs', path: '/opportunities' },
];
const intelligenceItems = [{ icon: FileText, label: 'Weekly Report', path: '/weekly-report' }];
const bottomItems = [
  { icon: Settings, label: 'Settings', path: '/settings' },
  { icon: User, label: 'Profile', path: '/profile' },
];

/* When a page renders <DashboardLayout> inside the persistent shell, it just yields its children. */
const ShellContext = createContext(false);

function NavItem({ item, active, onClick, group }) {
  return (
    <Link
      to={item.path}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`group relative flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-semibold transition-colors duration-200 ${
        active ? '' : 'hover:bg-primary-100/80'
      }`}
    >
      {active && (
        <motion.span
          layoutId={`nav-pill-${group}`}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className="absolute inset-0 rounded-full bg-pill-primary shadow-pill"
        />
      )}
      <item.icon className={`relative w-[18px] h-[18px] flex-shrink-0 transition-colors ${active ? 'text-white' : 'text-primary-400 group-hover:text-primary-500'}`} />
      <span className={`relative flex-1 transition-colors ${active ? 'text-white' : 'text-ink-soft group-hover:text-ink'}`}>{item.label}</span>
    </Link>
  );
}

function NavGroup({ title, items, pathname, onClick, group }) {
  return (
    <div className="space-y-1">
      <p className="text-ink-mute text-xs font-semibold px-4 pb-1">{title}</p>
      {items.map((item) => (
        <NavItem key={item.path} item={item} active={pathname === item.path} onClick={onClick} group={group} />
      ))}
    </div>
  );
}

function SidebarContent({ onClose, group, pathname, user, onLogout }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-6 pb-4">
        <Brand to="/dashboard" onClick={onClose} subtitle="Employment platform" />
      </div>

      <nav className="flex-1 px-3 pb-3 space-y-5 overflow-y-auto scrollbar-hide">
        <NavGroup title="AI agents" items={navItems} pathname={pathname} onClick={onClose} group={group} />
        <NavGroup title="Intelligence" items={intelligenceItems} pathname={pathname} onClick={onClose} group={group} />
        <NavGroup title="Account" items={bottomItems} pathname={pathname} onClick={onClose} group={group} />
      </nav>

      <div className="p-3">
        <div className="flex items-center gap-3 p-2.5 pr-4 rounded-full bg-primary-100/80 border border-primary-300/40">
          <img
            src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`}
            alt="" className="w-9 h-9 rounded-full bg-white border border-primary-300/60 flex-shrink-0 object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className="text-ink text-sm font-semibold truncate">{user?.fullName || 'Your account'}</p>
            <p className="text-ink-mute text-xs truncate">{user?.email}</p>
          </div>
          <button onClick={onLogout} aria-label="Sign out" title="Sign out"
            className="w-8 h-8 rounded-full flex items-center justify-center text-ink-mute hover:text-red-600 hover:bg-white transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Shell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => { await logout(); navigate('/login'); };
  const sidebarProps = { pathname, user, onLogout: handleLogout };

  return (
    <ShellContext.Provider value={true}>
      <div className="min-h-screen">
        {/* Desktop: a floating panel, not a wall */}
        <aside className="hidden lg:flex fixed left-4 top-4 bottom-4 w-64 z-30 flex-col rounded-[28px] bg-white/80 backdrop-blur-xl border border-primary-300/40 shadow-soft-lg">
          <SidebarContent {...sidebarProps} group="desktop" onClose={() => {}} />
        </aside>

        {/* Mobile drawer */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-40 lg:hidden" />
              <motion.aside
                initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
                transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                className="fixed left-3 top-3 bottom-3 w-72 max-w-[85vw] bg-canvas border border-primary-300/50 rounded-[28px] shadow-soft-lg z-50 lg:hidden">
                <button onClick={() => setSidebarOpen(false)} aria-label="Close menu"
                  className="absolute top-5 right-4 w-8 h-8 rounded-full flex items-center justify-center text-ink-mute hover:bg-primary-100 transition-colors">
                  <X className="w-5 h-5" />
                </button>
                <SidebarContent {...sidebarProps} group="mobile" onClose={() => setSidebarOpen(false)} />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <div className="lg:pl-72 min-h-screen flex flex-col">
          <header className="lg:hidden sticky top-3 z-20 mx-3 mt-3 flex items-center gap-3 pl-2 pr-4 py-2 rounded-full bg-white/85 backdrop-blur-xl border border-primary-300/40 shadow-soft">
            <button onClick={() => setSidebarOpen(true)} aria-label="Open menu"
              className="w-9 h-9 rounded-full flex items-center justify-center text-primary-500 hover:bg-primary-100 transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <Brand to="/dashboard" size={28} />
          </header>

          <main className="flex-1 p-4 lg:p-8 lg:pl-6">{children}</main>
        </div>
        <FloatingAIChatbot />
      </div>
    </ShellContext.Provider>
  );
}

const InShellLoader = () => (
  <div className="py-32 flex justify-center" role="status" aria-label="Loading">
    <div className="flex gap-1.5">
      {[0, 1, 2].map((i) => (
        <motion.span key={i} className="block h-3 w-8 rounded-full bg-primary-300"
          animate={{ opacity: [0.35, 1, 0.35], scaleX: [0.85, 1, 0.85] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15 }} />
      ))}
    </div>
  </div>
);

/** Route element: persistent sidebar + animated page swap. */
export function AppShell() {
  const location = useLocation();
  const outlet = useOutlet();
  return (
    <Shell>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <Suspense fallback={<InShellLoader />}>{outlet}</Suspense>
        </motion.div>
      </AnimatePresence>
    </Shell>
  );
}

export default function DashboardLayout({ children }) {
  const inShell = useContext(ShellContext);
  return inShell ? <>{children}</> : <Shell>{children}</Shell>;
}
