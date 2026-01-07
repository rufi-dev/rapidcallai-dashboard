import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  CreditCard,
  Headphones,
  ChevronDown,
  LogOut,
  Phone,
  PhoneCall,
  Settings,
  User as UserIcon,
} from "lucide-react";
import { signOut } from "../lib/auth";
import { getMe, logout } from "../lib/api";
import { HeaderSlotProvider, useHeaderSlots } from "./headerSlots";

function NavItem(props: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={props.to}
      className={({ isActive }) =>
        [
          "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
          isActive
            ? "bg-white/10 text-white shadow-glow"
            : "text-slate-300 hover:bg-white/5 hover:text-white",
        ].join(" ")
      }
    >
      <div className="text-brand-400 group-hover:text-brand-300">{props.icon}</div>
      <div className="font-medium">{props.label}</div>
    </NavLink>
  );
}

function ShellHeader(props: { isAgentDetail: boolean }) {
  const { header } = useHeaderSlots();
  const [workspaceName, setWorkspaceName] = useState<string>("Workspace");
  useEffect(() => {
    let mounted = true;
    getMe()
      .then((m) => {
        if (!mounted) return;
        setWorkspaceName(m.workspace?.name || "Workspace");
      })
      .catch(() => {
        // ignore; RequireAuth handles redirects
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (props.isAgentDetail) {
    return (
      <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/40 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 px-6 py-4">
          <div className="min-w-0">{header.left}</div>
          <div className="flex items-center gap-2">{header.right}</div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/40 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4 px-6 py-4">
        <div>
          <div className="text-xs text-slate-400">Workspace</div>
          <div className="text-lg font-semibold tracking-tight">{workspaceName}</div>
        </div>
        <div className="flex items-center gap-2">{header.right}</div>
      </div>
    </header>
  );
}

export function AppShell() {
  const nav = useNavigate();
  const location = useLocation();
  const isAgentDetail = /^\/app\/agents\/[^/]+/.test(location.pathname);
  const [workspaceName, setWorkspaceName] = useState<string>("Workspace");
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    getMe()
      .then((m) => {
        if (!mounted) return;
        setWorkspaceName(m.workspace?.name || "Workspace");
        setUserName(m.user?.name || "");
        setUserEmail(m.user?.email || "");
      })
      .catch(() => {
        // ignore; RequireAuth handles redirects
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <HeaderSlotProvider>
      <div className="min-h-screen">
        {/* Fixed sidebar (hidden on agent detail) */}
        {!isAgentDetail ? (
          <aside className="fixed inset-y-0 left-0 hidden w-[280px] border-r border-white/10 bg-slate-950/40 p-4 backdrop-blur-xl lg:block">
            <div className="flex h-full flex-col">
            <div className="px-2">
              <div className="text-xs text-slate-400">Workspace</div>
              <div className="text-base font-semibold tracking-tight text-white">{workspaceName}</div>
              <div className="mt-1 text-xs text-slate-500">Voice Studio</div>
            </div>

            <div className="mt-5 space-y-1 flex-1">
              <NavItem to="/app/agents" icon={<Headphones size={18} />} label="Agents" />
              <NavItem to="/app/knowledge" icon={<BookOpen size={18} />} label="Knowledge Base" />
              <NavItem to="/app/phone-numbers" icon={<Phone size={18} />} label="Phone Numbers" />
              <NavItem to="/app/calls" icon={<PhoneCall size={18} />} label="Call History" />
              <NavItem to="/app/analytics" icon={<BarChart3 size={18} />} label="Analytics" />
              <NavItem to="/app/billing" icon={<CreditCard size={18} />} label="Billing" />
              <NavItem to="/app/settings" icon={<Settings size={18} />} label="Settings" />
            </div>

            {/* Bottom-most profile */}
            <div className="mt-auto border-t border-white/10 pt-4">
              {/* Plan / Usage (Retell-style) */}
              <div
                className="relative mb-3"
                onMouseEnter={() => setPlanOpen(true)}
                onMouseLeave={() => setPlanOpen(false)}
              >
                <button
                  onClick={() => setPlanOpen((v) => !v)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/10"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="text-brand-200">
                      <CheckCircle2 size={18} />
                    </div>
                    <div className="truncate font-medium text-white">Pay As You Go</div>
                  </div>
                  <div className="text-slate-400">
                    <ChevronDown size={18} className={planOpen ? "rotate-180 transition" : "transition"} />
                  </div>
                </button>

                {planOpen ? (
                  <div className="absolute bottom-[52px] left-0 w-full rounded-2xl border border-white/10 bg-slate-950/90 p-3 shadow-2xl backdrop-blur-xl">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-slate-300">Upcoming Invoice</div>
                        <div className="font-semibold text-white">$2.00</div>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-slate-300">Concurrency Used</div>
                        <div className="font-semibold text-white">0/20</div>
                      </div>
                      <div className="pt-2 text-xs text-slate-500">
                        Stripe integration coming next (these will be live).
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="relative">
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/10"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-2xl border border-white/10 bg-slate-950/40 flex items-center justify-center text-brand-200 shadow-glow">
                      <UserIcon size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-white">{userName || "Profile"}</div>
                      <div className="truncate text-xs text-slate-400">{userEmail || "Signed in"}</div>
                    </div>
                  </div>
                  <div className="text-slate-400">
                    <ChevronDown size={18} />
                  </div>
                </button>

                {profileOpen ? (
                  <div className="absolute bottom-[52px] left-0 w-full rounded-2xl border border-white/10 bg-slate-950/90 p-2 shadow-2xl backdrop-blur-xl">
                    <button
                      onClick={async () => {
                        try {
                          await logout();
                        } catch {
                          // ignore
                        } finally {
                          setProfileOpen(false);
                          signOut();
                          nav("/login");
                        }
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
                    >
                      <div className="text-slate-400">
                        <LogOut size={18} />
                      </div>
                      <div className="font-medium">Logout</div>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
            </div>
          </aside>
        ) : null}

        {/* Main area */}
        <div className={isAgentDetail ? "min-h-screen" : "min-h-screen lg:pl-[280px]"}>
          <ShellHeader isAgentDetail={isAgentDetail} />

          <main className="px-6 py-6">
            <Outlet />
          </main>
        </div>

        {/* Mobile fallback: keep content usable */}
        <div className="lg:hidden">{/* no-op */}</div>
      </div>
    </HeaderSlotProvider>
  );
}


