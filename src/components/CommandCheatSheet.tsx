import CommandRow from '@/components/CommandRow';

export default function CommandCheatSheet() {
  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
          Quick CLI Commands
        </span>
        <span className="text-xs font-mono text-cyan-400">Makefile Ready</span>
      </div>
      <div className="space-y-2.5 font-mono text-sm">
        <CommandRow command="make help" description="Display interactive command menu" />
        <CommandRow command="make check" description="Run Type-Check, Lint & Tests" />
        <CommandRow command="make up" description="Start Docker local dev environment" />
      </div>
    </div>
  );
}
