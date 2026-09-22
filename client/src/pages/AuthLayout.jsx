import { Link } from 'react-router-dom';
import { MessageCircle, Mic, Sparkles } from 'lucide-react';
import Logo from '../components/common/Logo';
import ThemeToggle from '../components/common/ThemeToggle';
import Seo from '../components/common/Seo';

// Split layout shared by login / register / password pages.
export default function AuthLayout({ title, subtitle, children, footer, seoTitle }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <Seo title={seoTitle || title} description="Sign in to Cove to pick up your conversations." />
      <aside className="relative hidden overflow-hidden bg-[#0a0b1a] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-brand/40 blur-[110px]" />
        <div className="absolute -bottom-32 right-0 h-[26rem] w-[26rem] rounded-full bg-brand-2/30 blur-[110px]" />
        <Link to="/" className="relative"><Logo className="[&_span]:text-white" /></Link>
        <div className="relative max-w-md">
          <h2 className="text-5xl font-extrabold leading-[1.05]">Conversations that feel like a room, not a feed.</h2>
          <ul className="mt-8 space-y-4 text-white/75">
            {[[MessageCircle, 'Direct messages and group rooms that stay in sync on every device'], [Mic, 'Voice notes, photos, files and polls without leaving the chat'], [Sparkles, 'A built-in AI assistant when you want a second brain']].map(([Icon, text]) => (
              <li key={text} className="flex items-start gap-3"><span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10"><Icon className="h-4 w-4" /></span>{text}</li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/50">© {new Date().getFullYear()} Cove</p>
      </aside>

      <main className="relative flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="lg:invisible"><Logo /></Link>
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-extrabold">{title}</h1>
          {subtitle && <p className="mt-2 text-sub">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <p className="mt-8 text-center text-sm text-sub">{footer}</p>}
        </div>
      </main>
    </div>
  );
}
