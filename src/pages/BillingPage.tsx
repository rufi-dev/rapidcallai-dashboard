import { useEffect, useState } from "react";
import { Button, Card } from "../components/ui";
import {
  ensureStripeSubscription,
  getBillingStatus,
  getBillingUsageSummary,
  getUpcomingInvoice,
  startBillingUpgrade,
  type BillingUsageSummaryResponse,
  type BillingStatus,
  type UpcomingInvoiceResponse,
} from "../lib/api";
import { toast } from "sonner";

export function BillingPage() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<UpcomingInvoiceResponse | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [showNextInvoice, setShowNextInvoice] = useState(false);
  const [usage, setUsage] = useState<BillingUsageSummaryResponse | null>(null);

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
      <div>
        <div className="text-3xl font-semibold tracking-tight">Billing</div>
        <div className="mt-2 max-w-2xl text-sm text-slate-300">Usage is tracked per workspace. Billing starts only after upgrade.</div>
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
        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-white">
                {usage ? `This month so far: $${Number(usage.totalUsd || 0).toFixed(2)}` : "This month so far: —"}
              </div>
              <div className="mt-1 text-sm text-slate-300">
                This is an estimate of what you used <span className="text-slate-200">this billing period</span> (from OpenMeter).
              </div>
              {!status?.stripe?.subscriptionId ? (
                <div className="mt-2 text-xs text-amber-200">
                  Stripe subscription not configured for this workspace yet. Click “Fix billing setup”.
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {!status?.stripe?.subscriptionId ? (
                <Button variant="secondary" onClick={() => void ensureSubscriptionAndReload()} disabled={setupLoading}>
                  {setupLoading ? "Fixing…" : "Fix billing setup"}
                </Button>
              ) : null}
              <Button
                variant="secondary"
                onClick={() => void loadUpcomingInvoice()}
                disabled={invoiceLoading || !status?.stripe?.subscriptionId}
              >
                {invoiceLoading ? "Loading…" : "Load upcoming invoice"}
              </Button>
            </div>
          </div>

          {usage ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-slate-400">Usage so far (this billing period)</div>
                <button
                  onClick={() => void loadUsage()}
                  className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs text-white hover:bg-white/15"
                >
                  Refresh
                </button>
              </div>
              <div className="mt-2 space-y-2 text-sm">
                {(usage.lines || []).map((l) => (
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
                          <span className="font-semibold">${(Number(l.amountCents || 0) / 100).toFixed(2)}</span>{" "}
                          <span className="text-slate-400">so far</span>
                        </>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>
                  </div>
                ))}
                {(usage.lines || []).length === 0 ? <div className="text-sm text-slate-300">No usage reported yet.</div> : null}
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              Usage is not available yet (OpenMeter not configured or no data).
            </div>
          )}

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-slate-400">Next invoice preview (Stripe)</div>
            <div className="mt-1 text-sm text-slate-300">
              Stripe previews often include the <span className="text-slate-200">next month</span> phone subscription charge (that’s why you see $4).
            </div>
          </div>

          {invoice ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
              <div className="grid gap-2 border-b border-white/10 bg-slate-950/20 px-3 py-2 text-xs text-slate-300 md:grid-cols-2">
                <div className="flex items-center justify-between gap-3">
                  <div>Due now (prorations)</div>
                  <div className="font-semibold text-white">
                    ${(Number(invoice.dueNowCents || 0) / 100).toFixed(2)}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 md:justify-end">
                  <button
                    onClick={() => setShowNextInvoice((v) => !v)}
                    className="text-slate-300 underline-offset-2 hover:text-white hover:underline"
                  >
                    {showNextInvoice ? "Hide" : "Show"} next invoice preview
                  </button>
                  {showNextInvoice ? (
                    <div className="font-semibold text-white">${(invoice.totalCents / 100).toFixed(2)}</div>
                  ) : (
                    <div className="font-semibold text-white">—</div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-0 bg-white/5 px-3 py-2 text-xs text-slate-300">
                <div>Line item</div>
                <div className="text-right">Qty</div>
                <div className="text-right">Amount</div>
              </div>
              <div className="divide-y divide-white/10">
                {(showNextInvoice ? invoice.lines : invoice.lines.filter((l) => Boolean(l.proration))).map((l) => (
                  <div key={l.id} className="grid grid-cols-3 gap-0 px-3 py-2 text-sm">
                    <div className="text-slate-200">{l.description}</div>
                    <div className="text-right text-slate-300">{l.quantity == null ? "—" : l.quantity}</div>
                    <div className="text-right font-semibold text-white">${(l.amountCents / 100).toFixed(2)}</div>
                  </div>
                ))}
                {showNextInvoice ? (
                  <div className="grid grid-cols-3 gap-0 bg-white/5 px-3 py-2 text-sm">
                    <div className="text-slate-200">TOTAL</div>
                    <div />
                    <div className="text-right font-semibold text-white">${invoice.totalUsd.toFixed(2)}</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-0 bg-white/5 px-3 py-2 text-sm">
                    <div className="text-slate-200">TOTAL (due now)</div>
                    <div />
                    <div className="text-right font-semibold text-white">
                      ${(Number(invoice.dueNowCents || 0) / 100).toFixed(2)}
                    </div>
                  </div>
                )}
              </div>
              {!invoice.sums.matchesTotal ? (
                <div className="px-3 py-2 text-xs text-rose-200">
                  Display error: line item sum does not match Stripe total. Please refresh and contact support if this persists.
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 text-sm text-slate-300">No invoice loaded yet.</div>
          )}
        </Card>
      )}
    </div>
  );
}


