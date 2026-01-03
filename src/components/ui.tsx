import type { PropsWithChildren } from "react";

export function Card(props: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/5 p-5 ${props.className ?? ""}`}>
      {props.children}
    </div>
  );
}

export function Button(
  props: PropsWithChildren<{
    onClick?: () => void;
    disabled?: boolean;
    variant?: "primary" | "secondary" | "danger";
    className?: string;
    type?: "button" | "submit";
  }>
) {
  const variant =
    props.variant === "danger"
      ? "bg-rose-500/90 hover:bg-rose-500 text-white"
      : props.variant === "secondary"
        ? "bg-white/10 hover:bg-white/15 text-white"
        : "bg-indigo-500/90 hover:bg-indigo-500 text-white";

  return (
    <button
      type={props.type ?? "button"}
      disabled={props.disabled}
      onClick={props.onClick}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variant,
        props.className ?? "",
      ].join(" ")}
    >
      {props.children}
    </button>
  );
}

export function Input(props: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      placeholder={props.placeholder}
      className={[
        "w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white",
        "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

export function Textarea(props: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <textarea
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      placeholder={props.placeholder}
      rows={props.rows ?? 5}
      className={[
        "w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white",
        "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50",
        props.className ?? "",
      ].join(" ")}
    />
  );
}


