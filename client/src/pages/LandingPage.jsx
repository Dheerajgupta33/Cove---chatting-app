import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BarChart3, CalendarClock, Check, CheckCheck, Lock, Mic, Pin, Play, Search, ShieldCheck, Sparkles, Users } from 'lucide-react';
import Logo from '../components/common/Logo';
import ThemeToggle from '../components/common/ThemeToggle';
import Seo from '../components/common/Seo';
import Avatar from '../components/common/Avatar';
import { buttonStyles } from '../components/common/Button';
import { Dots } from '../components/chat/TypingIndicator';
import { cn } from '../lib/utils';

/* ------------------------------------------------------------------ live demo (the hero's one moment of motion) */

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function Bubble({ m }) {
  const own = m.from === 'You';
  return (
    <motion.div layout initial={{ opacity: 0, y: 14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', damping: 24, stiffness: 320 }} className={cn('flex items-end gap-2', own && 'justify-end')}>
      {!own && <Avatar name={m.from} size="sm" />}
      <div className="max-w-[78%]">
        <div className={cn('relative rounded-2xl px-3.5 py-2 text-sm shadow-sm', own ? 'rounded-br-md bg-bubble-own text-white' : 'rounded-bl-md bg-surface text-ink ring-1 ring-line/70')}>
          {m.voice ? (
            <div className="flex w-44 items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white"><Play className="ml-0.5 h-3.5 w-3.5" /></span>
              <span className="flex h-6 flex-1 items-center gap-[2px]">{Array.from({ length: 22 }, (_, i) => <span key={i} className="w-[3px] rounded-full bg-sub/50" style={{ height: `${25 + Math.abs(Math.sin(i * 1.7)) * 75}%` }} />)}</span>
              <span className="text-[11px] text-sub">0:12</span>
            </div>
          ) : m.poll ? (
            <div className="w-52 space-y-1.5">
              <p className="font-semibold">📊 Dessert on Friday?</p>
              {[['Tiramisu', m.poll[0]], ['Mango sorbet', m.poll[1]]].map(([label, v]) => (
                <div key={label} className="relative overflow-hidden rounded-lg bg-white/15 px-2.5 py-1.5 text-xs">
                  <motion.span className="absolute inset-y-0 left-0 bg-white/25" animate={{ width: `${(v / Math.max(1, m.poll[0] + m.poll[1])) * 100}%` }} />
                  <span className="relative flex justify-between"><span>{label}</span><span>{v}</span></span>
                </div>
              ))}
            </div>
          ) : m.text}
          <span className={cn('mt-0.5 flex items-center justify-end gap-1 text-[10px]', own ? 'text-white/75' : 'text-sub')}>
            {m.time}{own && (m.seen ? <CheckCheck className="h-3 w-3 text-cyan-200" /> : <Check className="h-3 w-3" />)}
          </span>
        </div>
        {m.reaction && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }} className="-mt-1.5 ml-3 inline-flex items-center gap-1 rounded-full border border-line bg-surface px-1.5 py-0.5 text-xs shadow-sm">🎉 <b>2</b></motion.span>}
      </div>
    </motion.div>
  );
}

