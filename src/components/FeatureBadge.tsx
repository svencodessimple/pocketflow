export default function FeatureBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
      {children}
    </div>
  );
}
