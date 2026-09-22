import { LogoMark } from './Logo';

// Full-screen loader used while the session is restored and while lazy routes load.
export default function Splash() {
  return (
    <div className="flex h-full min-h-screen items-center justify-center bg-app" role="status" aria-label="Loading">
      <div className="relative">
        <span className="absolute inset-0 animate-ring rounded-xl bg-brand/40" />
        <LogoMark className="relative h-14 w-14 rounded-2xl" />
      </div>
    </div>
  );
}
