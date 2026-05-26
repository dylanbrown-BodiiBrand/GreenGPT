export default function SectionDivider() {
  return (
    <div className="flex items-center gap-4 py-2" aria-hidden>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-200 to-emerald-300/80" />
      <div className="h-2.5 w-2.5 rotate-45 border border-emerald-400 bg-emerald-100 shadow-sm" />
      <div className="h-px flex-1 bg-gradient-to-l from-transparent via-emerald-200 to-emerald-300/80" />
    </div>
  );
}
