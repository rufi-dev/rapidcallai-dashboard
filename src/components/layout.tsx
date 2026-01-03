import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  Headphones,
  LogOut,
  PhoneCall,
  Settings,
} from "lucide-react";
import { signOut } from "../lib/auth";
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
          <div className="text-lg font-semibold tracking-tight">rapidcallai</div>
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

  return (
    <HeaderSlotProvider>
      <div className="min-h-screen">
        {/* Fixed sidebar (hidden on agent detail) */}
        {!isAgentDetail ? (
          <aside className="fixed inset-y-0 left-0 hidden w-[280px] border-r border-white/10 bg-slate-950/40 p-4 backdrop-blur-xl lg:block">
            <div className="px-2">
              <div className="text-xs text-slate-400">Workspace</div>
              <div className="text-base font-semibold tracking-tight text-white">rapidcallai</div>
              <div className="mt-1 text-xs text-slate-500">Voice Studio</div>
            </div>

            <div className="mt-5 space-y-1">
              <NavItem to="/app/agents" icon={<Headphones size={18} />} label="Agents" />
              <NavItem to="/app/knowledge" icon={<BookOpen size={18} />} label="Knowledge Base" />
              <NavItem to="/app/calls" icon={<PhoneCall size={18} />} label="Call History" />
              <NavItem to="/app/analytics" icon={<BarChart3 size={18} />} label="Analytics" />
              <NavItem to="/app/settings" icon={<Settings size={18} />} label="Settings" />
            </div>

            <div className="mt-6 border-t border-white/10 pt-4">
              <button
                onClick={() => {
                  signOut();
                  nav("/login");
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                <div className="text-slate-400">
                  <LogOut size={18} />
                </div>
                <div className="font-medium">Log out</div>
              </button>
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


