import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import { AppShell } from "./components/layout";
import { AgentsPage } from "./pages/AgentsPage";
import { AgentDetailPage } from "./pages/AgentDetailPage";
import { KnowledgeBasePage } from "./pages/KnowledgeBasePage";
import { CallHistoryPage } from "./pages/CallHistoryPage";
import { CallDetailPage } from "./pages/CallDetailPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { BillingPage } from "./pages/BillingPage";
import { SettingsPage } from "./pages/SettingsPage";
import { PhoneNumbersPage } from "./pages/PhoneNumbersPage";
import { OutboundCallsPage } from "./pages/OutboundCallsPage";
import { LoginPage, RegisterPage } from "./pages/AuthPages";
import { isAuthed, signOut } from "./lib/auth";
import { getMe } from "./lib/api";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [ok, setOk] = useState<boolean>(isAuthed());

  useEffect(() => {
    let mounted = true;
    getMe()
      .then(() => {
        if (!mounted) return;
        setOk(true);
        setChecked(true);
      })
      .catch(() => {
        if (!mounted) return;
        signOut();
        setOk(false);
        setChecked(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!checked) return null;
  if (!ok) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/app/agents" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path="agents" element={<AgentsPage />} />
          <Route path="agents/:id" element={<AgentDetailPage />} />
          <Route path="knowledge" element={<KnowledgeBasePage />} />
          <Route path="phone-numbers" element={<PhoneNumbersPage />} />
          <Route path="outbound" element={<OutboundCallsPage />} />
          <Route path="calls" element={<CallHistoryPage />} />
          <Route path="calls/:id" element={<CallHistoryPage />} />
          <Route path="call/:id" element={<CallDetailPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/app/agents" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