function LiveDemo() {
  const reduce = useReducedMotion();
  const [msgs, setMsgs] = useState([]);
  const [typing, setTyping] = useState(null);

  useEffect(() => {
    const all = [
      { id: 1, from: 'Maya', text: 'Did anyone book the venue for Friday?', time: '6:41' },
      { id: 2, from: 'Ravi', text: 'Yes! 7pm on the rooftop. Menu coming up 🍽️', time: '6:41' },
      { id: 3, from: 'Ravi', voice: true, time: '6:42' },
      { id: 4, from: 'You', text: 'Perfect. Let’s vote on dessert 🍰', time: '6:42', seen: true },
      { id: 5, from: 'You', poll: [2, 1], time: '6:43', seen: true },
    ];
    if (reduce) { setMsgs(all.map((m) => (m.id === 2 ? { ...m, reaction: true } : m))); return undefined; }

    let stop = false;
    const push = (m) => setMsgs((l) => [...l, m]);
    (async () => {
      while (!stop) {
        setMsgs([]);
        await wait(900); if (stop) return; push(all[0]);
        await wait(700); setTyping('Ravi'); await wait(1500); setTyping(null); push(all[1]);
        await wait(800); setMsgs((l) => l.map((m) => (m.id === 2 ? { ...m, reaction: true } : m)));
        await wait(900); setTyping('Ravi'); await wait(1100); setTyping(null); push(all[2]);
        await wait(1200); push(all[3]);
        await wait(900); push(all[4]);
        await wait(900); setMsgs((l) => l.map((m) => (m.poll ? { ...m, poll: [3, 1] } : m)));
        await wait(700); setMsgs((l) => l.map((m) => (m.poll ? { ...m, poll: [3, 2] } : m)));
        await wait(5200);
      }
    })();
    return () => { stop = true; };
  }, [reduce]);

  return (
    <div className="glass-strong relative w-full max-w-md overflow-hidden rounded-[28px] shadow-pop" aria-label="Animated preview of a Cove group chat" role="img">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <div className="flex -space-x-2">{['Maya', 'Ravi', 'Jo'].map((n) => <Avatar key={n} name={n} size="sm" className="ring-2 ring-surface" />)}</div>
        <div className="min-w-0 flex-1"><p className="truncate font-display text-sm font-bold">Friday dinner</p><p className="text-xs text-sub">4 members · 3 online</p></div>
        <Pin className="h-4 w-4 text-brand" />
      </div>
      <div className="chat-wallpaper flex h-[420px] flex-col justify-end gap-2.5 overflow-hidden p-4">
        <AnimatePresence initial={false}>{msgs.map((m) => <Bubble key={m.id} m={m} />)}</AnimatePresence>
        {typing && <div className="flex items-end gap-2"><Avatar name={typing} size="sm" /><div className="rounded-2xl rounded-bl-md bg-surface px-3.5 py-3 text-sub ring-1 ring-line/70"><Dots /></div></div>}
      </div>
      <div className="flex items-center gap-2 border-t border-line px-3 py-2.5">
        <div className="flex-1 rounded-2xl bg-surface-2 px-4 py-2.5 text-sm text-sub">Write a message…</div>
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-2 text-sub"><Mic className="h-4 w-4" /></span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ page */

const FEATURES = [
  { icon: Users, title: 'Rooms with roles', body: 'Create groups of up to 256 people, hand out admin rights, @mention teammates and pin the message everyone needs to see.', span: 'md:col-span-4', tone: 'brand' },
  { icon: Mic, title: 'Say it your way', body: 'Hold to record a voice note, or drag photos, video and documents straight into the chat.', span: 'md:col-span-2' },
  { icon: BarChart3, title: 'Polls that settle it', body: 'Ask the group, watch the votes move in real time.', span: 'md:col-span-2' },
  { icon: CalendarClock, title: 'Send later', body: 'Schedule a message for tomorrow morning. Cove delivers it even if you are offline.', span: 'md:col-span-2' },
  { icon: Sparkles, title: 'Cove AI', body: 'A built-in assistant for drafts, summaries and quick answers.', span: 'md:col-span-2', tone: 'ai' },
  { icon: Search, title: 'Find anything', body: 'Search every conversation, follow #hashtags, star what matters and export a backup whenever you like.', span: 'md:col-span-3' },
  { icon: ShieldCheck, title: 'You set the boundaries', body: 'Hide your last-seen, turn off read receipts, block or report anyone. Moderators review every report.', span: 'md:col-span-3' },
];

export default function LandingPage() {
  const signedIn = useSelector((s) => s.auth.status === 'authenticated');
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <Seo />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[46rem] opacity-70" style={{ background: 'radial-gradient(48rem 26rem at 15% 0%, rgb(var(--brand) / .28), transparent 65%), radial-gradient(40rem 28rem at 90% 10%, rgb(var(--brand-2) / .22), transparent 65%)' }} />

      <header className="glass sticky top-0 z-30 border-x-0 border-t-0">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link to="/" aria-label="Cove home"><Logo /></Link>
          <nav className="flex items-center gap-2" aria-label="Site">
            <ThemeToggle />
            {signedIn ? <Link to="/app/chat" className={buttonStyles({ size: 'sm' })}>Open Cove</Link> : (
              <>
                <Link to="/login" className={buttonStyles({ variant: 'ghost', size: 'sm' })}>Sign in</Link>
                <Link to="/register" className={buttonStyles({ size: 'sm' })}>Get started</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-14 lg:grid-cols-[1.1fr_1fr] lg:pt-24">
          <div>
            <h1 className="text-[2.75rem] font-extrabold leading-[1.02] sm:text-6xl lg:text-7xl">Talk it through, together.</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-sub">Cove brings direct messages, group rooms, voice notes, polls and an AI assistant into one calm, fast workspace that works on your phone, tablet and desktop.</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to={signedIn ? '/app/chat' : '/register'} className={buttonStyles({ size: 'lg' })}>{signedIn ? 'Open Cove' : 'Start chatting free'}</Link>
              {!signedIn && <Link to="/login" className={buttonStyles({ variant: 'outline', size: 'lg' })}>I have an account</Link>}
            </div>
            <p className="mt-5 flex items-center gap-2 text-sm text-sub"><Lock className="h-4 w-4" />Passwords are hashed, sessions are rotated, and you control who sees you online.</p>
          </div>
          <div className="flex justify-center lg:justify-end"><LiveDemo /></div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-24" aria-labelledby="features">
          <h2 id="features" className="max-w-2xl text-4xl font-extrabold leading-tight sm:text-5xl">Everything a conversation needs, nothing it doesn’t.</h2>
          <div className="mt-12 grid gap-4 md:grid-cols-6">
            {FEATURES.map((f) => (
              <article key={f.title} className={cn('relative overflow-hidden rounded-3xl border border-line p-6', f.span, f.tone === 'ai' ? 'bg-brand-gradient text-white' : 'bg-surface')}>
                <span className={cn('flex h-11 w-11 items-center justify-center rounded-2xl', f.tone === 'ai' ? 'bg-white/20' : 'bg-brand/12 text-brand')}><f.icon className="h-5 w-5" /></span>
                <h3 className="mt-5 text-xl font-bold">{f.title}</h3>
                <p className={cn('mt-2 max-w-md leading-relaxed', f.tone === 'ai' ? 'text-white/85' : 'text-sub')}>{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-24">
          <div className="relative overflow-hidden rounded-[2rem] bg-[#0a0b1a] p-10 text-white sm:p-16">
            <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full bg-brand/50 blur-[100px]" />
            <div className="absolute -bottom-24 left-10 h-72 w-72 rounded-full bg-brand-2/40 blur-[100px]" />
            <div className="relative max-w-xl">
              <h2 className="text-4xl font-extrabold leading-tight sm:text-5xl">Your people are waiting in the room.</h2>
              <p className="mt-4 text-white/75">Create an account, invite a friend, and send your first message in under a minute.</p>
              <Link to={signedIn ? '/app/chat' : '/register'} className={buttonStyles({ size: 'lg', className: 'mt-8 bg-white text-slate-900 shadow-none hover:bg-white/90' })}>{signedIn ? 'Open Cove' : 'Create your account'}</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-sm text-sub sm:flex-row">
          <Logo />
          <p>© {new Date().getFullYear()} Cove. Built with React, Node and Socket.IO.</p>
        </div>
      </footer>
    </div>
  );
}
