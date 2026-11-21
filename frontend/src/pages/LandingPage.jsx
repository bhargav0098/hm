import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  motion, AnimatePresence, useScroll, useSpring, useInView, useMotionValueEvent
} from 'framer-motion';
import {
  Brain, Briefcase, Mic, BookOpen, Target, MapPin, ArrowRight, Check, Plus, FileText
} from 'lucide-react';
import Brand from '../components/common/Brand';

/* ─────────────────────────────── Content ─────────────────────────────── */

const AGENTS = [
  {
    icon: Brain, title: 'Skill Analysis',
    desc: 'Upload your skills and get a gap analysis, career path suggestions and a personalized learning roadmap.',
    points: ['Gap analysis against your target role', 'Mastery level for every skill', 'Market demand and a learning order'],
    sampleTitle: 'Skill gaps for a Frontend Developer role',
    rows: [['React', 82, 'Strong'], ['TypeScript', 38, 'Gap'], ['Testing', 24, 'Gap']],
  },
  {
    icon: BookOpen, title: 'Resume Builder',
    desc: 'Create ATS-optimized resumes with AI suggestions, keyword optimization and real-time scoring to get past automated filters.',
    points: ['ATS score with a full breakdown', 'Keyword suggestions for the role', 'Live preview, templates and PDF export'],
    sampleTitle: 'ATS score breakdown',
    rows: [['Keywords', 90, 'Great'], ['Formatting', 96, 'Great'], ['Action verbs', 71, 'Improve']],
  },
  {
    icon: Briefcase, title: 'Job Matching',
    desc: 'Get matched with relevant jobs, internships and freelance projects based on your exact skills and career goals.',
    points: ['Matches ranked by confidence', 'Salary prediction, remote and hybrid filters', 'Direct apply links'],
    sampleTitle: 'Top matches this week',
    rows: [['React Developer, remote', 94, '94%'], ['Frontend Intern', 88, '88%'], ['UI Engineer, hybrid', 79, '79%']],
  },
  {
    icon: Mic, title: 'Interview Prep',
    desc: 'Practice with realistic mock interviews, get AI feedback on your answers and build confidence before the real thing.',
    points: ['Role-specific HR, technical and behavioral questions', 'Answer scoring in real time', 'A performance report afterwards'],
    sampleTitle: 'Your last mock interview',
    rows: [['Clarity', 88, 'Good'], ['Technical depth', 64, 'Improve'], ['Confidence', 79, 'Good']],
  },
  {
    icon: Target, title: 'Career Roadmap',
    desc: 'Get a personalized 90-day plan with daily routines, key milestones and step-by-step guidance toward your target role.',
    points: ['30 to 180 day plans', 'Weekly and monthly goals', 'A milestone tracker you can tick off'],
    sampleTitle: 'Your first three weeks',
    rows: [['Week 1: Foundations', 100, 'Done'], ['Week 2: Core skills', 60, 'In progress'], ['Week 3: First project', 0, 'Up next']],
  },
  {
    icon: MapPin, title: 'Local Opportunity',
    desc: 'Find walk-in drives, government job openings, nearby skill centers and online portals tailored to your location.',
    points: ['Walk-in drives and government portals', 'Search across cities, states and countries', 'Skill centers near you'],
    sampleTitle: 'Near you right now',
    rows: [['Walk-in drives', 70, '6 this week'], ['Government portals', 85, '12 open'], ['Skill centers', 45, '3 nearby']],
  },
];

const STEPS = [
  { title: 'Create your profile', desc: 'Register and enter your current skills, education and target role.' },
  { title: 'AI analyzes your profile', desc: 'The Skill Analysis agent finds your gaps and builds your learning roadmap.' },
  { title: 'Build your resume', desc: 'The Resume agent optimizes your CV for ATS with keyword recommendations.' },
  { title: 'Discover matching jobs', desc: 'The Job Matching agent finds opportunities that fit your profile.' },
  { title: 'Practice interviews', desc: 'The Interview agent runs mock sessions with real-time feedback.' },
  { title: 'Get hired', desc: 'Follow your 90-day roadmap and track progress until the offer arrives.' },
];

