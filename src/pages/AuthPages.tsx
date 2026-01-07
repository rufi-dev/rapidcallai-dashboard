import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Lock, Mail, Sparkles, User as UserIcon } from "lucide-react";
import { setToken } from "../lib/auth";
import { login, register } from "../lib/api";

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

type Testimonial = {
  name: string;
  title: string;
  quote: string;
  avatarSeed: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    name: "A. Founder",
    title: "Voice SaaS",
    avatarSeed: "alex",
    quote:
      "We went from idea to production in days. The call history + recordings made debugging effortless. I can actually show my team what happened instead of guessing.",
  },
  {
    name: "S. Ops Lead",
    title: "Customer Support",
    avatarSeed: "sara",
    quote:
      "The dashboard feels fast, clean, and actually usable. The transcript + analytics combo is gold. We finally have one source of truth when something goes wrong.",
  },
  {
    name: "M. Engineer",
    title: "AI Platform",
    avatarSeed: "mike",
    quote:
      "Ship agents, iterate prompts, and keep control. Everything is organized exactly where I expect it. I can tweak prompts and verify results in one loop.",
  },
  {
    name: "D. PM",
    title: "Growth Team",
    avatarSeed: "dina",
    quote:
      "The UX is clean enough that non-technical teammates can run tests and review calls without help. It feels premium but still practical for day‑to‑day work.",
  },
  {
    name: "K. Builder",
    title: "Indie Hacker",
    avatarSeed: "kai",
    quote:
      "Prompt iteration is fast, and the recordings + transcripts give instant feedback on what to fix. I spend less time debugging and more time shipping improvements.",
  },
  {
    name: "R. Support",
    title: "Operations",
    avatarSeed: "rina",
    quote:
      "Having one place for phone + web sessions is huge. We finally stopped switching tools all day. It made handoffs between support and engineering so much smoother.",
  },
  {
    name: "T. Engineer",
    title: "Realtime Systems",
    avatarSeed: "tom",
    quote:
      "The product feels snappy. Latency improvements are visible in analytics and confirmed in recordings. When we tune something, we can actually measure it.",
  },
  {
    name: "N. Founder",
    title: "AI Startup",
    avatarSeed: "nora",
    quote:
      "This is the first dashboard that looks premium and stays practical when you’re shipping daily. The layout makes it easy to demo, but it’s also great for internal QA.",
  },
];

function BrandMark() {
  return (
    <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 shadow-glow">
      <Sparkles size={16} className="text-brand-300" /> Voice Studio
    </div>
  );
}

function avatarDataUri(seed: string) {
  const s = String(seed || "user");
  // simple deterministic “photo-like” SVG avatar (no external requests)
  const hue = Math.abs(
    s.split("").reduce((acc, ch) => {
      return (acc * 31 + ch.charCodeAt(0)) % 360;
    }, 7)
  );
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${hue} 80% 60%)" stop-opacity="1"/>
      <stop offset="1" stop-color="hsl(${(hue + 40) % 360} 85% 55%)" stop-opacity="1"/>
    </linearGradient>
    <filter id="f" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="0.6"/>
    </filter>
  </defs>
  <rect width="80" height="80" rx="18" fill="url(#g)"/>
  <circle cx="40" cy="33" r="14" fill="rgba(255,255,255,0.92)"/>
  <path d="M16 72c4-16 17-24 24-24s20 8 24 24" fill="rgba(255,255,255,0.92)"/>
  <circle cx="30" cy="33" r="2" fill="rgba(2,6,23,0.75)"/>
  <circle cx="50" cy="33" r="2" fill="rgba(2,6,23,0.75)"/>
  <path d="M34 39c4 4 8 4 12 0" stroke="rgba(2,6,23,0.55)" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M10 18c10-10 22-14 30-14s20 4 30 14" stroke="rgba(255,255,255,0.18)" stroke-width="10" filter="url(#f)" fill="none" stroke-linecap="round"/>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;
}

function TestimonialCard(props: { t: Testimonial }) {
  const { t } = props;
  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
      <div className="flex items-center gap-3">
        <img
          src={avatarDataUri(t.avatarSeed)}
          alt={`${t.name} avatar`}
          className="h-10 w-10 rounded-2xl border border-white/10 shadow-glow object-cover"
          loading="lazy"
        />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">{t.name}</div>
          <div className="text-xs text-slate-400">{t.title}</div>
        </div>
      </div>
      <div className="mt-3 text-sm leading-relaxed text-slate-100/90">“{t.quote}”</div>
    </div>
  );
}

