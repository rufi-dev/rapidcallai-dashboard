import { Card } from "../components/ui";
import { Database, FileUp, Link2, Trash2 } from "lucide-react";

export function KnowledgeBasePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold tracking-tight">Knowledge Base</div>
          <div className="mt-1 text-sm text-slate-300">
            Attach files and links to ground your agents (UI stub — wire to storage next).
          </div>
        </div>
        <button className="rounded-2xl bg-brand-500/15 px-4 py-2 text-sm font-semibold text-brand-200 shadow-glow transition hover:bg-brand-500/20">
          <span className="inline-flex items-center gap-2">
            <FileUp size={16} /> Upload
          </span>
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Sources</div>
              <div className="text-xs text-slate-400">Files, URLs, and notes</div>
            </div>
            <div className="text-xs text-slate-400">0 items</div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-6 text-sm text-slate-300">
            No knowledge sources yet. Add a PDF, docs link, or notes to improve answers.
          </div>
        </Card>

        <Card>
          <div className="text-sm font-semibold">Quick add</div>
          <div className="mt-4 space-y-3">
            <button className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-left text-sm text-slate-200 transition hover:bg-white/5">
              <span className="inline-flex items-center gap-2">
                <Link2 size={16} className="text-brand-300" /> Add URL
              </span>
              <div className="mt-1 text-xs text-slate-400">Crawl a public page</div>
            </button>
            <button className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-left text-sm text-slate-200 transition hover:bg-white/5">
              <span className="inline-flex items-center gap-2">
                <Database size={16} className="text-brand-300" /> Connect vector store
              </span>
              <div className="mt-1 text-xs text-slate-400">Pinecone, Qdrant, etc</div>
            </button>
            <button className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-left text-sm text-slate-200 transition hover:bg-white/5">
              <span className="inline-flex items-center gap-2">
                <Trash2 size={16} className="text-rose-300" /> Clear index
              </span>
              <div className="mt-1 text-xs text-slate-400">Remove all embeddings</div>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}


