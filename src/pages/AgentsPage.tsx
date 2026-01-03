import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { createAgent, deleteAgent, listAgents, type AgentProfile } from "../lib/api";
import { Button, Card, Input } from "../components/ui";
import { toast } from "sonner";

export function AgentsPage() {
  const nav = useNavigate();
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      setAgents(await listAgents());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load agents");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const canCreate = useMemo(() => name.trim().length > 0, [name]);

  async function onCreate() {
    if (!canCreate) return;
    setCreating(true);
    setError(null);
    try {
      const created = await createAgent({ name: name.trim(), prompt: "" });
      setAgents((prev) => [created, ...prev]);
      setName("");
      toast.success("Agent created");
      nav(`/app/agents/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create agent");
      toast.error("Failed to create agent");
    } finally {
      setCreating(false);
    }
  }

  async function onDelete(id: string) {
    setError(null);
    try {
      await deleteAgent(id);
      setAgents((prev) => prev.filter((a) => a.id !== id));
      toast.success("Agent deleted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete agent");
      toast.error("Failed to delete agent");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Agents</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Create an agent by name, then open it to customize the prompt and talk.
          </p>
        </div>
        <Button onClick={refresh} variant="secondary">
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">Create agent</div>
            <div className="text-sm text-slate-300">Give it a name. You’ll edit prompt inside the agent page.</div>
          </div>
          <div className="w-full max-w-md">
            <Input value={name} onChange={setName} placeholder="e.g. Sales helper" />
          </div>
          <Button onClick={onCreate} disabled={!canCreate || creating}>
            {creating ? "Creating…" : "Create"}
          </Button>
        </div>
      </Card>

      <div className="mt-10">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <div className="text-lg font-semibold">Your agents</div>
            <div className="text-sm text-slate-300">
              {loading ? "Loading…" : `${agents.length} saved`}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((a) => (
            <Card key={a.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold">{a.name}</div>
                  <div className="mt-1 text-xs text-slate-400">id: {a.id}</div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => onDelete(a.id)}
                    className="px-3"
                  >
                    Delete
                  </Button>
                </div>
              </div>

              <div className="mt-3 text-sm text-slate-300">
                Prompt:{" "}
                <span className="text-slate-100">
                  {(a.promptDraft && a.promptDraft.trim()) || (a.promptPublished && a.promptPublished.trim())
                    ? "set"
                    : "not set"}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <Button onClick={() => nav(`/app/agents/${a.id}`)}>Open</Button>
                <div className="text-xs text-slate-400">
                  Edit prompt & talk
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}


