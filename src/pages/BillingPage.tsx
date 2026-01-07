import { useMemo, useState } from "react";
import { Button, Card } from "../components/ui";
import { CreditCard, ExternalLink } from "lucide-react";

type InvoiceRow = {
  id: string;
  createdAt: string;
  amount: string;
  status: "paid" | "ongoing";
};

const MOCK_INVOICES: InvoiceRow[] = [
  { id: "upcoming", createdAt: "Upcoming invoice", amount: "$0.00", status: "ongoing" },
  { id: "2026-01-03", createdAt: "3 Jan 2026", amount: "$15.00", status: "paid" },
  { id: "2025-12-24", createdAt: "24 Dec 2025", amount: "$13.41", status: "paid" },
];

export function BillingPage() {
  const [tab, setTab] = useState<"history" | "usage">("history");
  const rows = useMemo(() => MOCK_INVOICES, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-3xl font-semibold tracking-tight">Billing</div>
          <div className="mt-2 max-w-2xl text-sm text-slate-300">
            This page is Stripe-ready. You’ll manage subscriptions, invoices, and usage here.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary">
            <ExternalLink size={16} /> Change payment methods
          </Button>
          <Button>
            <CreditCard size={16} /> Manage billing
          </Button>
        </div>
      </div>

      <Card className="p-0">
        <div className="border-b border-white/10 p-4">
          <div className="flex items-center gap-2">
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
          </div>
        </div>

        {tab === "history" ? (
          <div className="p-4">
            <div className="overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-slate-400">
                  <tr className="border-b border-white/10">
                    <th className="px-3 py-3 font-medium">Invoice created</th>
                    <th className="px-3 py-3 font-medium">Amount</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-white/5 last:border-b-0">
                      <td className="px-3 py-3 text-slate-200">{r.createdAt}</td>
                      <td className="px-3 py-3 text-slate-200">{r.amount}</td>
                      <td className="px-3 py-3">
                        <span
                          className={[
                            "inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs",
                            r.status === "paid"
                              ? "bg-emerald-500/10 text-emerald-200"
                              : "bg-white/5 text-slate-200",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "h-1.5 w-1.5 rounded-full",
                              r.status === "paid" ? "bg-emerald-400" : "bg-slate-300",
                            ].join(" ")}
                          />
                          {r.status === "paid" ? "Paid" : "Ongoing"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        {r.status === "paid" ? (
                          <Button variant="secondary">Invoice</Button>
                        ) : (
                          <Button variant="secondary">Details</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-slate-950/30">
                <div className="text-xs text-slate-400">Plan</div>
                <div className="mt-2 text-lg font-semibold text-white">Pay as you go</div>
                <div className="mt-1 text-sm text-slate-300">Stripe integration coming next.</div>
              </Card>
              <Card className="bg-slate-950/30">
                <div className="text-xs text-slate-400">Upcoming invoice</div>
                <div className="mt-2 text-lg font-semibold text-white">$0.00</div>
                <div className="mt-1 text-sm text-slate-300">This month (estimated)</div>
              </Card>
              <Card className="bg-slate-950/30">
                <div className="text-xs text-slate-400">Concurrency used</div>
                <div className="mt-2 text-lg font-semibold text-white">0 / 20</div>
                <div className="mt-1 text-sm text-slate-300">Limits will be enforced here later.</div>
              </Card>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}


