import { useEffect, useState } from "react";
import { Button, Card } from "../components/ui";
import {
  ensureStripeSubscription,
  getBillingStatus,
  getBillingInvoices,
  getBillingUsageSummary,
  getUpcomingInvoice,
  startBillingUpgrade,
  type BillingInvoice,
  type BillingInvoicesResponse,
  type BillingUsageSummaryResponse,
  type BillingStatus,
  type UpcomingInvoiceResponse,
} from "../lib/api";
import { toast } from "sonner";

function fmtUsdCents(cents: number | null | undefined): string {
  const n = Number(cents || 0);
  return `$${(n / 100).toFixed(2)}`;
}

function fmtDate(ms: number | null | undefined): string {
  if (!ms) return "—";
  try {
    return new Date(ms).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

export function BillingPage() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<UpcomingInvoiceResponse | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [usage, setUsage] = useState<BillingUsageSummaryResponse | null>(null);
  const [invoices, setInvoices] = useState<BillingInvoicesResponse | null>(null);
  const [tab, setTab] = useState<"history" | "usage">("history");
  const [openInvoiceId, setOpenInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await getBillingStatus();
        if (!mounted) return;
        setStatus(s);

        // Best-effort: load usage totals from OpenMeter for "this month so far".
        try {
          const u = await getBillingUsageSummary();
          if (!mounted) return;
          setUsage(u);
        } catch {
          if (!mounted) return;
          setUsage(null);
        }

        // Best-effort: load billing history from OpenMeter (Retell-style transparency).
        try {
          const inv = await getBillingInvoices();
          if (!mounted) return;
          setInvoices(inv);
          if (inv?.upcoming?.id) setOpenInvoiceId(inv.upcoming.id);
        } catch {
          if (!mounted) return;
          setInvoices(null);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load billing status");
        if (!mounted) return;
        setStatus(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function onUpgrade() {
    try {
      const r = await startBillingUpgrade();
      if (r.url) window.location.href = r.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upgrade failed");
    }
  }

  async function loadUpcomingInvoice() {
    setInvoiceLoading(true);
    try {
      const inv = await getUpcomingInvoice();
      setInvoice(inv);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load upcoming invoice");
      setInvoice(null);
    } finally {
      setInvoiceLoading(false);
    }
  }

  async function loadUsage() {
    try {
      const u = await getBillingUsageSummary();
      setUsage(u);
    } catch {
      setUsage(null);
    }
  }

  async function loadInvoices() {
    try {
      const inv = await getBillingInvoices();
      setInvoices(inv);
      if (inv?.upcoming?.id) setOpenInvoiceId(inv.upcoming.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load invoices");
      setInvoices(null);
    }
  }

  async function ensureSubscriptionAndReload() {
    setSetupLoading(true);
    try {
      await ensureStripeSubscription();
      const s = await getBillingStatus();
      setStatus(s);
      await loadUsage();
      await loadUpcomingInvoice();
      toast.success("Stripe subscription configured");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to configure Stripe subscription");
    } finally {
      setSetupLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white">
            {status?.mode === "trial" ? "Free plan" : "Pay as you go"}
          </div>
          <div className="mt-3 text-3xl font-semibold tracking-tight">Billing</div>
          <div className="mt-2 max-w-2xl text-sm text-slate-300">
            Clear breakdown like Retell. Usage is tracked per workspace.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => void loadInvoices()} disabled={loading}>
            Refresh
          </Button>
          <Button
            variant="secondary"
            onClick={() => void loadUpcomingInvoice()}
            disabled={invoiceLoading || !status?.stripe?.subscriptionId}
          >
            {invoiceLoading ? "Loading…" : "Stripe preview"}
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="p-5">
          <div className="text-sm text-slate-300">Loading…</div>
        </Card>
      ) : !status ? (
        <Card className="p-5">
          <div className="text-sm font-semibold text-white">Billing unavailable</div>
          <div className="mt-2 text-sm text-slate-300">Could not load billing status from the server.</div>
        </Card>
      ) : status.mode === "trial" ? (
        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-white">Free trial</div>
              <div className="mt-1 text-sm text-slate-300">
                Credits remaining: <span className="font-semibold text-white">${status.trial.creditUsd.toFixed(2)}</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Approx minutes remaining (base only): {status.trial.approxMinutesRemaining} mins
              </div>
            </div>
            <Button onClick={() => void onUpgrade()}>Upgrade to paid</Button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-slate-400">Trial restrictions</div>
              <div className="mt-2 text-sm text-slate-300">
                - PSTN calls: <span className="text-white">{status.trial.allowPstn ? "Allowed" : "Not allowed"}</span>
                <br />
                - Phone number purchase:{" "}
                <span className="text-white">{status.trial.allowNumberPurchase ? "Allowed" : "Not allowed"}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-slate-400">Pricing</div>
              <div className="mt-2 text-sm text-slate-300">
                Base: <span className="text-white">${status.pricing.baseUsdPerMin.toFixed(2)}/min</span>
                <br />
                Included: <span className="text-white">{status.pricing.includedTokensPerMin}</span> tokens/min
                <br />
                Token overage: <span className="text-white">${status.pricing.tokenOverageUsdPer1K.toFixed(2)}</span> per 1K tokens
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-white/10 bg-slate-950/20 px-4 py-3">
            <button
              onClick={() => setTab("history")}
              className={[
                "rounded-xl px-3 py-2 text-sm transition",
                tab === "history" ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white",
              ].join(" ")}
            >
              Billing history
            </button>
            <button
              onClick={() => setTab("usage")}
              className={[
                "rounded-xl px-3 py-2 text-sm transition",
                tab === "usage" ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white",
              ].join(" ")}
            >
              Usage
            </button>
            <div className="ml-auto flex items-center gap-2">
              {!status?.stripe?.subscriptionId ? (
                <Button variant="secondary" onClick={() => void ensureSubscriptionAndReload()} disabled={setupLoading}>
                  {setupLoading ? "Fixing…" : "Fix Stripe setup"}
                </Button>
              ) : null}
            </div>
          </div>

          {tab === "history" ? (
            <div className="p-4 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs text-slate-400">Upcoming invoice</div>
                    <div className="mt-1 text-2xl font-semibold text-white">
                      {invoices?.upcoming?.totalCents != null ? fmtUsdCents(invoices.upcoming.totalCents) : "—"}
                    </div>
                    <div className="mt-1 text-sm text-slate-300">
                      Status: <span className="text-white">Ongoing</span>
                      {invoices?.upcoming?.periodToMs ? (
                        <>
                          {" "}
                          · Next invoice: <span className="text-white">{fmtDate(invoices.upcoming.periodToMs)}</span>
                        </>
                      ) : null}
                    </div>
                    {invoices?.upcoming?.externalIds?.invoicing ? (
                      <div className="mt-1 text-xs text-slate-400">
                        Synced to Stripe invoice:{" "}
                        <span className="font-semibold text-slate-200">{String(invoices.upcoming.externalIds.invoicing)}</span>
                      </div>
                    ) : invoices?.upcoming?.validationIssues?.length ? (
                      <div className="mt-2 text-xs text-rose-200">
                        OpenMeter invoice has validation issues. Open the invoice in OpenMeter to see details.
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={() => void loadInvoices()}>
                      Refresh
                    </Button>
                    {invoices?.upcoming?.url ? (
                      <a
                        href={invoices.upcoming.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
                      >
                        Invoice
                      </a>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                  <button
                    onClick={() => setOpenInvoiceId((v) => (v === invoices?.upcoming?.id ? null : invoices?.upcoming?.id || null))}
                    className="flex w-full items-center justify-between gap-3 bg-slate-950/20 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-950/30"
                  >
                    <div className="font-medium text-white">Breakdown</div>
                    <div className="text-slate-300">{openInvoiceId === invoices?.upcoming?.id ? "Hide" : "Show"}</div>
                  </button>
                  {openInvoiceId === invoices?.upcoming?.id ? (
                    <div className="divide-y divide-white/10">
                      {(invoices?.upcoming?.lines || []).map((l, idx) => (
                        <div key={l.id || `${idx}`} className="flex items-center justify-between gap-4 px-3 py-2 text-sm">
                          <div className="min-w-0 truncate text-slate-200">{l.name}</div>
                          <div className="shrink-0 text-right font-semibold text-white">
                            {l.amountCents == null ? "—" : fmtUsdCents(l.amountCents)}
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center justify-between gap-4 bg-white/5 px-3 py-2 text-sm">
                        <div className="text-slate-200">TOTAL</div>
                        <div className="font-semibold text-white">
                          {invoices?.upcoming?.totalCents == null ? "—" : fmtUsdCents(invoices.upcoming.totalCents)}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                <div className="grid grid-cols-4 gap-0 bg-slate-950/20 px-3 py-2 text-xs text-slate-300">
                  <div>Invoice</div>
                  <div>Created</div>
                  <div className="text-right">Amount</div>
                  <div className="text-right">Status</div>
                </div>
                <div className="divide-y divide-white/10">
                  {(invoices?.history || []).map((inv: BillingInvoice) => (
                    <div key={inv.id} className="px-3 py-2">
                      <button
                        onClick={() => setOpenInvoiceId((v) => (v === inv.id ? null : inv.id))}
                        className="grid w-full grid-cols-4 gap-0 text-left text-sm"
                      >
                        <div className="text-slate-200">{inv.number || inv.id}</div>
                        <div className="text-slate-300">{fmtDate(inv.issuedAtMs || inv.createdAtMs)}</div>
                        <div className="text-right font-semibold text-white">
                          {inv.totalCents == null ? "—" : fmtUsdCents(inv.totalCents)}
                        </div>
                        <div className="text-right text-slate-300">{inv.status || "—"}</div>
                      </button>
                      {openInvoiceId === inv.id ? (
                        <div className="mt-2 overflow-hidden rounded-2xl border border-white/10">
                          <div className="divide-y divide-white/10">
                            {(inv.lines || []).map((l, idx) => (
                              <div key={l.id || `${idx}`} className="flex items-center justify-between gap-4 px-3 py-2 text-sm">
                                <div className="min-w-0 truncate text-slate-200">{l.name}</div>
                                <div className="shrink-0 text-right font-semibold text-white">
                                  {l.amountCents == null ? "—" : fmtUsdCents(l.amountCents)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {(invoices?.history || []).length === 0 ? (
                    <div className="px-3 py-3 text-sm text-slate-300">No past invoices yet.</div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-slate-400">Stripe preview (optional)</div>
                <div className="mt-1 text-sm text-slate-300">
                  Stripe previews can include next month subscription charges; OpenMeter is the source of truth in this UI.
                </div>
                {invoice ? (
                  <div className="mt-3 text-sm text-slate-200">
                    Stripe upcoming invoice total: <span className="font-semibold text-white">{fmtUsdCents(invoice.totalCents)}</span>
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-slate-300">No Stripe preview loaded.</div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-400">This month so far</div>
                  <div className="mt-1 text-2xl font-semibold text-white">
                    {usage ? `$${Number(usage.totalUsd || 0).toFixed(2)}` : "—"}
                  </div>
                </div>
                <Button variant="secondary" onClick={() => void loadUsage()}>
                  Refresh
                </Button>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-slate-400">Usage breakdown</div>
                <div className="mt-2 space-y-2 text-sm">
                  {(usage?.lines || []).map((l) => (
                    <div key={`usage-${l.key}`} className="flex items-center justify-between gap-4">
                      <div className="min-w-0 truncate text-slate-200">{l.description}</div>
                      <div className="shrink-0 text-right text-slate-200">
                        {l.quantity != null ? (
                          <>
                            <span className="font-semibold">{Number(l.quantity || 0).toFixed(3).replace(/\.?0+$/, "")}</span>{" "}
                            <span className="text-slate-400">{l.unit}</span>
                          </>
                        ) : l.amountCents != null ? (
                          <>
                            <span className="font-semibold">{fmtUsdCents(l.amountCents)}</span>{" "}
                            <span className="text-slate-400">so far</span>
                          </>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {(usage?.lines || []).length === 0 ? <div className="text-sm text-slate-300">No usage reported yet.</div> : null}
                </div>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}


