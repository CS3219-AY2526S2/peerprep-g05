export function MatchInfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2.5">
      <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}