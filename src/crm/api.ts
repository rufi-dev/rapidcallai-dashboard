import { getToken, signOut } from "../lib/auth";
import type { Contact, CallRecord, OutboundJob } from "../lib/api";

const API_BASE = import.meta.env.VITE_API_BASE || "";

async function readError(res: Response): Promise<string> {
  try {
    const txt = await res.text();
    if (!txt) return `${res.status}`;
    return txt;
  } catch {
    return `${res.status}`;
  }
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init?.headers || undefined);
  if (token) headers.set("authorization", `Bearer ${token}`);
  const csrf = document.cookie
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith("csrf_token="))
    ?.split("=")[1];
  if (csrf) headers.set("x-csrf-token", decodeURIComponent(csrf));
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: "include" });
  if (res.status === 401) {
    // Token is no longer valid on the server (expired/deleted) -> force re-login.
    signOut();
  }
  return res;
}

export async function listContacts(input?: {
  search?: string;
  tag?: string;
  source?: string;
  limit?: number;
  offset?: number;
}): Promise<Contact[]> {
  const qs = new URLSearchParams();
  if (input?.search) qs.set("search", input.search);
  if (input?.tag) qs.set("tag", input.tag);
  if (input?.source) qs.set("source", input.source);
  if (typeof input?.limit === "number") qs.set("limit", String(input.limit));
  if (typeof input?.offset === "number") qs.set("offset", String(input.offset));
  const path = qs.toString() ? `/api/crm/contacts?${qs.toString()}` : "/api/crm/contacts";
  const res = await apiFetch(path);
  if (!res.ok) throw new Error(`listContacts failed: ${await readError(res)}`);
  const data = (await res.json()) as { contacts: Contact[] };
  return data.contacts;
}

export async function getContact(id: string): Promise<{ contact: Contact; calls: CallRecord[]; outboundJobs: OutboundJob[] }> {
  const res = await apiFetch(`/api/crm/contacts/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`getContact failed: ${await readError(res)}`);
  return (await res.json()) as { contact: Contact; calls: CallRecord[]; outboundJobs: OutboundJob[] };
}

export async function createContact(input: {
  phoneE164: string;
  name?: string;
  email?: string;
  company?: string;
  tags?: string[];
  notes?: string;
  metadata?: any;
}): Promise<Contact> {
  const res = await apiFetch(`/api/crm/contacts`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`createContact failed: ${await readError(res)}`);
  const data = (await res.json()) as { contact: Contact };
  return data.contact;
}

export async function updateContact(id: string, input: {
  name?: string;
  email?: string;
  company?: string;
  tags?: string[];
  notes?: string;
  metadata?: any;
}): Promise<Contact> {
  const res = await apiFetch(`/api/crm/contacts/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`updateContact failed: ${await readError(res)}`);
  const data = (await res.json()) as { contact: Contact };
  return data.contact;
}

export async function deleteContact(id: string): Promise<void> {
  const res = await apiFetch(`/api/crm/contacts/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`deleteContact failed: ${await readError(res)}`);
}

export async function importContacts(csv: string): Promise<{ contacts: Contact[]; imported: number; total: number }> {
  const res = await apiFetch(`/api/crm/contacts/import`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ csv }),
  });
  if (!res.ok) throw new Error(`importContacts failed: ${await readError(res)}`);
  return (await res.json()) as { contacts: Contact[]; imported: number; total: number };
}

export async function backfillContacts(): Promise<{ created: number; updated: number; total: number }> {
  const res = await apiFetch(`/api/crm/contacts/backfill`, { method: "POST" });
  if (!res.ok) throw new Error(`backfillContacts failed: ${await readError(res)}`);
  return (await res.json()) as { created: number; updated: number; total: number };
}
