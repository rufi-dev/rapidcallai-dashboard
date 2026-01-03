export type AgentProfile = {
  id: string;
  name: string;
  promptDraft?: string;
  promptPublished?: string;
  welcome?: {
    mode?: "ai" | "user";
    aiMessageMode?: "dynamic" | "custom";
    aiMessageText?: string;
    aiDelaySeconds?: number;
  };
  createdAt: number;
  publishedAt?: number | null;
  updatedAt?: number;
};

export type StartResponse = {
  livekitUrl: string;
  roomName: string;
  token: string;
  agent: { id: string; name: string };
  callId: string;
};

export type CallTranscriptItem = {
  speaker: string;
  role: "agent" | "user";
  text: string;
  final?: boolean;
  firstReceivedTime?: number;
};

export type CallRecord = {
  id: string;
  agentId: string;
  agentName: string;
  to: string; // phone number or "webtest"
  roomName: string;
  startedAt: number;
  endedAt: number | null;
  durationSec: number | null;
  outcome: string;
  costUsd: number | null;
  transcript: CallTranscriptItem[];
  recording:
    | null
    | {
        kind: "egress_s3";
        egressId: string;
        bucket: string;
        key: string;
        status: "recording" | "stopping" | "ready" | "failed";
        url: string; // `/api/calls/:id/recording` (redirects to signed URL)
      }
    | {
        // legacy/manual upload (older implementation)
        filename: string;
        mime: string;
        sizeBytes: number;
        url: string;
      };
  createdAt: number;
  updatedAt: number;
};

export type CallSummary = {
  id: string;
  agentId: string;
  agentName: string;
  to: string;
  roomName: string;
  startedAt: number;
  endedAt: number | null;
  durationSec: number | null;
  outcome: string;
  costUsd: number | null;
  recordingUrl: string | null;
  createdAt: number;
  updatedAt: number;
};

export type AnalyticsTotals = {
  callCount: number;
  completedCallCount: number;
  avgDurationSec: number | null;
  avgLatencyMs: number | null;
  totalCostUsd: number | null;
  totalTokens: number | null;
};

export type AgentAnalytics = {
  agentId: string;
  totals: AnalyticsTotals & { callCount: number; completedCallCount: number };
  latest: null | {
    callId: string;
    endedAt: number | null;
    durationSec: number | null;
    costUsd: number | null;
    tokensTotal: number | null;
    latencyMs: number | null;
  };
};

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8787";

async function readError(res: Response): Promise<string> {
  try {
    const txt = await res.text();
    if (!txt) return `${res.status}`;
    return txt;
  } catch {
    return `${res.status}`;
  }
}

export async function listAgents(): Promise<AgentProfile[]> {
  const res = await fetch(`${API_BASE}/api/agents`);
  if (!res.ok) throw new Error(`listAgents failed: ${await readError(res)}`);
  const data = (await res.json()) as { agents: AgentProfile[] };
  return data.agents;
}

export async function createAgent(input: { name: string; prompt: string }): Promise<AgentProfile> {
  const res = await fetch(`${API_BASE}/api/agents`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`createAgent failed: ${await readError(res)}`);
  const data = (await res.json()) as { agent: AgentProfile };
  return data.agent;
}

export async function getAgent(id: string): Promise<AgentProfile> {
  const res = await fetch(`${API_BASE}/api/agents/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`getAgent failed: ${await readError(res)}`);
  const data = (await res.json()) as { agent: AgentProfile };
  return data.agent;
}

export async function updateAgent(
  id: string,
  input: { name?: string; promptDraft?: string; publish?: boolean; welcome?: AgentProfile["welcome"] }
): Promise<AgentProfile> {
  const res = await fetch(`${API_BASE}/api/agents/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`updateAgent failed: ${await readError(res)}`);
  const data = (await res.json()) as { agent: AgentProfile };
  return data.agent;
}

export async function deleteAgent(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/agents/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`deleteAgent failed: ${await readError(res)}`);
}

export async function startAgent(
  id: string,
  input?: { welcome?: AgentProfile["welcome"] }
): Promise<StartResponse> {
  const res = await fetch(`${API_BASE}/api/agents/${encodeURIComponent(id)}/start`, {
    method: "POST",
    headers: input ? { "content-type": "application/json" } : undefined,
    body: input ? JSON.stringify(input) : undefined,
  });
  if (!res.ok) throw new Error(`startAgent failed: ${await readError(res)}`);
  return (await res.json()) as StartResponse;
}

export async function listCalls(): Promise<CallSummary[]> {
  const res = await fetch(`${API_BASE}/api/calls`);
  if (!res.ok) throw new Error(`listCalls failed: ${await readError(res)}`);
  const data = (await res.json()) as { calls: CallSummary[] };
  return data.calls;
}

export async function getCall(id: string): Promise<CallRecord> {
  const res = await fetch(`${API_BASE}/api/calls/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`getCall failed: ${await readError(res)}`);
  const data = (await res.json()) as { call: CallRecord };
  return data.call;
}

export async function endCall(
  id: string,
  input: { outcome?: string; costUsd?: number; transcript?: CallTranscriptItem[] }
): Promise<CallRecord> {
  const res = await fetch(`${API_BASE}/api/calls/${encodeURIComponent(id)}/end`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`endCall failed: ${await readError(res)}`);
  const data = (await res.json()) as { call: CallRecord };
  return data.call;
}

export async function getAnalytics(): Promise<{ totals: AnalyticsTotals }> {
  const res = await fetch(`${API_BASE}/api/analytics`);
  if (!res.ok) throw new Error(`getAnalytics failed: ${await readError(res)}`);
  return (await res.json()) as { totals: AnalyticsTotals };
}

export async function getAgentAnalytics(id: string): Promise<AgentAnalytics> {
  const res = await fetch(`${API_BASE}/api/agents/${encodeURIComponent(id)}/analytics`);
  if (!res.ok) throw new Error(`getAgentAnalytics failed: ${await readError(res)}`);
  return (await res.json()) as AgentAnalytics;
}


