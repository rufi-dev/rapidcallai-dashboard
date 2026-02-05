import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Headphones,
  Lock,
  Mail,
  PhoneCall,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import { setToken } from "../lib/auth";
import { login, register } from "../lib/api";

const QUICKSTART = [
  { title: "Create an agent", desc: "Pick a prompt + welcome message.", icon: <Headphones size={16} /> },
  { title: "Run a web test", desc: "Talk and iterate instantly.", icon: <PhoneCall size={16} /> },
  { title: "Measure outcomes", desc: "Use analytics + recordings.", icon: <BarChart3 size={16} /> },
] as const;

function friendlyAuthError(kind: "login" | "register", e: unknown): string {
  let msg = e instanceof Error ? e.message : "Something went wrong";
  msg = msg.replace(/^(login|register)\s+failed:\s*/i, "").trim();

  // If server returned JSON (as text), pull out the "error" field.
  if (msg.startsWith("{") && msg.endsWith("}")) {
    try {
      const parsed = JSON.parse(msg) as unknown;
      if (parsed && typeof parsed === "object" && "error" in (parsed as any) && typeof (parsed as any).error === "string") {
        msg = String((parsed as any).error).trim();
      }
    } catch {
      // ignore
    }
  }

  // Human-friendly mapping for common auth failures.
  if (/invalid email or password/i.test(msg)) return "Email or password is incorrect. Please try again.";
  if (/missing authorization/i.test(msg)) return "Your session is missing. Please sign in again.";
  if (/email already registered/i.test(msg)) return "That email is already registered. Try signing in instead.";
  if (/validation failed/i.test(msg)) {
    return kind === "register"
      ? "Please check your details and try again."
      : "Please check your email and password and try again.";
  }

  return msg || "Something went wrong. Please try again.";
}

function AuthErrorBanner(props: { title: string; message: string }) {
  return (
    <div className="mt-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-100">
      <div className="flex gap-2">
        <div className="mt-0.5 text-rose-200">
          <AlertTriangle size={16} />
        </div>
        <div className="min-w-0">
          <div className="font-semibold">{props.title}</div>
          <div className="mt-0.5 text-rose-100/90">{props.message}</div>
        </div>
      </div>
    </div>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 text-xs text-slate-400">{props.label}</div>
      <div className="group relative">
        {props.icon ? (
          <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-200">
            {props.icon}
          </div>
        ) : null}
        <input
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          type={props.type ?? "text"}
          placeholder={props.placeholder}
          className={[
            "w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-500",
            props.icon ? "pl-11" : "",
            "focus:outline-none focus:ring-2 focus:ring-brand-500/40",
          ].join(" ")}
        />
      </div>
    </div>
  );
}

