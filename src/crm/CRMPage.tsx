import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, Card, Input, Textarea } from "../components/ui";
import {
  listContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
  importContacts,
  backfillContacts,
} from "./api";
import type { Contact, CallRecord, OutboundJob } from "../lib/api";
import { Users, Plus, Upload, X, Phone, Mail, Building, Tag, Calendar, FileText } from "lucide-react";
import { SectionLoader } from "../components/loading";
import { GlowSpinner } from "../components/loading";
import { Drawer } from "../components/Drawer";

function Select(props: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      className={[
        "w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white",
        "focus:outline-none focus:ring-2 focus:ring-indigo-500/50",
      ].join(" ")}
    >
      {props.options.map((o) => (
        <option key={o.value} value={o.value} className="bg-slate-950">
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function CRMPage() {
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedCalls, setSelectedCalls] = useState<CallRecord[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<OutboundJob[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterSource, setFilterSource] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newTags, setNewTags] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const [csvText, setCsvText] = useState("");

  const selected = useMemo(() => (selectedId ? contacts.find((c) => c.id === selectedId) ?? null : null), [contacts, selectedId]);

  const filtered = useMemo(() => {
    let result = contacts;
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((c) => {
        return (
          c.name.toLowerCase().includes(q) ||
          c.phoneE164.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.company.toLowerCase().includes(q)
        );
      });
    }
    if (filterTag) {
      result = result.filter((c) => c.tags.includes(filterTag));
    }
    if (filterSource) {
      result = result.filter((c) => c.source === filterSource);
    }
    return result;
  }, [contacts, search, filterTag, filterSource]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    contacts.forEach((c) => c.tags.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [contacts]);

  async function refresh() {
    setLoading(true);
    try {
      const data = await listContacts({ limit: 1000 });
      setContacts(data);
      if (!selectedId && data[0]) setSelectedId(data[0].id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }

  async function loadContactDetail(id: string) {
    setLoadingDetail(true);
    try {
      const data = await getContact(id);
      setSelectedContact(data.contact);
      setSelectedCalls(data.calls);
      setSelectedJobs(data.outboundJobs);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load contact details");
    } finally {
      setLoadingDetail(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (selectedId) {
      void loadContactDetail(selectedId);
    } else {
      setSelectedContact(null);
      setSelectedCalls([]);
      setSelectedJobs([]);
    }
  }, [selectedId]);

  async function onCreate() {
    const phone = newPhone.trim();
    if (!phone) {
      toast.error("Phone number is required");
      return;
    }
    if (!/^\+?[1-9]\d{6,14}$/.test(phone)) {
      toast.error("Phone must be in E.164 format (e.g., +14155550123)");
      return;
    }

    setCreating(true);
    try {
      const tags = newTags.trim() ? newTags.split(",").map((t) => t.trim()).filter((t) => t) : [];
      const contact = await createContact({
        phoneE164: phone.startsWith("+") ? phone : `+${phone}`,
        name: newName.trim(),
        email: newEmail.trim(),
        company: newCompany.trim(),
        tags,
        notes: newNotes.trim(),
      });
      setContacts((prev) => [contact, ...prev]);
      setSelectedId(contact.id);
      setAddOpen(false);
      setNewPhone("");
      setNewName("");
      setNewEmail("");
      setNewCompany("");
      setNewTags("");
      setNewNotes("");
      toast.success("Contact created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create contact");
    } finally {
      setCreating(false);
    }
  }

  async function onUpdate(patch: Parameters<typeof updateContact>[1]) {
    if (!selectedContact) return;
    try {
      const updated = await updateContact(selectedContact.id, patch);
      setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setSelectedContact(updated);
      toast.success("Contact updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update contact");
    }
  }

  async function onDelete() {
    if (!selectedContact) return;
    if (!confirm(`Delete contact ${selectedContact.name || selectedContact.phoneE164}?`)) return;
    try {
      await deleteContact(selectedContact.id);
      setContacts((prev) => prev.filter((c) => c.id !== selectedContact.id));
      setSelectedId(null);
      toast.success("Contact deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete contact");
    }
  }

  async function onImport() {
    if (!csvText.trim()) {
      toast.error("CSV data is required");
      return;
    }
    setImporting(true);
    try {
      const result = await importContacts(csvText);
      await refresh();
      setImportOpen(false);
      setCsvText("");
      toast.success(`Imported ${result.imported} of ${result.total} contacts`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to import contacts");
    } finally {
      setImporting(false);
    }
  }

  async function onBackfill() {
    if (!confirm("Backfill contacts from existing calls and outbound jobs? This may take a moment.")) return;
    setBackfilling(true);
    try {
      const result = await backfillContacts();
      await refresh();
      toast.success(`Backfilled ${result.total} contacts (${result.created} created, ${result.updated} updated)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to backfill contacts");
    } finally {
      setBackfilling(false);
    }
  }

  function formatDate(ts: number | null) {
    if (!ts) return "—";
    return new Date(ts).toLocaleString();
  }

  function formatDuration(sec: number | null) {
    if (!sec) return "—";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr] items-start">
      <aside className="sticky top-[84px] h-[calc(100vh-120px)] overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5 flex flex-col">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold tracking-tight">Contacts</div>
            <div className="mt-1 text-xs text-slate-400">Manage leads and customers</div>
          </div>
          <div className="relative">
            <Button variant="secondary" className="px-3" onClick={() => setAddOpen(true)} disabled={loading}>
              <Plus size={16} />
            </Button>
          </div>
        </div>

        <div className="mt-4">
          <Input value={search} onChange={setSearch} placeholder="Search contacts..." />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <Select
              value={filterTag}
              onChange={setFilterTag}
              options={[{ value: "", label: "All tags" }, ...allTags.map((t) => ({ value: t, label: t }))]}
            />
          </div>
          <div>
            <Select
              value={filterSource}
              onChange={setFilterSource}
              options={[
                { value: "", label: "All sources" },
                { value: "manual", label: "Manual" },
                { value: "inbound", label: "Inbound" },
                { value: "outbound", label: "Outbound" },
                { value: "import", label: "Import" },
              ]}
            />
          </div>
        </div>

        <div className="mt-4 flex-1 min-h-0 overflow-auto scrollbar-brand pr-1">
          {loading ? (
            <SectionLoader title="Loading contacts" subtitle="Fetching your contacts…" />
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl bg-slate-950/40 p-4 text-sm text-slate-300">
              {contacts.length === 0 ? "No contacts yet." : "No contacts match your filters."}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={[
                    "w-full rounded-2xl border px-3 py-3 text-left transition",
                    c.id === selectedId
                      ? "border-brand-500/40 bg-brand-500/10"
                      : "border-white/10 bg-slate-950/35 hover:bg-white/5",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-white">{c.name || c.phoneE164}</div>
                      <div className="mt-1 text-xs text-slate-400">{c.phoneE164}</div>
                      {c.company && <div className="mt-0.5 text-xs text-slate-500">{c.company}</div>}
                    </div>
                    <div className="text-xs text-slate-300">{c.totalCalls}</div>
                  </div>
                  {c.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {c.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="rounded-full bg-brand-500/20 px-2 py-0.5 text-xs text-brand-200">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="secondary" onClick={refresh} className="flex-1" disabled={loading}>
            Refresh
          </Button>
          <Button variant="secondary" onClick={() => setImportOpen(true)} className="px-3" disabled={loading}>
            <Upload size={16} />
          </Button>
        </div>

        {contacts.length === 0 && (
          <div className="mt-4">
            <Button variant="secondary" onClick={onBackfill} disabled={backfilling} className="w-full text-xs">
              {backfilling ? <GlowSpinner label="Backfilling…" /> : "Backfill from calls"}
            </Button>
          </div>
        )}
      </aside>

      <div className="space-y-6">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">CRM</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Manage contacts, view call history, and track outbound campaigns.
            </p>
          </div>
          <div className="rounded-2xl bg-brand-500/10 px-4 py-2 text-sm text-brand-200 shadow-glow">
            <span className="inline-flex items-center gap-2">
              <Users size={16} /> {contacts.length} contacts
            </span>
          </div>
        </div>

        {!selectedContact ? (
          <Card>
            <div className="text-sm text-slate-300">Select a contact on the left to view details.</div>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="text-lg font-semibold">{selectedContact.name || selectedContact.phoneE164}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Phone size={12} /> {selectedContact.phoneE164}
                    </span>
                    {selectedContact.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail size={12} /> {selectedContact.email}
                      </span>
                    )}
                    {selectedContact.company && (
                      <span className="inline-flex items-center gap-1">
                        <Building size={12} /> {selectedContact.company}
                      </span>
                    )}
                    <span className="capitalize">{selectedContact.source}</span>
                  </div>
                  {selectedContact.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {selectedContact.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-brand-500/20 px-2 py-0.5 text-xs text-brand-200">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <Button variant="danger" onClick={onDelete} className="px-3">
                  Delete
                </Button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-xs text-slate-400">Name</div>
                  <div className="mt-2">
                    <Input
                      value={selectedContact.name}
                      onChange={(v) => onUpdate({ name: v })}
                      placeholder="Contact name"
                    />
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Email</div>
                  <div className="mt-2">
                    <Input
                      value={selectedContact.email}
                      onChange={(v) => onUpdate({ email: v })}
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Company</div>
                  <div className="mt-2">
                    <Input
                      value={selectedContact.company}
                      onChange={(v) => onUpdate({ company: v })}
                      placeholder="Company name"
                    />
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Tags (comma-separated)</div>
                  <div className="mt-2">
                    <Input
                      value={selectedContact.tags.join(", ")}
                      onChange={(v) => onUpdate({ tags: v.split(",").map((t) => t.trim()).filter((t) => t) })}
                      placeholder="VIP, Lead, Customer"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs text-slate-400">Notes</div>
                  <div className="mt-2">
                    <Textarea
                      value={selectedContact.notes}
                      onChange={(v) => onUpdate({ notes: v })}
                      placeholder="Additional notes about this contact..."
                      rows={4}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <Calendar size={12} /> {selectedContact.totalCalls} calls
                </span>
                {selectedContact.lastCallAt && (
                  <span>Last call: {formatDate(selectedContact.lastCallAt)}</span>
                )}
              </div>
            </Card>

            <Card>
              <div className="text-base font-semibold">Call History</div>
              {loadingDetail ? (
                <div className="mt-4">
                  <GlowSpinner label="Loading calls…" />
                </div>
              ) : selectedCalls.length === 0 ? (
                <div className="mt-4 text-sm text-slate-300">No calls yet.</div>
              ) : (
                <div className="mt-4 space-y-2">
                  {selectedCalls.map((call) => (
                    <div key={call.id} className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-white">{call.agentName}</div>
                          <div className="mt-1 text-xs text-slate-400">
                            {formatDate(call.startedAt)} · {formatDuration(call.durationSec)} · {call.outcome}
                          </div>
                        </div>
                        <a
                          href={`/app/call/${call.id}`}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200 hover:bg-white/10"
                        >
                          View
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <div className="text-base font-semibold">Outbound Jobs</div>
              {loadingDetail ? (
                <div className="mt-4">
                  <GlowSpinner label="Loading jobs…" />
                </div>
              ) : selectedJobs.length === 0 ? (
                <div className="mt-4 text-sm text-slate-300">No outbound jobs yet.</div>
              ) : (
                <div className="mt-4 space-y-2">
                  {selectedJobs.map((job) => (
                    <div key={job.id} className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-white">{job.leadName || job.phoneE164}</div>
                          <div className="mt-1 text-xs text-slate-400">
                            {formatDate(job.createdAt)} · {job.status}
                          </div>
                        </div>
                        <span
                          className={[
                            "rounded-full px-2 py-0.5 text-xs",
                            job.status === "completed"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : job.status === "failed"
                              ? "bg-red-500/20 text-red-300"
                              : "bg-slate-500/20 text-slate-300",
                          ].join(" ")}
                        >
                          {job.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {addOpen ? (
        <Drawer open={addOpen} onClose={() => setAddOpen(false)}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Add Contact</div>
              <button
                onClick={() => setAddOpen(false)}
                className="rounded-lg border border-white/10 bg-white/5 p-2 hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>
            <div>
              <div className="text-xs text-slate-400">Phone (E.164) *</div>
              <div className="mt-2">
                <Input value={newPhone} onChange={setNewPhone} placeholder="+14155550123" />
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Name</div>
              <div className="mt-2">
                <Input value={newName} onChange={setNewName} placeholder="John Doe" />
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Email</div>
              <div className="mt-2">
                <Input value={newEmail} onChange={setNewEmail} placeholder="john@example.com" />
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Company</div>
              <div className="mt-2">
                <Input value={newCompany} onChange={setNewCompany} placeholder="Acme Corp" />
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Tags (comma-separated)</div>
              <div className="mt-2">
                <Input value={newTags} onChange={setNewTags} placeholder="VIP, Lead" />
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Notes</div>
              <div className="mt-2">
                <Textarea value={newNotes} onChange={setNewNotes} placeholder="Additional notes..." rows={3} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={onCreate} disabled={!newPhone.trim() || creating} className="flex-1">
                {creating ? <GlowSpinner label="Creating…" /> : "Create"}
              </Button>
              <Button variant="secondary" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Drawer>
      ) : null}

      {/* CSV Import Modal */}
      {importOpen ? (
        <Drawer open={importOpen} onClose={() => setImportOpen(false)}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Import Contacts (CSV)</div>
              <button
                onClick={() => setImportOpen(false)}
                className="rounded-lg border border-white/10 bg-white/5 p-2 hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>
            <div className="text-xs text-slate-400">
              CSV format: phone,name,email,company,tags
              <br />
              Example: +14155550123,John Doe,john@example.com,Acme Corp,VIP;Lead
            </div>
            <div>
              <div className="text-xs text-slate-400">CSV Data</div>
              <div className="mt-2">
                <Textarea
                  value={csvText}
                  onChange={setCsvText}
                  placeholder="phone,name,email,company,tags&#10;+14155550123,John Doe,john@example.com,Acme Corp,VIP"
                  rows={10}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={onImport} disabled={!csvText.trim() || importing} className="flex-1">
                {importing ? <GlowSpinner label="Importing…" /> : "Import"}
              </Button>
              <Button variant="secondary" onClick={() => setImportOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Drawer>
      ) : null}
    </div>
  );
}
