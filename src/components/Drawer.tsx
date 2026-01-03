import type { PropsWithChildren } from "react";

export function Drawer(props: PropsWithChildren<{ open: boolean; onClose: () => void; title: string }>) {
  if (!props.open) return null;
  return (
    <div className="fixed inset-0 z-50 !m-0">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={props.onClose} />
      <div className="absolute inset-y-0 right-0 w-full max-w-[520px] border-l border-white/10 bg-slate-950/80 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="text-sm font-semibold">{props.title}</div>
          <button
            onClick={props.onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
          >
            Close
          </button>
        </div>
        <div className="h-full overflow-auto p-5">{props.children}</div>
      </div>
    </div>
  );
}