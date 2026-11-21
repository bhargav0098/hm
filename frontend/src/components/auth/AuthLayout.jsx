import React from 'react';
import { motion } from 'framer-motion';
import { Brain, FileText, Mic, Target } from 'lucide-react';
import Brand from '../common/Brand';

const POINTS = [
  { icon: Brain, title: 'Skill gaps, mapped', sub: 'See what stands between you and the role' },
  { icon: FileText, title: 'A resume that passes ATS', sub: 'Scored and tuned to the job' },
  { icon: Mic, title: 'Interviews, rehearsed', sub: 'Mock sessions with live feedback' },
  { icon: Target, title: 'A 90-day plan', sub: 'Daily tasks toward your target role' },
];

const list = { hidden: {}, show: { transition: { staggerChildren: 0.11, delayChildren: 0.25 } } };
const item = {
  hidden: { opacity: 0, x: -36 },
  show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 140, damping: 16 } },
};

function BrandPanel() {
  return (
    <aside className="hidden lg:flex relative overflow-hidden flex-col justify-between p-12 xl:p-16 text-white bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700">
      {/* decorative outlined capsules */}
      <div aria-hidden className="absolute -right-24 bottom-10 space-y-4">
        {[22, 26, 18].map((w, i) => (
          <motion.div key={i} className="h-24 rounded-full border border-white/15"
            style={{ width: `${w}rem`, marginLeft: i === 1 ? '-3rem' : 0 }}
            animate={{ x: [0, i % 2 ? -16 : 16, 0] }} transition={{ duration: 9 + i * 2, repeat: Infinity, ease: 'easeInOut' }} />
        ))}
      </div>
      <div aria-hidden className="absolute -left-24 -top-24 w-80 h-80 rounded-full bg-primary-400/40 blur-3xl" />

      <Brand light />

      <div className="relative max-w-md">
        <h1 className="font-display font-bold text-4xl xl:text-5xl leading-[1.05] tracking-[-0.03em]">
          Your next role starts with the right plan.
        </h1>
        <motion.ul variants={list} initial="hidden" animate="show" className="mt-10 space-y-3">
          {POINTS.map((p) => (
            <motion.li key={p.title} variants={item}
              className="flex items-center gap-4 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm pl-2.5 pr-6 py-2.5">
              <span className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0"><p.icon className="w-5 h-5" /></span>
              <span>
                <span className="block font-semibold leading-tight">{p.title}</span>
                <span className="block text-sm text-primary-100 mt-0.5">{p.sub}</span>
              </span>
            </motion.li>
          ))}
        </motion.ul>
      </div>

      <p className="relative text-sm text-primary-100">Free to use. Add your own AI key in Settings for faster answers.</p>
    </aside>
  );
}

/** Split layout shared by sign in, register and password reset. */
export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <BrandPanel />
      <div className="relative flex items-center justify-center px-5 py-12">
        <div aria-hidden className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary-300/30 blur-3xl pointer-events-none" />
        <div className="relative w-full flex justify-center">{children}</div>
      </div>
    </div>
  );
}
