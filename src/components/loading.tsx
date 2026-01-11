import type { PropsWithChildren } from "react";

export function GlowSpinner(props: { label?: string; className?: string }) {
  return (
    <div className={["flex items-center justify-center gap-3", props.className ?? ""].join(" ")}>
      <div className="relative h-6 w-6">
        <div className="absolute inset-0 rounded-full bg-brand-400/20 blur-md" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-white/15 border-t-brand-300" />
      </div>
      {props.label ? <div className="text-sm text-slate-200">{props.label}</div> : null}
    </div>
  );
}

export function SectionLoader(props: { title?: string; subtitle?: string; className?: string }) {
  return (
    <div
      className={[
        "rounded-3xl border border-white/10 bg-slate-950/35 p-5 shadow-xl backdrop-blur",
        props.className ?? "",
      ].join(" ")}
    >
      <div className="flex items-center gap-4">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand-400/25 via-indigo-400/20 to-cyan-400/20 blur-lg" />
          <div className="absolute inset-0 animate-spin rounded-2xl border border-white/10" style={{ animationDuration: "1.4s" }} />
          <div className="absolute inset-1 rounded-xl bg-slate-950/60" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">{props.title ?? "Loading"}</div>
          <div className="mt-0.5 text-xs text-slate-300">{props.subtitle ?? "Fetching the latest data…"}</div>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <ShimmerLine />
        <ShimmerLine />
        <ShimmerLine className="w-2/3" />
      </div>
    </div>
  );
}

export function FullScreenLoader(props: PropsWithChildren<{ show: boolean; title?: string; subtitle?: string }>) {
  if (!props.show) return <>{props.children}</>;
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-brand-500/10 via-transparent to-transparent blur-2xl" />
      <div className="min-h-[60vh] flex items-center justify-center">
        <SectionLoader title={props.title ?? "Loading"} subtitle={props.subtitle ?? "Preparing your workspace…"} className="w-full max-w-xl" />
      </div>
    </div>
  );
}

export function ShimmerLine(props: { className?: string }) {
  return (
    <div className={["h-3 w-full overflow-hidden rounded-full bg-white/5", props.className ?? ""].join(" ")}>
      <div className="h-full w-1/3 animate-[shimmer_1.3s_infinite] rounded-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(360%); }
        }
      `}</style>
    </div>
  );
}