function TestimonialsTicker() {
  // Duplicate for seamless infinite scroll (CSS animation).
  const items = [...TESTIMONIALS, ...TESTIMONIALS];
  return (
    <div className="auth-ticker-mask mt-3 flex-1 min-h-0 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="auth-ticker-track space-y-4">
        {items.map((t, i) => (
          <TestimonialCard key={`${i}-${t.name}`} t={t} />
        ))}
      </div>
    </div>
  );
}

function AuthShell(props: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden">
      {/* cinematic gradient overlay */}
      <div className="pointer-events-none fixed inset-0 auth-aurora" />

      <div className="mx-auto flex min-h-screen lg:min-h-0 lg:h-full w-full max-w-7xl items-stretch px-4 py-8 lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[440px_1fr] items-stretch">
          {/* Left: form */}
          <div className="relative">
            <div className="lg:sticky lg:top-10">
              <BrandMark />
              <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white">{props.title}</h1>
              <p className="mt-2 text-sm text-slate-300">{props.subtitle}</p>

              <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_0_1px_rgba(0,240,106,.08),0_30px_120px_rgba(0,0,0,.45)]">
                {props.children}
                <div className="mt-5">{props.footer}</div>

                <div className="mt-5 grid grid-cols-3 gap-2 text-xs text-slate-300">
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
          </div>

          {/* Right: showcase */}
          <div className="relative hidden lg:block">
            <div className="h-full rounded-3xl border border-white/10 bg-slate-950/25 p-8 overflow-hidden">
              <div className="absolute inset-0 auth-grid opacity-[0.55]" />
              <div className="relative h-full flex flex-col">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-slate-400">What you get</div>
                    <div className="mt-1 text-xl font-semibold text-white">A dashboard built for shipping</div>
                  </div>
                  <div className="rounded-2xl bg-brand-500/10 px-3 py-2 text-sm text-brand-200 shadow-glow">
                    Low-latency • Telephony • Web
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-sm font-semibold text-white">Realtime transcripts</div>
                    <div className="mt-1 text-xs text-slate-400">See speech as it happens, with clean role attribution.</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-sm font-semibold text-white">Call recordings</div>
                    <div className="mt-1 text-xs text-slate-400">Playback-ready recordings with fast seeking.</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-sm font-semibold text-white">Analytics that move</div>
                    <div className="mt-1 text-xs text-slate-400">Date filters + time series so you can measure impact.</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-sm font-semibold text-white">Multi-agent prompts</div>
                    <div className="mt-1 text-xs text-slate-400">One runtime, many agents. Iterate without redeploy drama.</div>
                  </div>
                </div>

                <div className="mt-7 flex items-center justify-between">
                  <div className="text-xs uppercase tracking-wider text-slate-400">Teams using this</div>
                  <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-slate-300">
                    <span className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5">Sales</span>
                    <span className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5">Support</span>
                    <span className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5">Ops</span>
                    <span className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5">Engineering</span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-300">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    <div className="text-slate-400">Avg setup</div>
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

                <TestimonialsTicker />

                <div className="mt-7 flex items-center justify-between text-xs text-slate-400">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    <span className="text-slate-300">Tip:</span> Use date filters in Analytics to validate improvements.
                  </div>
                  <div className="text-slate-500">Secure • Workspace-scoped • Fast</div>
                </div>
              </div>
            </div>
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
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage agents, prompts, calls, recordings, and analytics."
      footer={
        <div className="text-sm text-slate-300">
          No account?{" "}
          <Link to="/register" className="text-brand-300 hover:text-brand-200">
            Create one
          </Link>
        </div>
      }
    >
      <div className="space-y-3">
        <Field
          label="Email"
          value={email}
          onChange={setEmail}
          placeholder="you@company.com"
          icon={<Mail size={16} />}
        />
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
    </AuthShell>
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
    <AuthShell
      title="Create your account"
      subtitle="Get a private workspace and start building voice agents in minutes."
      footer={
        <div className="text-sm text-slate-300">
          Have an account?{" "}
          <Link to="/login" className="text-brand-300 hover:text-brand-200">
            Sign in
          </Link>
        </div>
      }
    >
      <div className="space-y-3">
        <Field label="Name" value={name} onChange={setName} placeholder="Your name" icon={<UserIcon size={16} />} />
        <Field
          label="Email"
          value={email}
          onChange={setEmail}
          placeholder="you@company.com"
          icon={<Mail size={16} />}
        />
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
    </AuthShell>
  );
}


