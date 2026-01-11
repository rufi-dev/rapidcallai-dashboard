import { useEffect, useMemo, useRef, useState } from "react";
import { Card, Button, Input, Textarea } from "../components/ui";
import { FolderPlus, Folder, FileText, FileUp, Trash2, Search } from "lucide-react";
import {
  createKbFolder,
  createKbTextDoc,
  deleteKbDoc,
  deleteKbFolder,
  listKbDocs,
  listKbFolders,
  uploadKbPdf,
  type KbDoc,
  type KbFolder,
} from "../lib/api";
import { FullScreenLoader, GlowSpinner, SectionLoader } from "../components/loading";
import { toast } from "sonner";

export function KnowledgeBasePage() {
  const [loading, setLoading] = useState(true);
  const [folders, setFolders] = useState<KbFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [docs, setDocs] = useState<KbDoc[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newText, setNewText] = useState("");
  const [addingText, setAddingText] = useState(false);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  async function refreshFolders() {
    setLoading(true);
    try {
      const f = await listKbFolders();
      setFolders(f);
      if (!selectedFolderId && f.length) setSelectedFolderId(f[0].id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load folders");
    } finally {
      setLoading(false);
    }
  }

  async function refreshDocs(folderId: string) {
    setDocsLoading(true);
    try {
      const d = await listKbDocs(folderId);
      setDocs(d);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load documents");
      setDocs([]);
    } finally {
      setDocsLoading(false);
    }
  }

  useEffect(() => {
    void refreshFolders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedFolderId) {
      setDocs([]);
      return;
    }
    void refreshDocs(selectedFolderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFolderId]);

  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((d) => (d.title || "").toLowerCase().includes(q) || (d.sourceFilename || "").toLowerCase().includes(q));
  }, [docs, search]);

  const selectedFolder = folders.find((f) => f.id === selectedFolderId) || null;

  async function onCreateFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    setCreatingFolder(true);
    try {
      const f = await createKbFolder({ name });
      setFolders((prev) => [f, ...prev]);
      setSelectedFolderId(f.id);
      setNewFolderName("");
      toast.success("Folder created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create folder");
    } finally {
      setCreatingFolder(false);
    }
  }

  async function onDeleteFolder() {
    if (!selectedFolderId) return;
    const id = selectedFolderId;
    try {
      await deleteKbFolder(id);
      setFolders((prev) => prev.filter((f) => f.id !== id));
      setSelectedFolderId((prev) => {
        if (prev !== id) return prev;
        const remaining = folders.filter((f) => f.id !== id);
        return remaining[0]?.id ?? null;
      });
      toast.success("Folder deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete folder");
    }
  }

  async function onAddText() {
    if (!selectedFolderId) return;
    const contentText = newText.trim();
    if (!contentText) return;
    setAddingText(true);
    try {
      const d = await createKbTextDoc(selectedFolderId, { title: newTitle.trim() || "Note", contentText });
      setDocs((prev) => [d, ...prev]);
      setNewTitle("");
      setNewText("");
      toast.success("Saved note");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save note");
    } finally {
      setAddingText(false);
    }
  }

  async function onUploadPdf(file: File) {
    if (!selectedFolderId) return;
    setUploadingPdf(true);
    try {
      const d = await uploadKbPdf(selectedFolderId, { title: file.name, file });
      setDocs((prev) => [d, ...prev]);
      toast.success("PDF added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to upload PDF");
    } finally {
      setUploadingPdf(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onDeleteDoc(id: string) {
    try {
      await deleteKbDoc(id);
      setDocs((prev) => prev.filter((d) => d.id !== id));
      toast.success("Removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete doc");
    }
  }

  return (
    <FullScreenLoader show={loading} title="Loading knowledge" subtitle="Fetching folders + documents…">
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold tracking-tight">Knowledge Base</div>
            <div className="mt-1 text-sm text-slate-300">Create folders, add PDFs or notes, then connect folders to agents.</div>
          </div>
          <Button variant="secondary" onClick={() => void refreshFolders()} disabled={loading}>
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[320px_1fr] items-start">
          {/* Folders */}
          <Card className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-white">Folders</div>
              <button
                onClick={onCreateFolder}
                disabled={creatingFolder || !newFolderName.trim()}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 disabled:opacity-50"
                title="Create folder"
              >
                <FolderPlus size={14} />
                {creatingFolder ? <GlowSpinner label="Creating…" /> : "Create"}
              </button>
            </div>

            <div className="mt-3">
              <Input value={newFolderName} onChange={setNewFolderName} placeholder="New folder name" />
            </div>

            <div className="mt-4 space-y-2">
              {folders.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
                  No folders yet. Create one to start.
                </div>
              ) : (
                folders.map((f) => {
                  const active = f.id === selectedFolderId;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFolderId(f.id)}
                      className={[
                        "w-full rounded-2xl border px-3 py-3 text-left transition",
                        active ? "border-brand-500/40 bg-brand-500/10" : "border-white/10 bg-slate-950/35 hover:bg-white/5",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-2">
                        <Folder size={16} className={active ? "text-brand-200" : "text-slate-300"} />
                        <div className="truncate text-sm font-semibold text-white">{f.name}</div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Button variant="danger" onClick={onDeleteFolder} disabled={!selectedFolderId}>
                <Trash2 size={16} /> Delete folder
              </Button>
            </div>
          </Card>

          {/* Docs */}
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">{selectedFolder ? selectedFolder.name : "Select a folder"}</div>
                  <div className="mt-1 text-xs text-slate-400">Add PDFs and notes. Connect folders to agents from Agent → Model.</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-[260px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search titles"
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/40 pl-9 pr-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                    />
                  </div>
                  <label className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 cursor-pointer">
                    <FileUp size={14} />
                    {uploadingPdf ? <GlowSpinner label="Uploading…" /> : "Add PDF"}
                    <input
                      ref={fileRef}
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      disabled={!selectedFolderId || uploadingPdf}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void onUploadPdf(f);
                      }}
                    />
                  </label>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-sm font-semibold text-white">Add note</div>
              <div className="mt-3 grid gap-3">
                <Input value={newTitle} onChange={setNewTitle} placeholder="Title (optional)" />
                <Textarea value={newText} onChange={setNewText} rows={6} placeholder="Paste text here…" />
                <div className="flex justify-end">
                  <Button onClick={() => void onAddText()} disabled={!selectedFolderId || addingText || !newText.trim()}>
                    {addingText ? <GlowSpinner label="Saving…" /> : "Save note"}
                  </Button>
                </div>
              </div>
            </Card>

            {docsLoading ? (
              <SectionLoader title="Loading documents" subtitle="Indexing folder contents…" />
            ) : filteredDocs.length === 0 ? (
              <Card className="p-6">
                <div className="text-sm text-slate-300">No documents yet in this folder.</div>
              </Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {filteredDocs.map((d) => (
                  <Card key={d.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-brand-300" />
                          <div className="truncate text-sm font-semibold text-white">{d.title || d.sourceFilename || "Document"}</div>
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          {d.kind.toUpperCase()} • {(d.sizeBytes ? `${Math.round(d.sizeBytes / 1024)} KB` : "—")} •{" "}
                          {new Date(d.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={() => void onDeleteDoc(d.id)}
                        className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-slate-200 hover:bg-white/10"
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="mt-3 text-xs text-slate-300 line-clamp-4 whitespace-pre-wrap">
                      {String(d.contentText || "").slice(0, 400)}
                      {String(d.contentText || "").length > 400 ? "…" : ""}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </FullScreenLoader>
  );
}


