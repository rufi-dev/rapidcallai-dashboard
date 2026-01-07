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
};

const TESTIMONIALS: Testimonial[] = [
  {
    name: "A. Founder",
    title: "Voice SaaS",
    quote: "We went from idea to production in days. The call history + recordings made debugging effortless.",
  },
  {
    name: "S. Ops Lead",
    title: "Customer Support",
    quote: "The dashboard feels fast, clean, and actually usable. The transcript + analytics combo is gold.",
  },
  {
    name: "M. Engineer",
    title: "AI Platform",
    quote: "Ship agents, iterate prompts, and keep control. Everything is organized exactly where I expect it.",
  },
  {
    name: "D. PM",
    title: "Growth Team",
    quote: "The UX is clean enough that non-technical teammates can run tests and review calls without help.",
  },
  {
    name: "K. Builder",
    title: "Indie Hacker",
    quote: "Prompt iteration is fast, and the recordings + transcripts give instant feedback on what to fix.",
  },
  {
    name: "R. Support",
    title: "Operations",
    quote: "Having one place for phone + web sessions is huge. We finally stopped switching tools all day.",
  },
  {
    name: "T. Engineer",
    title: "Realtime Systems",
    quote: "The product feels snappy. Latency improvements are visible in analytics and confirmed in recordings.",
  },
  {
    name: "N. Founder",
    title: "AI Startup",
    quote: "This is the first dashboard that looks premium and stays practical when you’re shipping daily.",
  },
];

function BrandMark() {
  return (
    <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 shadow-glow">
      <Sparkles size={16} className="text-brand-300" /> Voice Studio
    </div>
  );
}

function TestimonialCard(props: { t: Testimonial }) {
  const { t } = props;
  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-brand-500/15 shadow-glow flex items-center justify-center text-brand-200 font-semibold">
          {t.name.slice(0, 1)}
        </div>
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
    <div className="auth-ticker-mask mt-4 flex-1 min-h-0 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5">
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
    <div className="min-h-screen">
      {/* cinematic gradient overlay */}
      <div className="pointer-events-none fixed inset-0 auth-aurora" />

      <div className="mx-auto flex min-h-screen w-full max-w-7xl items-stretch px-4 py-10 lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[440px_1fr] items-stretch">
          {/* Left: form */}
          <div className="relative">
            <div className="sticky top-10">
              <BrandMark />
              <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white">{props.title}</h1>
              <p className="mt-2 text-sm text-slate-300">{props.subtitle}</p>

              <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_0_1px_rgba(0,240,106,.08),0_30px_120px_rgba(0,0,0,.45)]">
                {props.children}
                <div className="mt-5">{props.footer}</div>
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

                <TestimonialsTicker />

                <div className="mt-7 flex items-center justify-between text-xs text-slate-400">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    <span className="text-slate-300">Tip:</span> Use date filters in Analytics to validate improvements.
                  </div>
                  <div className="text-slate-500">Secure • Workspace-scoped • Fast</div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-300">
                  <div className="rounded-2xl bg-white/5 px-3 py-2 border border-white/10">
                    <div className="text-slate-400">Latency</div>
                    <div className="mt-0.5 text-slate-100">fast</div>
                  </div>
                  <div className="rounded-2xl bg-white/5 px-3 py-2 border border-white/10">
                    <div className="text-slate-400">Setup</div>
                    <div className="mt-0.5 text-slate-100">simple</div>
                  </div>
                  <div className="rounded-2xl bg-white/5 px-3 py-2 border border-white/10">
                    <div className="text-slate-400">UX</div>
                    <div className="mt-0.5 text-slate-100">clean</div>
                  </div>
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


