import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Lock, Mail, Sparkles, User as UserIcon } from "lucide-react";
import { setToken } from "../lib/auth";
import { login, register } from "../lib/api";

type Review = {
  name: string;
  title: string;
  quote: string;
  avatarSeed: string;
};

const REVIEWS: Review[] = [
  {
    name: "Maya Chen",
    title: "Ops Lead • Support",
    avatarSeed: "maya",
    quote:
      "The UI is genuinely calm and fast. We review calls, share a link internally, and fix the prompt in minutes. It feels like a product you can trust in production.",
  },
  {
    name: "Omar K.",
    title: "Founder • Voice SaaS",
    avatarSeed: "omar",
    quote:
      "Recordings + transcripts changed everything. Instead of debating what happened, we just open the call and see it. The dashboard looks premium without getting in the way.",
  },
  {
    name: "Lina R.",
    title: "Engineer • Realtime",
    avatarSeed: "lina",
    quote:
      "It’s rare to get something this clean. You can iterate prompts, test on web, then validate in analytics. The whole loop is tight, which keeps shipping momentum high.",
  },
];

const BULLETS = [
  "Web + telephony in one place",
  "Playback-ready recordings with seeking",
  "Clean role-based transcripts",
  "Analytics with date filtering",
];

function avatarDataUri(seed: string) {
  const s = String(seed || "user");
  const hue = Math.abs(
    s.split("").reduce((acc, ch) => {
      return (acc * 33 + ch.charCodeAt(0)) % 360;
    }, 11)
  );
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${hue} 78% 58%)"/>
      <stop offset="1" stop-color="hsl(${(hue + 32) % 360} 82% 54%)"/>
    </linearGradient>
    <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1.1"/>
    </filter>
  </defs>
  <rect width="96" height="96" rx="22" fill="url(#g)"/>
  <path d="M12 26c10-11 22-16 36-16s26 5 36 16" stroke="rgba(255,255,255,0.22)" stroke-width="14" filter="url(#s)" fill="none" stroke-linecap="round"/>
  <circle cx="48" cy="42" r="17" fill="rgba(255,255,255,0.92)"/>
  <path d="M20 88c5-19 20-29 28-29s23 10 28 29" fill="rgba(255,255,255,0.92)"/>
  <circle cx="39" cy="41" r="2.2" fill="rgba(2,6,23,0.7)"/>
  <circle cx="57" cy="41" r="2.2" fill="rgba(2,6,23,0.7)"/>
  <path d="M42 49c4 4 8 4 12 0" stroke="rgba(2,6,23,0.5)" stroke-width="2.2" fill="none" stroke-linecap="round"/>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;
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

function ReviewCrossfade() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (mq?.matches) return;
    const id = window.setInterval(() => setIdx((x) => (x + 1) % REVIEWS.length), 7000);
    return () => window.clearInterval(id);
  }, []);

  const a = REVIEWS[idx % REVIEWS.length];
  const b = REVIEWS[(idx + 1) % REVIEWS.length];

  return (
    <div className="relative h-[210px] w-full">
      <div className="absolute inset-0 auth-review auth-review-in">
        <div className="flex items-center gap-3">
          <img
            src={avatarDataUri(a.avatarSeed)}
            alt=""
            className="h-11 w-11 rounded-2xl border border-white/10 shadow-glow object-cover"
          />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white">{a.name}</div>
            <div className="text-xs text-slate-400">{a.title}</div>
          </div>
        </div>
        <div className="mt-3 text-sm leading-relaxed text-slate-100/90">“{a.quote}”</div>
      </div>

      {/* preloaded second card for smoother feel */}
      <div className="absolute inset-0 auth-review opacity-0 pointer-events-none">
        <div className="flex items-center gap-3">
          <img
            src={avatarDataUri(b.avatarSeed)}
            alt=""
            className="h-11 w-11 rounded-2xl border border-white/10 shadow-glow object-cover"
          />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white">{b.name}</div>
            <div className="text-xs text-slate-400">{b.title}</div>
          </div>
        </div>
        <div className="mt-3 text-sm leading-relaxed text-slate-100/90">“{b.quote}”</div>
      </div>
    </div>
  );
}

