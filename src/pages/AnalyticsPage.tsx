import { useEffect, useMemo, useState } from "react";
import { Card } from "../components/ui";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp } from "lucide-react";
import { getAnalytics } from "../lib/api";
import { toast } from "sonner";

const data = [
  { day: "Mon", calls: 12, minutes: 46 },
  { day: "Tue", calls: 18, minutes: 71 },
  { day: "Wed", calls: 14, minutes: 55 },
  { day: "Thu", calls: 28, minutes: 103 },
  { day: "Fri", calls: 22, minutes: 90 },
  { day: "Sat", calls: 19, minutes: 66 },
  { day: "Sun", calls: 26, minutes: 112 },
];

function Stat(props: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <div className="text-xs text-slate-400">{props.label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{props.value}</div>
      {props.hint ? <div className="mt-1 text-xs text-slate-400">{props.hint}</div> : null}
    </div>
  );
}

function formatDuration(sec: number | null): string {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState<null | Awaited<ReturnType<typeof getAnalytics>>["totals"]>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const a = await getAnalytics();
        if (!mounted) return;
        setTotals(a.totals);
      } catch (e) {
        toast.error(`Failed to load analytics: ${e instanceof Error ? e.message : "Unknown error"}`);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const headerHint = useMemo(() => {
    if (loading) return "Loading…";
    if (!totals) return "—";
    const tok = totals.totalTokens != null ? totals.totalTokens.toLocaleString() : "—";
    return `${totals.callCount} calls • ${tok} tokens`;
  }, [loading, totals]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold tracking-tight">Analytics</div>
          <div className="mt-1 text-sm text-slate-300">Live usage & performance across all agents.</div>
        </div>
        <div className="rounded-2xl bg-brand-500/10 px-4 py-2 text-sm text-brand-200 shadow-glow">
          <span className="inline-flex items-center gap-2">
            <TrendingUp size={16} /> {headerHint}
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Stat label="Total calls" value={totals ? String(totals.callCount) : loading ? "…" : "—"} hint="All time" />
        <Stat
          label="Avg call duration"
          value={totals ? formatDuration(totals.avgDurationSec) : loading ? "…" : "—"}
          hint="Completed calls"
        />
        <Stat
          label="Avg latency"
          value={totals?.avgLatencyMs != null ? `${totals.avgLatencyMs}ms` : loading ? "…" : "—"}
          hint="Avg turn latency (EOU + LLM TTFT)"
        />
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Weekly volume</div>
            <div className="text-xs text-slate-400">Calls per day</div>
          </div>
          <div className="text-xs text-slate-400">UTC</div>
        </div>

        <div className="mt-5 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="calls" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00f06a" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#00f06a" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" stroke="rgba(148,163,184,.6)" tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(148,163,184,.6)" tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: "rgba(2,6,23,.92)",
                  border: "1px solid rgba(255,255,255,.1)",
                  borderRadius: 14,
                }}
                labelStyle={{ color: "rgba(226,232,240,.9)" }}
              />
              <Area type="monotone" dataKey="calls" stroke="#00f06a" fill="url(#calls)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}


