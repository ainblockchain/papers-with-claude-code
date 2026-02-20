'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Compass,
  Hammer,
  Map,
  LayoutDashboard,
  ArrowRight,
  Terminal,
  Sparkles,
  Github,
  BookOpen,
  Zap,
  Users,
} from 'lucide-react';
import { ClaudeMark } from '@/components/shared/ClaudeMark';

// ── Intersection Observer hook ───────────────────────────────────────────────
function useInView(threshold = 0.08) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

// ── Terminal animation ────────────────────────────────────────────────────────
const TERMINAL_LINES = [
  { text: '$ papers generate', color: 'text-emerald-400' },
  { text: '? arXiv URL › https://arxiv.org/abs/1706.03762', color: 'text-gray-300' },
  { text: '? Course name › Attention Is All You Need', color: 'text-gray-300' },
  { text: '', color: '' },
  { text: '◆ Fetching paper content…', color: 'text-[#5C8AFF]' },
  { text: '◆ Analysing with Claude Code…', color: 'text-[#5C8AFF]' },
  { text: '◆ Building 5 learning stages…', color: 'text-[#5C8AFF]' },
  { text: '◆ Generating concepts & quizzes…', color: 'text-[#5C8AFF]' },
  { text: '', color: '' },
  { text: '✓ Course pushed to GitHub', color: 'text-emerald-400' },
  { text: '✓ attention-is-all-you-need · ready', color: 'text-[#FF9D00]' },
];

function TerminalLines() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (count >= TERMINAL_LINES.length) return;
    const t = setTimeout(() => setCount((c) => c + 1), count === 0 ? 600 : 220);
    return () => clearTimeout(t);
  }, [count]);

  return (
    <>
      {TERMINAL_LINES.slice(0, count).map((line, i) => (
        <div key={i} className={`${line.color} leading-relaxed`}>
          {line.text || '\u00A0'}
        </div>
      ))}
      {count < TERMINAL_LINES.length && (
        <span className="inline-block w-2 h-3.5 bg-gray-400 animate-pulse rounded-sm" />
      )}
    </>
  );
}

// ── Data ─────────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Compass,
    title: 'Explore Papers',
    desc: 'Browse trending arXiv papers ranked by the community. Discover what researchers are reading right now.',
    href: '/explore',
    color: '#5C8AFF',
    gradient: 'from-[#5C8AFF]/20 to-[#5C8AFF]/0',
  },
  {
    icon: Hammer,
    title: 'Course Builder',
    desc: 'Point Claude Code at any arXiv URL, GitHub repo, or HuggingFace model — get an interactive course in minutes.',
    href: '/publish',
    color: '#FF9D00',
    gradient: 'from-[#FF9D00]/20 to-[#FF9D00]/0',
  },
  {
    icon: Map,
    title: 'Village',
    desc: 'See where fellow learners are exploring on a live map. Follow paths, discover new papers together.',
    href: '/village',
    color: '#22d3ee',
    gradient: 'from-[#22d3ee]/20 to-[#22d3ee]/0',
  },
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    desc: 'Track your learning progress, completed stages, and knowledge graph across all courses.',
    href: '/dashboard',
    color: '#a78bfa',
    gradient: 'from-[#a78bfa]/20 to-[#a78bfa]/0',
  },
];

const STEPS = [
  {
    n: '01',
    icon: BookOpen,
    title: 'Find a Paper',
    desc: 'Browse trending arXiv papers or paste any URL from arXiv, GitHub, or HuggingFace.',
    color: '#5C8AFF',
  },
  {
    n: '02',
    icon: Zap,
    title: 'Generate a Course',
    desc: 'Claude Code analyses the content and builds a structured course with stages, concepts, and quizzes — automatically.',
    color: '#FF9D00',
  },
  {
    n: '03',
    icon: Users,
    title: 'Learn Together',
    desc: 'Work through each stage in an interactive terminal. Test your understanding, then explore with the community.',
    color: '#22d3ee',
  },
];

// ── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const features = useInView(0.05);
  const steps = useInView(0.05);
  const cta = useInView(0.1);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#05050f] text-white overflow-x-hidden">

      {/* ── Ambient blobs ── */}
      <div className="fixed inset-0 pointer-events-none select-none" aria-hidden>
        <div className="absolute -top-[20%] -left-[10%] w-[700px] h-[700px] rounded-full bg-[#5C8AFF]/8 blur-[140px] animate-[blob1_14s_ease-in-out_infinite]" />
        <div className="absolute top-[35%] -right-[15%] w-[600px] h-[600px] rounded-full bg-[#FF9D00]/6 blur-[120px] animate-[blob2_18s_ease-in-out_infinite]" />
        <div className="absolute bottom-[5%] left-[15%] w-[500px] h-[500px] rounded-full bg-[#22d3ee]/5 blur-[100px] animate-[blob3_20s_ease-in-out_infinite]" />
        {/* Subtle grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      {/* ── Nav ── */}
      <nav className="relative z-50 flex items-center justify-between px-6 md:px-10 py-5 max-w-[1280px] mx-auto">
        <Link href="/" className="flex items-center gap-2.5 group">
          <ClaudeMark size={28} />
          <span className="font-bold text-base tracking-tight hidden sm:inline">
            Papers with Claude Code
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-7 text-sm text-gray-400">
          {[
            { href: '/explore', label: 'Explore' },
            { href: '/publish', label: 'Build' },
            { href: '/village', label: 'Village' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="hover:text-white transition-colors duration-200 relative group"
            >
              {label}
              <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-white group-hover:w-full transition-all duration-300" />
            </Link>
          ))}
        </div>

        <Link
          href="/login"
          className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-sm transition-all duration-200"
        >
          <Github className="h-4 w-4" />
          <span className="hidden sm:inline">Sign in</span>
        </Link>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 px-6 pt-14 pb-28 text-center max-w-[920px] mx-auto">
        {/* Badge */}
        <div
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#FF9D00]/30 bg-[#FF9D00]/8 text-[#FF9D00] text-xs font-medium mb-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Powered by Claude Code
        </div>

        {/* Headline */}
        <h1
          className={`text-5xl sm:text-6xl md:text-[72px] font-black leading-[1.04] tracking-tight mb-6 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
        >
          Learn Any Research Paper
          <br />
          <span className="bg-gradient-to-r from-[#5C8AFF] via-[#a78bfa] to-[#FF9D00] bg-clip-text text-transparent">
            with AI
          </span>
        </h1>

        {/* Sub */}
        <p
          className={`text-lg sm:text-xl text-gray-400 max-w-[580px] mx-auto mb-10 leading-relaxed transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
        >
          Transform arXiv papers, GitHub repos, and HuggingFace models into interactive
          learning courses — powered by Claude Code. Explore with a global community of AI
          researchers.
        </p>

        {/* CTAs */}
        <div
          className={`flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
        >
          <Link
            href="/explore"
            className="group flex items-center gap-2 px-7 py-3.5 bg-[#FF9D00] hover:bg-[#FF9D00]/90 text-white rounded-xl font-semibold text-sm transition-all shadow-[0_0_32px_rgba(255,157,0,0.35)] hover:shadow-[0_0_48px_rgba(255,157,0,0.55)] hover:scale-[1.02]"
          >
            <Compass className="h-4 w-4" />
            Explore Papers
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
          </Link>
          <Link
            href="/publish"
            className="flex items-center gap-2 px-7 py-3.5 bg-white/5 hover:bg-white/8 border border-white/10 hover:border-white/20 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02]"
          >
            <Terminal className="h-4 w-4" />
            Build a Course
          </Link>
        </div>

        {/* Terminal mockup */}
        <div
          className={`relative mt-20 mx-auto max-w-[680px] transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
        >
          {/* Glow ring */}
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-white/10 to-transparent" />

          <div className="relative rounded-2xl border border-white/8 bg-[#0d0d1f] shadow-[0_40px_80px_rgba(0,0,0,0.6)] overflow-hidden">
            {/* Title bar */}
            <div className="flex items-center gap-2 px-4 py-3 bg-[#13131f] border-b border-white/5">
              <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
              <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
              <div className="w-3 h-3 rounded-full bg-[#28C840]" />
              <span className="ml-3 text-xs text-gray-500 font-mono">
                Claude Code Terminal — generator mode
              </span>
              <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                live
              </span>
            </div>

            {/* Terminal body */}
            <div className="p-5 font-mono text-[13px] text-left space-y-0.5 min-h-[200px]">
              <TerminalLines />
            </div>
          </div>

          {/* Bottom glow */}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-2/3 h-12 bg-[#5C8AFF]/12 blur-2xl rounded-full" />
        </div>
      </section>

      {/* ── Features ── */}
      <section
        ref={features.ref}
        className="relative z-10 px-6 py-24 max-w-[1280px] mx-auto"
      >
        <div
          className={`text-center mb-14 transition-all duration-700 ${features.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Everything you need to learn faster
          </h2>
          <p className="text-gray-400 max-w-md mx-auto">
            From discovery to mastery — one platform built for AI researchers and students.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((feat, i) => (
            <Link
              key={feat.href}
              href={feat.href}
              className={`group relative p-6 rounded-2xl border border-white/6 bg-white/[0.025] hover:bg-white/[0.045] transition-all duration-500 hover:border-white/15 hover:-translate-y-1.5 cursor-pointer ${features.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: features.inView ? `${80 + i * 80}ms` : '0ms' }}
            >
              {/* Hover gradient */}
              <div
                className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
              />

              <div
                className="relative w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
                style={{ backgroundColor: `${feat.color}18`, color: feat.color }}
              >
                <feat.icon className="h-5 w-5" />
              </div>

              <h3 className="relative font-semibold text-sm mb-2">{feat.title}</h3>
              <p className="relative text-xs text-gray-500 leading-relaxed">{feat.desc}</p>

              {/* Bottom accent line */}
              <div
                className="absolute bottom-0 left-6 right-6 h-px opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-full"
                style={{ background: `linear-gradient(90deg, transparent, ${feat.color}60, transparent)` }}
              />

              <ArrowRight
                className="absolute bottom-5 right-5 h-4 w-4 opacity-0 group-hover:opacity-60 translate-x-1 group-hover:translate-x-0 transition-all duration-300"
                style={{ color: feat.color }}
              />
            </Link>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section
        ref={steps.ref}
        className="relative z-10 px-6 py-24 max-w-[860px] mx-auto"
      >
        <div
          className={`text-center mb-16 transition-all duration-700 ${steps.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            From paper to mastery in 3 steps
          </h2>
          <p className="text-gray-400 max-w-md mx-auto">
            Claude Code does the heavy lifting so you can focus on learning.
          </p>
        </div>

        <div className="relative space-y-6">
          {/* Vertical connector */}
          <div
            className={`absolute left-8 top-16 bottom-16 w-px transition-all duration-1000 delay-300 ${steps.inView ? 'opacity-100' : 'opacity-0'}`}
            style={{
              background:
                'linear-gradient(to bottom, #5C8AFF60, #FF9D0060, #22d3ee40, transparent)',
            }}
          />

          {STEPS.map((step, i) => (
            <div
              key={step.n}
              className={`relative flex gap-6 items-start transition-all duration-700 ${steps.inView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'}`}
              style={{ transitionDelay: steps.inView ? `${120 + i * 130}ms` : '0ms' }}
            >
              {/* Icon box */}
              <div
                className="shrink-0 w-16 h-16 rounded-2xl border border-white/8 bg-[#0d0d1f] flex items-center justify-center relative z-10"
                style={{ boxShadow: `0 0 20px ${step.color}20` }}
              >
                <step.icon className="h-6 w-6" style={{ color: step.color }} />
              </div>

              {/* Content */}
              <div className="flex-1 pt-3 pb-6">
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className="text-xs font-black font-mono tracking-wider"
                    style={{ color: step.color }}
                  >
                    {step.n}
                  </span>
                  <h3 className="font-semibold text-white">{step.title}</h3>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed max-w-[480px]">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        ref={cta.ref}
        className="relative z-10 px-6 py-28 text-center"
      >
        <div
          className={`max-w-[560px] mx-auto transition-all duration-700 ${cta.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          {/* Logo with glow */}
          <div className="relative inline-flex mb-8">
            <div className="absolute inset-0 blur-3xl bg-gradient-to-r from-[#5C8AFF]/30 to-[#FF9D00]/30 rounded-full scale-150" />
            <ClaudeMark size={60} className="relative" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold mb-5">
            Ready to start learning?
          </h2>
          <p className="text-gray-400 mb-10 leading-relaxed">
            Join researchers exploring AI papers with Claude Code.
            <br className="hidden sm:block" />
            No setup required.
          </p>

          <Link
            href="/explore"
            className="group inline-flex items-center gap-2.5 px-10 py-4 rounded-2xl font-bold text-base text-white transition-all duration-300 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #5C8AFF, #7c5cff, #FF9D00)',
              boxShadow: '0 0 50px rgba(92,138,255,0.35)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow =
                '0 0 70px rgba(92,138,255,0.55)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow =
                '0 0 50px rgba(92,138,255,0.35)';
            }}
          >
            Start Exploring
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/5 px-8 py-8 max-w-[1280px] mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <ClaudeMark size={16} />
            <span>Papers with Claude Code</span>
          </div>
          <div className="flex gap-6">
            {[
              { href: '/explore', label: 'Explore' },
              { href: '/publish', label: 'Build' },
              { href: '/village', label: 'Village' },
              { href: '/dashboard', label: 'Dashboard' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="hover:text-gray-300 transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </footer>

      {/* ── Keyframe animations ── */}
      <style>{`
        @keyframes blob1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(50px, -40px) scale(1.06); }
          66%       { transform: translate(-25px, 25px) scale(0.96); }
        }
        @keyframes blob2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(-40px, 50px) scale(1.08); }
          66%       { transform: translate(30px, -25px) scale(0.93); }
        }
        @keyframes blob3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(35px, 35px) scale(1.07); }
        }
      `}</style>
    </div>
  );
}