function StatsSpotlight() {
  const series = [24, 38, 30, 44, 58, 52, 68];
  const max = Math.max(...series);
  const min = Math.min(...series);
  const chartW = 560;
  const chartH = 170;
  const padX = 18;
  const padY = 16;
  const innerW = chartW - padX * 2;
  const innerH = chartH - padY * 2;
  const norm = (v: number) => {
    const denom = Math.max(1, max - min);
    return (v - min) / denom;
  };
  const points = series
    .map((v, i) => {
      const x = padX + (innerW * i) / Math.max(1, series.length - 1);
      const y = padY + (1 - norm(v)) * innerH;
      return [x, y] as const;
    })
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  return (
    <div className="auth-card auth-panel auth-enter-delayed flex flex-col overflow-hidden">
      <div className="border-b border-white/10 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400">Live statistics</div>
            <div className="mt-1 text-lg font-semibold text-white">See the system move</div>
          </div>
          <div className="rounded-2xl bg-brand-500/10 px-3 py-2 text-xs text-brand-200 shadow-glow auth-pulse-dot">
            Live
          </div>
        </div>
        <div className="mt-3 text-sm text-slate-300">
          No long paragraphs — just signal. A clean snapshot of performance and usage.
        </div>
      </div>

      <div className="flex-1 min-h-0 px-6 py-6 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-slate-400">Calls (24h)</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-white">68</div>
            <div className="mt-2 text-xs text-brand-200">+12% vs yesterday</div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-slate-400">Avg latency</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-white">0.68s</div>
            <div className="mt-2 text-xs text-slate-300">TTFT + endpointing</div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white">Calls over time</div>
              <div className="mt-1 text-xs text-slate-400">Last 7 days • UTC</div>
            </div>
            <div className="text-xs text-slate-300 rounded-2xl border border-white/10 bg-black/20 px-3 py-2">Filter-ready</div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/30 p-4 overflow-hidden flex-1 min-h-0 flex items-center">
            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="w-full h-[190px]"
              role="img"
              aria-label="Calls over time line chart"
            >
              <defs>
                <linearGradient id="authLine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="rgba(0,240,106,0.9)" />
                  <stop offset="1" stopColor="rgba(56,189,248,0.75)" />
                </linearGradient>
                <linearGradient id="authFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="rgba(0,240,106,0.18)" />
                  <stop offset="1" stopColor="rgba(0,0,0,0)" />
                </linearGradient>
                <filter id="authGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="2.5" result="b" />
                  <feColorMatrix
                    in="b"
                    type="matrix"
                    values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 12 -6"
                    result="g"
                  />
                  <feMerge>
                    <feMergeNode in="g" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* grid */}
              {[0.25, 0.5, 0.75].map((p, i) => (
                <line
                  key={i}
                  x1={padX}
                  x2={chartW - padX}
                  y1={padY + innerH * p}
                  y2={padY + innerH * p}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="1"
                />
              ))}

              {/* filled area */}
              <polygon
                points={`${points} ${chartW - padX},${chartH - padY} ${padX},${chartH - padY}`}
                fill="url(#authFill)"
              />

              {/* line */}
              <polyline
                points={points}
                fill="none"
                stroke="url(#authLine)"
                strokeWidth="3.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#authGlow)"
                className="auth-line-draw"
              />

              {/* points */}
              {series.map((v, i) => {
                const x = padX + (innerW * i) / Math.max(1, series.length - 1);
                const y = padY + (1 - norm(v)) * innerH;
                return <circle key={i} cx={x} cy={y} r="3.2" fill="rgba(0,240,106,0.9)" opacity="0.85" />;
              })}
            </svg>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-slate-300">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
              <div className="text-slate-400">Completion</div>
              <div className="mt-0.5 text-slate-100">92%</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
              <div className="text-slate-400">Recordings</div>
              <div className="mt-0.5 text-slate-100">Ready</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
              <div className="text-slate-400">Transcripts</div>
              <div className="mt-0.5 text-slate-100">Role-based</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">Updates automatically</div>
          <div className="text-slate-500">Clean • Lux • Measurable</div>
        </div>
      </div>
    </div>
  );
}

