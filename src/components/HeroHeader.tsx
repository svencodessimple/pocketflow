export default function HeroHeader() {
  return (
    <div className="space-y-4">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        Environment Active & Operational
      </div>
      <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
        Makeflow Toolkit
      </h1>
      <p className="text-lg text-slate-400 max-w-2xl">
        Production-ready Next.js starter environment. Pre-configured with Tailwind CSS, TypeScript,
        Docker, and modular Makefile DX automation.
      </p>
    </div>
  );
}