const FAQS = [
  { q: 'Is this platform completely free?', a: 'Yes. The platform is free to use. You can optionally add your own AI API keys (like the Gemini free tier) for enhanced performance, but it works with its default configuration too.' },
  { q: 'What if I have no prior work experience?', a: 'The platform is designed for freshers and job seekers at every level. The Skill Analysis agent builds a roadmap from your current knowledge.' },
  { q: 'How accurate is the job matching?', a: 'Matching is powered by Gemini AI, which compares your skills against current market demand. The more detail you give about your skills, the better the matches.' },
  { q: 'Can I practice interview questions for any role?', a: 'Yes. The Interview Prep agent generates role-specific HR, technical and behavioral questions for any job title you enter.' },
  { q: 'Is my data safe?', a: 'Your data is stored securely in MongoDB Atlas, and API keys are encrypted with AES-256 before storage. We never share your data with third parties.' },
  { q: 'Can I use my own Gemini or OpenAI API key?', a: 'Yes. Open Settings and add your own keys. They use your personal quota and can give faster responses.' },
];

const STORIES = [
  { name: 'Priya S.', role: 'Hired as a React Developer', tone: 'bg-primary-500 text-white', text: 'The skill analysis was spot on. It told me to learn React and TypeScript, and within 2 months I landed my first dev job.' },
  { name: 'Rahul M.', role: 'Junior Data Analyst at Infosys', tone: 'bg-primary-400 text-white', text: 'The mock interviews were incredible. I felt confident in the real one because I had already practiced similar questions.' },
  { name: 'Anjali K.', role: 'Full Stack Intern at a startup', tone: 'bg-primary-300 text-primary-800', text: 'As a fresher with no experience, I went from zero to an internship in six weeks. The roadmap really works.' },
];

/* ─────────────────────────── Hero capsule stack ─────────────────────────── */

const TONES = {
  primary:    { bg: 'bg-pill-primary shadow-pill',   name: 'text-white',       out: 'text-white',          icon: 'bg-white/15 text-white' },
  accent:     { bg: 'bg-pill-accent shadow-pill',    name: 'text-white',       out: 'text-white',          icon: 'bg-white/20 text-white' },
  secondary:  { bg: 'bg-pill-secondary shadow-pill-light', name: 'text-primary-800', out: 'text-primary-800', icon: 'bg-white/55 text-primary-600' },
  surface:    { bg: 'bg-pill-surface shadow-pill-light',   name: 'text-ink',         out: 'text-primary-600', icon: 'bg-white text-primary-500' },
  background: { bg: 'bg-white shadow-pill-light border border-primary-100', name: 'text-ink', out: 'text-primary-600', icon: 'bg-primary-100 text-primary-500' },
};

const PILLS = [
  { tone: 'primary',    icon: Brain,     name: 'Skill Analysis',  out: '7 gaps mapped' },
  { tone: 'accent',     icon: FileText,  name: 'Resume Builder',  out: 'ATS score 92' },
  { tone: 'secondary',  icon: Briefcase, name: 'Job Matching',    out: '24 matches' },
  { tone: 'surface',    icon: Mic,       name: 'Interview Prep',  out: '12 questions ready' },
  { tone: 'background', icon: Target,    name: 'Career Roadmap',  out: 'Day 14 of 90' },
];

const stackVariants = { hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.35 } } };
const pillVariants = {
  hidden: { opacity: 0, y: -90, rotate: -1.5, scale: 0.97 },
  show: { opacity: 1, y: 0, rotate: 0, scale: 1, transition: { type: 'spring', stiffness: 120, damping: 14, mass: 0.9 } },
};