function ProductPreview() {
  return (
    <div className="auth-card auth-enter-delayed flex h-[520px] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-400">Preview</div>
          <div className="mt-0.5 text-sm font-semibold text-white">Call timeline</div>
        </div>
        <div className="rounded-2xl bg-brand-500/10 px-3 py-2 text-xs text-brand-200 shadow-glow">Live</div>
      </div>

      <div className="flex-1 p-5">
        <div className="grid gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-white">Recording</div>
              <div className="text-xs text-slate-400">mp3 • seekable</div>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-white/10 overflow-hidden">
              <div className="h-full w-1/3 rounded-full bg-brand-400/70 auth-shimmer" />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-white">Transcript</div>
              <div className="text-xs text-slate-400">role-based</div>
            </div>
            <div className="mt-3 space-y-2">
              <div className="rounded-2xl bg-slate-950/45 p-3 border border-white/10">
                <div className="text-xs text-slate-400">Agent</div>
                <div className="mt-1 h-3 w-[78%] rounded bg-white/10 auth-shimmer" />
              </div>
              <div className="rounded-2xl bg-brand-500/12 p-3 border border-white/10">
                <div className="text-xs text-brand-200">User</div>
                <div className="mt-1 h-3 w-[62%] rounded bg-white/10 auth-shimmer" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-white">Analytics</div>
              <div className="text-xs text-slate-400">date filters</div>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 items-end h-16">
              <div className="h-6 rounded bg-white/10 auth-shimmer" />
              <div className="h-10 rounded bg-white/10 auth-shimmer" />
              <div className="h-8 rounded bg-white/10 auth-shimmer" />
              <div className="h-14 rounded bg-white/10 auth-shimmer" />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 px-5 py-4">
        <div className="text-xs uppercase tracking-wider text-slate-400">Trusted by teams</div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-300">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-slate-400">Setup</div>
            <div className="mt-0.5 text-slate-100">~10 min</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-slate-400">Playback</div>
            <div className="mt-0.5 text-slate-100">instant</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-slate-400">Iteration</div>
            <div className="mt-0.5 text-slate-100">fast</div>
          </div>
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

      <div className="mx-auto h-full w-full max-w-7xl px-4 py-10 lg:py-0 lg:px-10">
        <div className="grid h-full items-center gap-8 lg:grid-cols-[1fr_460px_1fr]">
          {/* Left: story */}
          <div className="hidden lg:block">
            <div className="auth-enter">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 shadow-glow">
                <Sparkles size={16} className="text-brand-300" /> Voice Studio
              </div>

              <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white">
                Ship voice agents with a dashboard that feels <span className="text-brand-300">lux</span>.
              </h1>
              <p className="mt-4 text-sm text-slate-300 max-w-md">
                A calmer workflow for building, testing, and improving voice experiences—without switching tools all day.
              </p>

              <div className="mt-6 space-y-2 text-sm text-slate-200">
                {BULLETS.map((b) => (
                  <div key={b} className="flex items-center gap-2">
                    <div className="rounded-full bg-brand-500/15 p-1 text-brand-200 shadow-glow">
                      <Check size={14} />
                    </div>
                    <div className="text-slate-200/90">{b}</div>
                  </div>
                ))}
              </div>

              <div className="mt-8 auth-card p-5">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-wider text-slate-400">What teams say</div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
                    {props.mode === "login" ? "Welcome back" : "Get started"}
                  </div>
                </div>
                <div className="mt-4">
                  <ReviewCrossfade />
                </div>
              </div>
            </div>
          </div>

          {/* Middle: form */}
          <div className="auth-card auth-enter">
            <div className="border-b border-white/10 px-6 py-5">
              <div className="inline-flex items-center gap-2 rounded-2xl bg-brand-500/12 px-3 py-2 text-sm text-brand-200 shadow-glow">
                <Sparkles size={16} /> Voice Studio
              </div>
              <div className="mt-4 text-2xl font-semibold tracking-tight text-white">{props.title}</div>
              <div className="mt-1 text-sm text-slate-300">{props.subtitle}</div>
            </div>

            <div className="px-6 py-6">
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
            </div>
          </div>

          {/* Right: product preview */}
          <div className="hidden lg:block">
            <ProductPreview />
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
              const out = await login({ email: email.trim(), password });
              setToken(out.token);
              nav("/app/agents");
            } catch (e) {
              setErr(e instanceof Error ? e.message : "Login failed");
            } finally {
              setBusy(false);
            }
          }}
          className="mt-2 w-full rounded-2xl bg-brand-500/20 px-4 py-3 text-sm font-semibold text-brand-200 shadow-glow transition hover:bg-brand-500/25 disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {busy ? "Signing in…" : "Sign in"} <ArrowRight size={16} />
        </button>
        {err ? <div className="text-sm text-red-300">{err}</div> : null}
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
              const out = await register({ name: name.trim(), email: email.trim(), password });
              setToken(out.token);
              nav("/app/agents", { state: { from: location.pathname } });
            } catch (e) {
              setErr(e instanceof Error ? e.message : "Register failed");
            } finally {
              setBusy(false);
            }
          }}
          className="mt-2 w-full rounded-2xl bg-brand-500/20 px-4 py-3 text-sm font-semibold text-brand-200 shadow-glow transition hover:bg-brand-500/25 disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {busy ? "Creating…" : "Create & continue"} <ArrowRight size={16} />
        </button>
        {err ? <div className="text-sm text-red-300">{err}</div> : null}

        <div className="mt-1 rounded-2xl border border-white/10 bg-slate-950/30 p-3 text-xs text-slate-300">
          By continuing, you agree to keep your workspace secure and not share your login credentials.
        </div>
      </div>
    </AuthLayout>
  );
}


