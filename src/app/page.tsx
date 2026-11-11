import FeatureBadge from '@/components/FeatureBadge';
import HeroHeader from '@/components/HeroHeader';
import CommandCheatSheet from '@/components/CommandCheatSheet';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 sm:p-24 antialiased">
      <div className="max-w-3xl w-full space-y-8">
        <HeroHeader />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <FeatureBadge>
            <span className="text-emerald-400 font-bold">✓</span> Next.js 16
          </FeatureBadge>
          <FeatureBadge>
            <span className="text-emerald-400 font-bold">✓</span> Tailwind CSS
          </FeatureBadge>
          <FeatureBadge>
            <span className="text-emerald-400 font-bold">✓</span> Docker Multi-Stage
          </FeatureBadge>
          <FeatureBadge>
            <span className="text-emerald-400 font-bold">✓</span> Makefile DX
          </FeatureBadge>
        </div>

        <CommandCheatSheet />

        <div className="text-center text-xs text-slate-500 font-mono">
          Edit{' '}
          <code className="text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
            src/app/page.tsx
          </code>{' '}
          to begin building your application.
        </div>
      </div>
    </main>
  );
}
