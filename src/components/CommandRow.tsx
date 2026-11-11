interface CommandRowProps {
  command: string;
  description: string;
}

export default function CommandRow({ command, description }: CommandRowProps) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded bg-slate-950/60 border border-slate-800/60">
      <span className="text-cyan-400 font-bold">{command}</span>
      <span className="text-slate-400 text-xs">{description}</span>
    </div>
  );
}
