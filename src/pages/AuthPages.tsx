import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { setToken } from "../lib/auth";
import { login, register } from "../lib/api";

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <div className="mb-1 text-xs text-slate-400">{props.label}</div>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        type={props.type ?? "text"}
        placeholder={props.placeholder}
        className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
      />
    </div>
  );
}

export function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const can = useMemo(() => email.trim() && password.trim(), [email, password]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 shadow-glow">
            <Sparkles size={16} className="text-brand-300" /> Voice Studio
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight">
            Build voice agents that feel
            <span className="text-brand-300"> alive</span>.
          </h1>
          <p className="mt-4 max-w-xl text-sm text-slate-300">
            Agents, knowledge, call history, analytics — all in one dark, fast dashboard. Login to continue.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-semibold">Realtime</div>
              <div className="mt-1 text-xs text-slate-400">Low latency voice w/ transcripts</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-semibold">Multi-agent</div>
              <div className="mt-1 text-xs text-slate-400">One deployment, many prompts</div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-lg font-semibold">Welcome back</div>
          <div className="mt-1 text-sm text-slate-300">Login to your workspace</div>

          <div className="mt-6 space-y-3">
            <Field label="Email" value={email} onChange={setEmail} placeholder="you@company.com" />
            <Field label="Password" value={password} onChange={setPassword} type="password" placeholder="••••••••" />
            <button
              disabled={!can}
              onClick={async () => {
                try {
                  setErr(null);
                  const out = await login({ email: email.trim(), password });
                  setToken(out.token);
                  nav("/app/agents");
                } catch (e) {
                  setErr(e instanceof Error ? e.message : "Login failed");
                }
              }}
              className="mt-2 w-full rounded-2xl bg-brand-500/20 px-4 py-3 text-sm font-semibold text-brand-200 shadow-glow transition hover:bg-brand-500/25 disabled:opacity-50"
            >
              Login
            </button>
            {err ? <div className="text-sm text-red-300">{err}</div> : null}
          </div>

          <div className="mt-5 text-sm text-slate-300">
            No account?{" "}
            <Link to="/register" className="text-brand-300 hover:text-brand-200">
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const nav = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const can = useMemo(() => email.trim() && password.trim() && name.trim(), [email, password, name]);

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="inline-flex items-center gap-2 rounded-2xl bg-brand-500/15 px-3 py-2 text-sm text-brand-200 shadow-glow">
          <Sparkles size={16} /> Create account
        </div>
        <div className="mt-4 text-2xl font-semibold tracking-tight">Let’s get you set up</div>
        <div className="mt-1 text-sm text-slate-300">Create an account to get a private workspace.</div>

        <div className="mt-6 space-y-3">
          <Field label="Name" value={name} onChange={setName} placeholder="Rufia" />
          <Field label="Email" value={email} onChange={setEmail} placeholder="you@company.com" />
          <Field label="Password" value={password} onChange={setPassword} type="password" placeholder="••••••••" />
          <button
            disabled={!can}
            onClick={async () => {
              try {
                setErr(null);
                const out = await register({ name: name.trim(), email: email.trim(), password });
                setToken(out.token);
                nav("/app/agents", { state: { from: location.pathname } });
              } catch (e) {
                setErr(e instanceof Error ? e.message : "Register failed");
              }
            }}
            className="mt-2 w-full rounded-2xl bg-brand-500/20 px-4 py-3 text-sm font-semibold text-brand-200 shadow-glow transition hover:bg-brand-500/25 disabled:opacity-50"
          >
            Create & continue
          </button>
          {err ? <div className="text-sm text-red-300">{err}</div> : null}
        </div>

        <div className="mt-5 text-sm text-slate-300">
          Have an account?{" "}
          <Link to="/login" className="text-brand-300 hover:text-brand-200">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}


