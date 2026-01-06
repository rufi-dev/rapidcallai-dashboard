import { useEffect, useMemo, useState } from "react";
import { Card } from "../components/ui";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp } from "lucide-react";
import { getAnalyticsRange, type AnalyticsSeriesPoint } from "../lib/api";
import { toast } from "sonner";

function toDateInputValue(ts: number): string {
  const d = new Date(ts);
  // YYYY-MM-DD in local time for the input control.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromDateInputValue(v: string): number | null {
  if (!v) return null;
  const t = Date.parse(`${v}T00:00:00`);
  return Number.isFinite(t) ? t : null;
}

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
  const [totals, setTotals] = useState<null | Awaited<ReturnType<typeof getAnalyticsRange>>["totals"]>(null);
  const [series, setSeries] = useState<AnalyticsSeriesPoint[]>([]);

  const now = Date.now();
  const [fromDay, setFromDay] = useState(() => toDateInputValue(now - 7 * 24 * 60 * 60 * 1000));
  const [toDay, setToDay] = useState(() => toDateInputValue(now));

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const fromMs = fromDateInputValue(fromDay);
        const toMs = fromDateInputValue(toDay);
        if (fromMs == null || toMs == null) return;
        // include full end-day
        const a = await getAnalyticsRange({ from: fromMs, to: toMs + 24 * 60 * 60 * 1000 - 1 });
        if (!mounted) return;
        setTotals(a.totals);
        setSeries(a.series || []);
      } catch (e) {
        toast.error(`Failed to load analytics: ${e instanceof Error ? e.message : "Unknown error"}`);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [fromDay, toDay]);

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

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">Filters</div>
            <div className="text-xs text-slate-400">Date range</div>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="text-xs text-slate-300">
              <span className="mr-2 text-slate-400">From</span>
              <input
                type="date"
                value={fromDay}
                onChange={(e) => setFromDay(e.target.value)}
                className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="text-xs text-slate-300">
              <span className="mr-2 text-slate-400">To</span>
              <input
                type="date"
                value={toDay}
                onChange={(e) => setToDay(e.target.value)}
                className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
              />
            </label>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-4">
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
        <Stat
          label="Total cost"
          value={typeof totals?.totalCostUsd === "number" ? `$${totals.totalCostUsd.toFixed(4)}` : loading ? "…" : "—"}
          hint="Completed calls"
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
            <AreaChart data={series} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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