function AuthLayout(props: {
  mode: "login" | "register";
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden">
      <div className="pointer-events-none fixed inset-0 auth-bg-lux" />
      <div className="pointer-events-none fixed inset-0 auth-noise" />

      <div className="mx-auto h-full w-full max-w-[1560px] px-4 py-10 lg:px-10 lg:py-0 flex items-center justify-center">
        <div className="grid w-fit max-w-full items-stretch gap-8 lg:grid-cols-[minmax(320px,360px)_minmax(420px,520px)_minmax(520px,620px)]">
          {/* Left: visual quickstart (replaces the big hero text) */}
          <div className="hidden lg:block auth-enter">
            <div className="auth-card auth-panel overflow-hidden">
              <div className="border-b border-white/10 px-5 py-5">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-slate-200 shadow-glow">
                  <Sparkles size={16} className="text-brand-300" /> Voice Studio
                </div>
                <div className="mt-4 text-lg font-semibold text-white">Quick start</div>
                <div className="mt-1 text-sm text-slate-300">A clean workflow — no noise.</div>
              </div>

              <div className="px-5 py-5 space-y-3">
                {QUICKSTART.map((s) => (
                  <div key={s.title} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-brand-500/12 p-2 text-brand-200 shadow-glow">{s.icon}</div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white">{s.title}</div>
                        <div className="mt-1 text-xs text-slate-300">{s.desc}</div>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-wider text-slate-400">What you’ll see</div>
                  <div className="mt-3 space-y-2">
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full w-[55%] rounded-full bg-brand-400/60 auth-shimmer" />
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full w-[72%] rounded-full bg-white/10 auth-shimmer" />
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full w-[42%] rounded-full bg-white/10 auth-shimmer" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 px-5 py-5 text-xs text-slate-400">
                Built for speed: web tests, telephony, recordings, analytics.
              </div>
            </div>
          </div>

          {/* Middle: auth */}
          <div className="auth-card auth-panel auth-enter overflow-hidden flex flex-col">
            <div className="border-b border-white/10 px-6 py-5">
              <div className="inline-flex items-center gap-2 rounded-2xl bg-brand-500/12 px-3 py-2 text-sm text-brand-200 shadow-glow">
                <Sparkles size={16} /> Voice Studio
              </div>
              <div className="mt-4 text-2xl font-semibold tracking-tight text-white">{props.title}</div>
              <div className="mt-1 text-sm text-slate-300">{props.subtitle}</div>
            </div>

            <div className="px-6 py-6 flex-1 min-h-0 flex flex-col">
              {props.children}
              <div className="mt-5">{props.footer}</div>

              <div className="mt-6 grid grid-cols-3 gap-2 text-xs text-slate-300">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  <div className="text-slate-400">Secure</div>
                  <div className="mt-0.5 text-slate-100">token auth</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  <div className="text-slate-400">Fast</div>
                  <div className="mt-0.5 text-slate-100">low latency</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  <div className="text-slate-400">Unified</div>
                  <div className="mt-0.5 text-slate-100">web + phone</div>
                </div>
              </div>

              <div className="mt-auto pt-6 text-xs text-slate-400">
                Tip: after your first web test, open Call History to see recording + transcript.
              </div>
            </div>
          </div>

          {/* Right: testimonials */}
          <div className="hidden lg:block justify-self-end w-full max-w-[620px]">
            <StatsSpotlight />
          </div>
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const can = useMemo(() => email.trim() && password.trim(), [email, password]);

  return (
    <AuthLayout
      mode="login"
      title="Sign in"
      subtitle="Welcome back. Continue where you left off."
      footer={
        <div className="text-sm text-slate-300">
          No account?{" "}
          <Link to="/register" className="text-brand-300 hover:text-brand-200 transition-colors">
            Create one
          </Link>
        </div>
      }
    >
      <div className="space-y-3">
        <Field label="Email" value={email} onChange={setEmail} placeholder="you@company.com" icon={<Mail size={16} />} />
        <Field
          label="Password"
          value={password}
          onChange={setPassword}
          type="password"
          placeholder="••••••••"
          icon={<Lock size={16} />}
        />
        <button
          disabled={!can || busy}
          onClick={async () => {
            try {
              setBusy(true);
              setErr(null);
              await login({ email: email.trim(), password });
              setToken("ok");
              nav("/app/agents");
            } catch (e) {
              setErr(friendlyAuthError("login", e));
            } finally {
              setBusy(false);
            }
          }}
          className="mt-2 w-full rounded-2xl bg-brand-500/20 px-4 py-3 text-sm font-semibold text-brand-200 shadow-glow transition hover:bg-brand-500/25 disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {busy ? "Signing in…" : "Sign in"} <ArrowRight size={16} />
        </button>
        {err ? <AuthErrorBanner title="Couldn’t sign in" message={err} /> : null}
      </div>
    </AuthLayout>
  );
}

export function RegisterPage() {
  const nav = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const can = useMemo(() => email.trim() && password.trim() && name.trim(), [email, password, name]);

  return (
    <AuthLayout
      mode="register"
      title="Create account"
      subtitle="Get a private workspace and start building in minutes."
      footer={
        <div className="text-sm text-slate-300">
          Have an account?{" "}
          <Link to="/login" className="text-brand-300 hover:text-brand-200 transition-colors">
            Sign in
          </Link>
        </div>
      }
    >
      <div className="space-y-3">
        <Field label="Name" value={name} onChange={setName} placeholder="Your name" icon={<UserIcon size={16} />} />
        <Field label="Email" value={email} onChange={setEmail} placeholder="you@company.com" icon={<Mail size={16} />} />
        <Field
          label="Password"
          value={password}
          onChange={setPassword}
          type="password"
          placeholder="••••••••"
          icon={<Lock size={16} />}
        />
        <button
          disabled={!can || busy}
          onClick={async () => {
            try {
              setBusy(true);
              setErr(null);
              await register({ name: name.trim(), email: email.trim(), password });
              setToken("ok");
              nav("/app/agents", { state: { from: location.pathname } });
            } catch (e) {
              setErr(friendlyAuthError("register", e));
            } finally {
              setBusy(false);
            }
          }}
          className="mt-2 w-full rounded-2xl bg-brand-500/20 px-4 py-3 text-sm font-semibold text-brand-200 shadow-glow transition hover:bg-brand-500/25 disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {busy ? "Creating…" : "Create & continue"} <ArrowRight size={16} />
        </button>
        {err ? <AuthErrorBanner title="Couldn’t create account" message={err} /> : null}

        <div className="mt-1 rounded-2xl border border-white/10 bg-slate-950/30 p-3 text-xs text-slate-300">
          By continuing, you agree to keep your workspace secure and not share your login credentials.
        </div>
      </div>
    </AuthLayout>
  );
}


