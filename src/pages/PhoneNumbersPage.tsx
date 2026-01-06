import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, Card, Input } from "../components/ui";
import {
  buyTwilioNumber,
  createPhoneNumber,
  deletePhoneNumber,
  ensureTwilioSubaccount,
  getMe,
  listAgents,
  listPhoneNumbers,
  searchTwilioNumbers,
  updatePhoneNumber,
} from "../lib/api";
import type { AgentProfile, PhoneNumber, TwilioAvailableNumber } from "../lib/api";
import { Plus, Phone } from "lucide-react";

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

export function PhoneNumbersPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [agents, setAgents] = useState<AgentProfile[]>([]);

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newE164, setNewE164] = useState("");
  const [newLabel, setNewLabel] = useState("");

  // Buy modal (Phase 2)
  const [buyOpen, setBuyOpen] = useState(false);
  const [buyCountry, setBuyCountry] = useState("US");
  const [buyType, setBuyType] = useState<"local" | "tollfree">("local");
  const [buyQuery, setBuyQuery] = useState("");
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyResults, setBuyResults] = useState<TwilioAvailableNumber[]>([]);

  const selected = useMemo(
    () => (selectedId ? phoneNumbers.find((p) => p.id === selectedId) ?? null : null),
    [phoneNumbers, selectedId]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return phoneNumbers;
    return phoneNumbers.filter((p) => {
      return (
        p.e164.toLowerCase().includes(q) ||
        (p.label ?? "").toLowerCase().includes(q) ||
        p.status.toLowerCase().includes(q)
      );
    });
  }, [phoneNumbers, search]);

  async function refresh() {
    setLoading(true);
    try {
      const [nums, ags] = await Promise.all([listPhoneNumbers(), listAgents()]);
      setPhoneNumbers(nums);
      setAgents(ags);
      if (!selectedId && nums[0]) setSelectedId(nums[0].id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load phone numbers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    getMe()
      .then((m) => {
        if (!mounted) return;
        setWorkspaceId(m.workspace.id);
      })
      .catch(() => {
        // ignore; RequireAuth handles redirects
      });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const agentOptions = useMemo(() => {
    return [
      { value: "", label: "— Select agent —" },
      ...agents.map((a) => ({ value: a.id, label: `${a.name} (${a.id})` })),
    ];
  }, [agents]);

  async function onCreateManual() {
    const e164 = newE164.trim();
    if (!e164) return;
    setCreating(true);
    try {
      const created = await createPhoneNumber({ e164, label: newLabel.trim() || undefined });
      setPhoneNumbers((prev) => [created, ...prev]);
      setSelectedId(created.id);
      setNewE164("");
      setNewLabel("");
      setMenuOpen(false);
      toast.success("Phone number added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add phone number");
    } finally {
      setCreating(false);
    }
  }

  async function onOpenBuy() {
    if (!workspaceId) {
      toast.error("Workspace not loaded yet");
      return;
    }
    try {
      await ensureTwilioSubaccount(workspaceId);
      setBuyResults([]);
      setBuyOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Twilio not ready");
    }
  }

  async function onSearchBuy() {
    if (!workspaceId) {
      toast.error("Workspace not loaded yet");
      return;
    }
    setBuyLoading(true);
    try {
      await ensureTwilioSubaccount(workspaceId);
      const results = await searchTwilioNumbers({
        workspaceId,
        country: buyCountry,
        type: buyType,
        contains: buyQuery.trim() || undefined,
        limit: 20,
      });
      setBuyResults(results);
      if (results.length === 0) toast.message("No numbers found. Try another search.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Search failed");
    } finally {
      setBuyLoading(false);
    }
  }

  async function onPurchase(n: TwilioAvailableNumber) {
    if (!workspaceId) {
      toast.error("Workspace not loaded yet");
      return;
    }
    setBuyLoading(true);
    try {
      const resp = await buyTwilioNumber({
        workspaceId,
        phoneNumber: n.phoneNumber,
        label: newLabel.trim() || undefined,
      });
      setPhoneNumbers((prev) => [resp.phoneNumber, ...prev]);
      setSelectedId(resp.phoneNumber.id);
      setBuyOpen(false);
      setBuyResults([]);
      toast.success("Number purchased");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Purchase failed");
    } finally {
      setBuyLoading(false);
    }
  }

  async function onSavePatch(patch: Parameters<typeof updatePhoneNumber>[1]) {
    if (!selected) return;
    try {
      const updated = await updatePhoneNumber(selected.id, patch);
      setPhoneNumbers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      toast.success("Saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    }
  }

  async function onDeleteSelected() {
    if (!selected) return;
    if (!confirm(`Delete ${selected.e164}?`)) return;
    try {
      await deletePhoneNumber(selected.id);
      setPhoneNumbers((prev) => prev.filter((p) => p.id !== selected.id));
      setSelectedId((prev) => {
        if (prev !== selected.id) return prev;
        const next = phoneNumbers.find((p) => p.id !== selected.id);
        return next ? next.id : null;
      });
      toast.success("Deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr] items-start">
      <aside className="sticky top-[84px] h-[calc(100vh-120px)] overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5 flex flex-col">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold tracking-tight">Phone Numbers</div>
            <div className="mt-1 text-xs text-slate-400">Connect numbers to inbound/outbound agents</div>
          </div>
          <div className="relative">
            <Button
              variant="secondary"
              className="px-3"
              onClick={() => setMenuOpen((v) => !v)}
              disabled={loading}
            >
              <Plus size={16} />
            </Button>
            {menuOpen ? (
              <div className="absolute right-0 mt-2 w-[260px] rounded-2xl border border-white/10 bg-slate-950/90 p-3 shadow-xl backdrop-blur-xl">
                <div className="text-xs text-slate-400">Add number</div>
                <div className="mt-2 space-y-2">
                  <Input value={newE164} onChange={setNewE164} placeholder="E.164 e.g. +14155550123" />
                  <Input value={newLabel} onChange={setNewLabel} placeholder="Label (optional)" />
                  <div className="flex gap-2">
                    <Button onClick={onCreateManual} disabled={!newE164.trim() || creating} className="flex-1">
                      {creating ? "Adding…" : "Add (manual)"}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setMenuOpen(false);
                        void onOpenBuy();
                      }}
                      className="px-3"
                    >
                      Buy
                    </Button>
                  </div>
                  <button
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/10"
                    onClick={() => {
                      setMenuOpen(false);
                      toast.message("SIP trunk connection UI will be Phase 3 (after Twilio).");
                    }}
                  >
                    Connect via SIP trunking
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4">
          <Input value={search} onChange={setSearch} placeholder="Search phone numbers" />
        </div>

        <div className="mt-4 flex-1 min-h-0 overflow-auto scrollbar-brand pr-1">
          {loading ? (
            <div className="rounded-2xl bg-slate-950/40 p-4 text-sm text-slate-300">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl bg-slate-950/40 p-4 text-sm text-slate-300">No phone numbers yet.</div>
          ) : (
            <div className="space-y-2">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={[
                    "w-full rounded-2xl border px-3 py-3 text-left transition",
                    p.id === selectedId
                      ? "border-brand-500/40 bg-brand-500/10"
                      : "border-white/10 bg-slate-950/35 hover:bg-white/5",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white">{p.label || p.e164}</div>
                      <div className="mt-1 text-xs text-slate-400">{p.e164}</div>
                    </div>
                    <div className="text-xs text-slate-300">{p.status}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="secondary" onClick={refresh} className="flex-1">
            Refresh
          </Button>
          <Button variant="danger" onClick={onDeleteSelected} disabled={!selected}>
            Delete
          </Button>
        </div>
      </aside>

      <div className="space-y-6">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Phone numbers</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Phase 1: store mappings. Phase 2: buy via Twilio + subaccounts. Phase 3: connect SIP trunks to LiveKit.
            </p>
          </div>
          <div className="rounded-2xl bg-brand-500/10 px-4 py-2 text-sm text-brand-200 shadow-glow">
            <span className="inline-flex items-center gap-2">
              <Phone size={16} /> {phoneNumbers.length} saved
            </span>
          </div>
        </div>

        {!selected ? (
          <Card>
            <div className="text-sm text-slate-300">Select a phone number on the left.</div>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold">{selected.label || selected.e164}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {selected.e164} · Provider: {selected.provider} · Status: {selected.status}
                  </div>
                </div>
                <div className="w-full max-w-md">
                  <div className="text-xs text-slate-400">Label</div>
                  <div className="mt-2">
                    <Input
                      value={selected.label ?? ""}
                      onChange={(v) => {
                        setPhoneNumbers((prev) => prev.map((p) => (p.id === selected.id ? { ...p, label: v } : p)));
                      }}
                      placeholder="e.g. with prefix +Australia"
                    />
                  </div>
                  <div className="mt-2">
                    <Button onClick={() => onSavePatch({ label: selected.label })}>Save label</Button>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="text-base font-semibold">Inbound Call Agent</div>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-xs text-slate-400">Call Agent</div>
                  <div className="mt-2">
                    <Select
                      value={selected.inboundAgentId ?? ""}
                      onChange={(v) => onSavePatch({ inboundAgentId: v ? v : null })}
                      options={agentOptions}
                    />
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Allowed Inbound Countries</div>
                  <div className="mt-2">
                    <Input
                      value={(selected.allowedInboundCountries ?? ["all"]).join(", ")}
                      onChange={(v) =>
                        setPhoneNumbers((prev) =>
                          prev.map((p) =>
                            p.id === selected.id ? { ...p, allowedInboundCountries: v.split(",").map((x) => x.trim()) } : p
                          )
                        )
                      }
                      placeholder='all  (or "US, CA")'
                    />
                  </div>
                  <div className="mt-2">
                    <Button onClick={() => onSavePatch({ allowedInboundCountries: selected.allowedInboundCountries })}>
                      Save inbound countries
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="text-base font-semibold">Outbound Call Agent</div>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-xs text-slate-400">Call Agent</div>
                  <div className="mt-2">
                    <Select
                      value={selected.outboundAgentId ?? ""}
                      onChange={(v) => onSavePatch({ outboundAgentId: v ? v : null })}
                      options={agentOptions}
                    />
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Allowed Outbound Countries</div>
                  <div className="mt-2">
                    <Input
                      value={(selected.allowedOutboundCountries ?? ["all"]).join(", ")}
                      onChange={(v) =>
                        setPhoneNumbers((prev) =>
                          prev.map((p) =>
                            p.id === selected.id ? { ...p, allowedOutboundCountries: v.split(",").map((x) => x.trim()) } : p
                          )
                        )
                      }
                      placeholder='all  (or "US, CA")'
                    />
                  </div>
                  <div className="mt-2">
                    <Button onClick={() => onSavePatch({ allowedOutboundCountries: selected.allowedOutboundCountries })}>
                      Save outbound countries
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="text-base font-semibold">SIP trunking (LiveKit)</div>
              <div className="mt-2 text-sm text-slate-300">
                Paste your LiveKit Cloud SIP trunk IDs here (Phase 3). Once set, we can route real PSTN calls through LiveKit.
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-xs text-slate-400">Inbound trunk ID</div>
                  <div className="mt-2">
                    <Input
                      value={selected.livekitInboundTrunkId ?? ""}
                      onChange={(v) =>
                        setPhoneNumbers((prev) =>
                          prev.map((p) => (p.id === selected.id ? { ...p, livekitInboundTrunkId: v } : p))
                        )
                      }
                      placeholder="e.g. it_123..."
                    />
                  </div>
                  <div className="mt-2">
                    <Button onClick={() => onSavePatch({ livekitInboundTrunkId: selected.livekitInboundTrunkId || null })}>
                      Save inbound trunk
                    </Button>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Outbound trunk ID</div>
                  <div className="mt-2">
                    <Input
                      value={selected.livekitOutboundTrunkId ?? ""}
                      onChange={(v) =>
                        setPhoneNumbers((prev) =>
                          prev.map((p) => (p.id === selected.id ? { ...p, livekitOutboundTrunkId: v } : p))
                        )
                      }
                      placeholder="e.g. ot_123..."
                    />
                  </div>
                  <div className="mt-2">
                    <Button onClick={() => onSavePatch({ livekitOutboundTrunkId: selected.livekitOutboundTrunkId || null })}>
                      Save outbound trunk
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {buyOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-slate-950/90 p-5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-semibold">Buy phone number</div>
                <div className="mt-1 text-xs text-slate-400">Twilio · Workspace: {workspaceId}</div>
              </div>
              <button
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
                onClick={() => setBuyOpen(false)}
                disabled={buyLoading}
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[160px_160px_1fr_120px]">
              <div>
                <div className="text-xs text-slate-400">Country</div>
                <div className="mt-2">
                  <Select
                    value={buyCountry}
                    onChange={setBuyCountry}
                    options={[
                      { value: "US", label: "United States (US)" },
                      { value: "CA", label: "Canada (CA)" },
                      { value: "GB", label: "United Kingdom (GB)" },
                      { value: "AU", label: "Australia (AU)" },
                    ]}
                  />
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Type</div>
                <div className="mt-2">
                  <Select
                    value={buyType}
                    onChange={(v) => setBuyType(v === "tollfree" ? "tollfree" : "local")}
                    options={[
                      { value: "local", label: "Local" },
                      { value: "tollfree", label: "Toll-free" },
                    ]}
                  />
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Search</div>
                <div className="mt-2">
                  <Input value={buyQuery} onChange={setBuyQuery} placeholder="Contains (optional), e.g. 650" />
                </div>
              </div>
              <div className="flex items-end">
                <Button onClick={() => void onSearchBuy()} disabled={buyLoading} className="w-full">
                  {buyLoading ? "…" : "Search"}
                </Button>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20">
              <div className="max-h-[420px] overflow-auto scrollbar-brand">
                {buyResults.length === 0 ? (
                  <div className="p-4 text-sm text-slate-300">Search to see available numbers.</div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs text-slate-400">
                      <tr className="border-b border-white/10">
                        <th className="px-3 py-3 font-medium">Number</th>
                        <th className="px-3 py-3 font-medium">Location</th>
                        <th className="px-3 py-3 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buyResults.map((n) => (
                        <tr key={n.phoneNumber} className="border-b border-white/5 last:border-b-0">
                          <td className="px-3 py-3 font-mono text-xs text-slate-200">{n.phoneNumber}</td>
                          <td className="px-3 py-3 text-slate-300">
                            {(n.locality || "—") + (n.region ? `, ${n.region}` : "")}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <Button
                              variant="secondary"
                              onClick={() => void onPurchase(n)}
                              disabled={buyLoading}
                              className="px-3"
                            >
                              Buy
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-400">
              Note: some countries require extra compliance (address/identity). We’ll handle those later if needed.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