function CapsuleStack() {
  return (
    <div className="relative">
      <div aria-hidden className="absolute -inset-10 -z-10 rounded-full bg-primary-300/40 blur-3xl animate-drift" />
      <motion.ul variants={stackVariants} initial="hidden" animate="show" className="animate-breathe max-w-[30rem] mx-auto lg:ml-auto lg:mr-0">
        {PILLS.map((p, i) => {
          const t = TONES[p.tone];
          const last = i === PILLS.length - 1;
          return (
            <motion.li
              key={p.name}
              variants={pillVariants}
              whileHover={{ x: -10, y: -4, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
              style={{ zIndex: i + 1 }}
              className={`relative flex items-center gap-3.5 rounded-full pl-3 pr-5 h-[5.5rem] sm:h-24 ${last ? '' : 'pb-6 sm:pb-7'} ${i ? '-mt-5' : ''} ${t.bg}`}
            >
              <span className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${t.icon}`}>
                <p.icon className="w-5 h-5" />
              </span>
              <span className={`font-display font-bold text-lg sm:text-xl tracking-tight ${t.name}`}>{p.name}</span>
              <span className={`ml-auto text-xs sm:text-sm font-semibold whitespace-nowrap ${t.out}`}>{p.out}</span>
            </motion.li>
          );
        })}
      </motion.ul>
    </div>
  );
}

/* ─────────────────────────────── Nav ─────────────────────────────── */

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 12));
  return (
    <motion.nav
      initial={{ y: -24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-4 inset-x-4 z-50 mx-auto max-w-5xl rounded-full border backdrop-blur-xl transition-all duration-300 ${
        scrolled ? 'bg-white/90 border-primary-300/60 shadow-soft-lg' : 'bg-white/60 border-primary-300/30 shadow-soft'
      }`}
    >
      <div className="flex items-center justify-between h-14 pl-5 pr-2">
        <Brand size={30} />
        <div className="hidden md:flex items-center gap-1 text-sm font-semibold text-ink-soft">
          {[['Agents', '#agents'], ['How it works', '#how'], ['Stories', '#stories'], ['FAQ', '#faq']].map(([l, h]) => (
            <a key={h} href={h} className="px-4 py-2 rounded-full hover:bg-primary-100 hover:text-primary-500 transition-colors">{l}</a>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Link to="/login" className="px-4 py-2 rounded-full text-sm font-semibold text-ink-soft hover:text-primary-500 hover:bg-primary-100 transition-colors">Sign in</Link>
          <Link to="/register" className="btn-primary text-sm !py-2.5 !px-5">Start free</Link>
        </div>
      </div>
    </motion.nav>
  );
}

/* ─────────────────────────────── Agents ─────────────────────────────── */

function SampleRow({ label, pct, tag, i }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="font-semibold text-ink">{label}</span>
        <span className="chip !py-0.5 !bg-white">{tag}</span>
      </div>
      <div className="h-2.5 rounded-full bg-white overflow-hidden">
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, delay: 0.15 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-400"
        />
      </div>
    </div>
  );
}

function Agents() {
  const [active, setActive] = useState(0);
  const a = AGENTS[active];
  return (
    <section id="agents" className="py-24 px-4 scroll-mt-16">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-16 items-start">
        <div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold leading-[1.05] text-ink">Six agents, one goal: getting you hired</h2>
          <p className="mt-5 text-lg text-ink-soft max-w-md">Each agent handles one part of your job search. Pick one to see what it hands back to you.</p>

          <div role="tablist" aria-label="AI agents" className="mt-8 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
            {AGENTS.map((ag, i) => {
              const on = i === active;
              return (
                <button
                  key={ag.title} role="tab" aria-selected={on} onClick={() => setActive(i)}
                  className={`relative flex items-center gap-3 rounded-full pl-2.5 pr-5 py-2.5 text-left font-semibold whitespace-nowrap transition-colors duration-200 border ${
                    on ? 'border-transparent' : 'border-primary-300/40 bg-white/60 hover:bg-white hover:border-primary-400/50'
                  }`}
                >
                  {on && (
                    <motion.span layoutId="agent-pill" transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      className="absolute inset-0 rounded-full bg-pill-primary shadow-pill" />
                  )}
                  <span className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-colors ${on ? 'bg-white/15 text-white' : 'bg-primary-100 text-primary-500'}`}>
                    <ag.icon className="w-[18px] h-[18px]" />
                  </span>
                  <span className={`relative transition-colors ${on ? 'text-white' : 'text-ink'}`}>{ag.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div role="tabpanel" className="rounded-[2rem] bg-white/80 border border-primary-300/40 shadow-soft-lg p-6 sm:p-8 min-h-[30rem] backdrop-blur">
          <AnimatePresence mode="wait">
            <motion.div key={a.title} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
              <div className="flex items-center gap-4">
                <span className="w-14 h-14 rounded-full bg-pill-accent shadow-pill flex items-center justify-center text-white"><a.icon className="w-6 h-6" /></span>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-ink">{a.title} agent</h3>
              </div>
              <p className="mt-5 text-ink-soft text-[1.05rem] leading-relaxed max-w-xl">{a.desc}</p>
              <ul className="mt-5 space-y-2.5">
                {a.points.map((pt) => (
                  <li key={pt} className="flex items-start gap-3 text-ink">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-primary-100 text-primary-500 flex items-center justify-center flex-shrink-0"><Check className="w-3 h-3" strokeWidth={3} /></span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-7 rounded-3xl bg-surface p-5 sm:p-6">
                <p className="text-sm font-semibold text-primary-500 mb-4">{a.sampleTitle}</p>
                <div className="space-y-4">
                  {a.rows.map(([label, pct, tag], i) => <SampleRow key={label} label={label} pct={pct} tag={tag} i={i} />)}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────── How it works ─────────────────────────────── */

function Step({ n, title, desc }) {
  const ref = useRef(null);
  const reached = useInView(ref, { margin: '0px 0px -55% 0px', once: true });
  return (
    <li ref={ref} className="relative flex gap-5 pb-12 last:pb-0">
      <span
        className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-base flex-shrink-0 border-2 transition-all duration-500 ${
          reached ? 'bg-primary-500 border-primary-500 text-white shadow-glow scale-100' : 'bg-white border-primary-300 text-primary-400 scale-90'
        }`}
      >{n}</span>
      <div className="pt-1.5">
        <h3 className={`font-display text-xl font-bold transition-colors duration-500 ${reached ? 'text-ink' : 'text-ink/50'}`}>{title}</h3>
        <p className="mt-1 text-ink-soft max-w-md">{desc}</p>
      </div>
    </li>
  );
}

function HowItWorks() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 60%', 'end 70%'] });
  const scaleY = useSpring(scrollYProgress, { stiffness: 110, damping: 26, restDelta: 0.001 });
  return (
    <section id="how" className="py-24 px-4 bg-surface/60 scroll-mt-16">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-16">
        <div className="lg:sticky lg:top-28 self-start">
          <h2 className="font-display text-4xl sm:text-5xl font-bold leading-[1.05] text-ink">From zero to a job offer in 90 days</h2>
          <p className="mt-5 text-lg text-ink-soft max-w-md">Follow the path in order. Each step feeds the next, so your roadmap, resume and interview practice all point at the same role.</p>
          <Link to="/register" className="btn-primary mt-8">Start your 90 days <ArrowRight className="w-4 h-4" /></Link>
        </div>

        <div ref={ref} className="relative">
          <div aria-hidden className="absolute left-5 -translate-x-1/2 top-5 bottom-5 w-1 rounded-full bg-primary-200" />
          <motion.div aria-hidden style={{ scaleY }} className="absolute left-5 -translate-x-1/2 top-5 bottom-5 w-1 rounded-full bg-gradient-to-b from-primary-500 to-primary-400 origin-top" />
          <ol className="relative">
            {STEPS.map((s, i) => <Step key={s.title} n={i + 1} {...s} />)}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────── Stories ─────────────────────────────── */

const Avatar = ({ name, tone }) => (
  <span className={`w-11 h-11 rounded-full flex items-center justify-center font-display font-bold flex-shrink-0 ${tone}`}>{name[0]}</span>
);

function Stories() {
  const [big, ...small] = STORIES;
  const reveal = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' } };
  return (
    <section id="stories" className="py-24 px-4 scroll-mt-16">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-display text-4xl sm:text-5xl font-bold leading-[1.05] text-ink max-w-2xl">Real people, real results</h2>
        <div className="mt-12 grid lg:grid-cols-5 gap-5">
          <motion.figure {...reveal} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-3 lg:row-span-2 rounded-[2rem] bg-primary-500 text-white p-8 sm:p-10 flex flex-col justify-between shadow-soft-lg relative overflow-hidden">
            <div aria-hidden className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-primary-400/40 blur-2xl" />
            <blockquote className="relative font-display text-2xl sm:text-3xl lg:text-4xl font-semibold leading-snug">{big.text}</blockquote>
            <figcaption className="relative mt-10 flex items-center gap-3">
              <Avatar name={big.name} tone="bg-white text-primary-500" />
              <span><span className="block font-semibold">{big.name}</span><span className="block text-sm text-primary-200">{big.role}</span></span>
            </figcaption>
          </motion.figure>

          {small.map((s, i) => (
            <motion.figure key={s.name} {...reveal} transition={{ duration: 0.6, delay: 0.12 * (i + 1), ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-2 rounded-[1.75rem] bg-white/85 border border-primary-300/40 shadow-soft p-6 sm:p-7 flex flex-col justify-between gap-6">
              <blockquote className="text-ink leading-relaxed">{s.text}</blockquote>
              <figcaption className="flex items-center gap-3">
                <Avatar name={s.name} tone={s.tone} />
                <span><span className="block font-semibold text-ink">{s.name}</span><span className="block text-sm text-ink-mute">{s.role}</span></span>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────── FAQ ─────────────────────────────── */

function FAQ({ q, a, open, onToggle }) {
  return (
    <div className={`rounded-3xl border transition-colors duration-300 ${open ? 'bg-white border-primary-400/50 shadow-soft' : 'bg-white/60 border-primary-300/40 hover:border-primary-400/50'}`}>
      <button onClick={onToggle} aria-expanded={open} className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left">
        <span className="font-semibold text-ink">{q}</span>
        <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${open ? 'bg-primary-500 text-white rotate-[135deg]' : 'bg-primary-100 text-primary-500'}`}>
          <Plus className="w-4 h-4" />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
            <p className="px-6 pb-6 text-ink-soft leading-relaxed max-w-2xl">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FAQSection() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="py-24 px-4 bg-surface/60 scroll-mt-16">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-16">
        <div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold leading-[1.05] text-ink">Questions, answered</h2>
          <p className="mt-5 text-lg text-ink-soft max-w-md">Can’t find yours? Create an account and ask the AI career mentor directly.</p>
        </div>
        <div className="space-y-3">
          {FAQS.map((f, i) => <FAQ key={f.q} {...f} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />)}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────── CTA + footer ─────────────────────────────── */

function FinalCTA() {
  return (
    <section className="py-24 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative max-w-6xl mx-auto overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary-600 to-primary-500 text-white px-8 sm:px-14 py-16 sm:py-20 shadow-soft-lg"
      >
        {/* decorative capsules echo the logo */}
        <div aria-hidden className="absolute -right-10 top-1/2 -translate-y-1/2 hidden md:block">
          {['bg-primary-400/70 w-72', 'bg-primary-300/60 w-80 -ml-10', 'bg-primary-100/50 w-64 ml-6'].map((c, i) => (
            <motion.div key={i} className={`h-20 rounded-full -mt-4 first:mt-0 ${c}`}
              animate={{ x: [0, i % 2 ? -14 : 14, 0] }} transition={{ duration: 7 + i, repeat: Infinity, ease: 'easeInOut' }} />
          ))}
        </div>
        <div className="relative max-w-xl">
          <h2 className="font-display text-4xl sm:text-5xl font-bold leading-[1.05]">Ready to land your dream job?</h2>
          <p className="mt-5 text-lg text-primary-100">Create a free account and meet your six agents. No credit card needed.</p>
          <Link to="/register" className="mt-9 inline-flex items-center gap-2 rounded-full bg-white text-primary-500 font-semibold px-8 py-4 text-lg shadow-[0_18px_36px_-14px_rgba(0,0,0,0.5)] hover:-translate-y-0.5 hover:bg-primary-50 active:scale-[0.97] transition-all duration-300">
            Create free account <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="px-4 pb-10 pt-4">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-ink-mute">
        <Brand size={26} />
        <p>AI-powered career assistance for job seekers</p>
        <p>© {new Date().getFullYear()} CareerIQ AI</p>
      </div>
    </footer>
  );
}

/* ─────────────────────────────── Page ─────────────────────────────── */

const rise = (delay) => ({
  initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] },
});

export default function LandingPage() {
  return (
    <div className="min-h-screen text-ink overflow-x-clip">
      <Nav />

      {/* Hero */}
      <header className="relative pt-36 pb-24 px-4">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.05fr_0.95fr] gap-14 lg:gap-8 items-center">
          <div>
            <motion.h1 {...rise(0.05)} className="font-display font-bold text-ink text-[clamp(2.75rem,6.2vw,5rem)] leading-[1.02] tracking-[-0.035em]">
              Your job search, run by six AI agents.
            </motion.h1>
            <motion.p {...rise(0.15)} className="mt-6 text-lg sm:text-xl text-ink-soft leading-relaxed max-w-xl">
              Analyze your skills, build an ATS-ready resume, find matching jobs, rehearse interviews and follow a 90-day plan, all in one place.
            </motion.p>
            <motion.div {...rise(0.25)} className="mt-9 flex flex-col sm:flex-row gap-3">
              <Link to="/register" className="btn-primary text-lg !px-8 !py-4">Start free <ArrowRight className="w-5 h-5" /></Link>
              <a href="#agents" className="btn-ghost text-lg !px-8 !py-4">See the agents</a>
            </motion.div>
            <motion.ul {...rise(0.35)} className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-ink-soft">
              {['Free to use', 'No credit card'].map((l) => (
                <li key={l} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-500 flex items-center justify-center"><Check className="w-3 h-3" strokeWidth={3} /></span>{l}
                </li>
              ))}
            </motion.ul>
          </div>

          <CapsuleStack />
        </div>
      </header>

      <main>
        <Agents />
        <HowItWorks />
        <Stories />
        <FAQSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
