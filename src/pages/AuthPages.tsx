import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Lock, Mail, Sparkles, User as UserIcon } from "lucide-react";
import { setToken } from "../lib/auth";
import { login, register } from "../lib/api";
import review1 from "../assets/reviews/r1.jpg";
import review2 from "../assets/reviews/r2.jpg";
import review3 from "../assets/reviews/r3.jpg";

type Review = {
  name: string;
  title: string;
  quote: string;
  photo: string;
};

const REVIEWS: Review[] = [
  {
    name: "Maya Chen",
    title: "Ops Lead • Support",
    photo: review1,
    quote:
      "The UI is genuinely calm and fast. We review calls, share a link internally, and fix the prompt in minutes. It feels like a product you can trust in production.",
  },
  {
    name: "Omar K.",
    title: "Founder • Voice SaaS",
    photo: review2,
    quote:
      "Recordings + transcripts changed everything. Instead of debating what happened, we just open the call and see it. The dashboard looks premium without getting in the way.",
  },
  {
    name: "Lina R.",
    title: "Engineer • Realtime",
    photo: review3,
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
    const id = window.setInterval(() => setIdx((x) => (x + 1) % REVIEWS.length), 7200);
    return () => window.clearInterval(id);
  }, []);

  const a = REVIEWS[idx % REVIEWS.length];
  const nextIdx = (idx + 1) % REVIEWS.length;
  const b = REVIEWS[nextIdx];

  return (
    <div className="relative h-[360px] w-full">
      <div key={idx} className="absolute inset-0 auth-review auth-review-drop">
        <div className="flex items-center gap-3">
          <img
            src={a.photo}
            alt={`${a.name} photo`}
            className="h-12 w-12 rounded-2xl border border-white/10 shadow-glow object-cover"
            loading="lazy"
          />
          <div className="min-w-0">
            <div className="text-base font-semibold text-white leading-tight">{a.name}</div>
            <div className="text-sm text-slate-300">{a.title}</div>
          </div>
        </div>
        <div className="mt-4 text-sm leading-relaxed text-slate-100/90">“{a.quote}”</div>
      </div>

      {/* preloaded second card for smoother feel */}
      <div className="absolute inset-0 auth-review opacity-0 pointer-events-none">
        <div className="flex items-center gap-3">
          <img
            src={b.photo}
            alt=""
            className="h-12 w-12 rounded-2xl border border-white/10 shadow-glow object-cover"
            loading="lazy"
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

function ReviewSpotlight() {
  return (
    <div className="auth-card auth-enter-delayed flex h-[640px] flex-col overflow-hidden">
      <div className="border-b border-white/10 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400">Testimonials</div>
            <div className="mt-1 text-lg font-semibold text-white">Real feedback from real teams</div>
          </div>
          <div className="rounded-2xl bg-brand-500/10 px-3 py-2 text-xs text-brand-200 shadow-glow">Verified</div>
        </div>
        <div className="mt-3 text-sm text-slate-300">
          One story at a time — the card drops in, stays readable, then glides away.
        </div>
      </div>

      <div className="flex-1 px-6 py-6">
        <ReviewCrossfade />

        <div className="mt-6 grid grid-cols-3 gap-2 text-xs text-slate-300">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-slate-400">Time to value</div>
            <div className="mt-0.5 text-slate-100">minutes</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-slate-400">Workflow</div>
            <div className="mt-0.5 text-slate-100">calm</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-slate-400">Quality</div>
            <div className="mt-0.5 text-slate-100">premium</div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 px-6 py-5">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">New review every ~7s</div>
          <div className="text-slate-500">No spam • No noise • Just signal</div>
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
        <div className="grid h-full items-center gap-8 lg:grid-cols-[520px_1fr]">
          {/* Left: story + form */}
          <div className="auth-enter">
            <div className="hidden lg:block">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 shadow-glow">
                <Sparkles size={16} className="text-brand-300" /> Voice Studio
              </div>

              <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white">
                Ship voice agents with a dashboard that feels <span className="text-brand-300">lux</span>.
              </h1>
              <p className="mt-4 text-sm text-slate-300 max-w-lg">
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
            </div>

            <div className="auth-card mt-8 lg:mt-10">
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
          </div>

          {/* Right: BIG testimonials */}
          <div className="hidden lg:block">
            <ReviewSpotlight />
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


