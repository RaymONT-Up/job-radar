import { CircleHelp } from "lucide-react";

export function HelpTooltip({ text }: { text: string }) {
  return <span className="group relative inline-flex align-middle"><button type="button" aria-label={text} className="focus-ring grid size-5 place-items-center rounded-full text-[var(--muted)] hover:text-[var(--accent)]"><CircleHelp size={15} /></button><span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-64 -translate-x-1/2 rounded-md border bg-[var(--panel)] p-3 text-left text-xs font-normal leading-5 text-[var(--text)] shadow-xl group-hover:block group-focus-within:block">{text}</span></span>;
}
