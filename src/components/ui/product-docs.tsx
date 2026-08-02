import React, { useEffect, useRef, useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Skeleton } from "./skeleton";
import { ConfirmModal } from "./confirm-modal";
import { useToast } from "./toast";
import { useAuthStore } from "../../store/auth";
import { API_BASE_URL } from "../../config/api";
import {
  listProductDocs,
  uploadProductDoc,
  updateProductDoc,
  deleteProductDoc,
  type ProductDoc,
  type UpdateDocInput,
} from "../../lib/api";

function DocIcon({ fileUrl }: { fileUrl: string }) {
  const ext = fileUrl.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf")
    return (
      <svg
        className="h-5 w-5 text-red-500 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="15" y2="17" />
        <polyline points="9 9 10 9 10 11" />
      </svg>
    );
  if (["doc", "docx"].includes(ext))
    return (
      <svg
        className="h-5 w-5 text-blue-500 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="15" y2="17" />
      </svg>
    );
  if (["jpg", "jpeg", "png", "webp"].includes(ext))
    return (
      <svg
        className="h-5 w-5 text-green-500 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    );
  return (
    <svg
      className="h-5 w-5 text-muted-foreground shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

export default function ProductDocs({
  productId,
  role: roleProp,
}: {
  productId: string;
  role?: string;
}) {
  const { addToast } = useToast();
  const authRole = useAuthStore.getState().role;
  const role = roleProp ?? authRole;
  const editable = role === "ADMIN" || role === "MODERATOR";

  const [docs, setDocs] = useState<ProductDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openCreate, setOpenCreate] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createFile, setCreateFile] = useState<File | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [editing, setEditing] = useState<ProductDoc | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const node = modalRef.current;
    if (!node) return;
    const focusable = getFocusable(node);
    if (focusable.length) focusable[0].focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        window.dispatchEvent(new CustomEvent("close-docs"));
        return;
      }
      if (e.key === "Tab") handleTabKey(e, node!);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused.current?.focus();
    };
  }, []);

  function getFocusable(root: HTMLElement): HTMLElement[] {
    return Array.from(
      root.querySelectorAll(
        "a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex='-1'])",
      ),
    ).filter(
      (el) => (el as HTMLElement).offsetParent !== null,
    ) as HTMLElement[];
  }

  function handleTabKey(e: KeyboardEvent, root: HTMLElement) {
    const focusable = getFocusable(root);
    if (!focusable.length) return;
    const idx = focusable.indexOf(document.activeElement as HTMLElement);
    if (e.shiftKey) {
      if (idx === 0) {
        focusable[focusable.length - 1].focus();
        e.preventDefault();
      }
    } else {
      if (idx === focusable.length - 1) {
        focusable[0].focus();
        e.preventDefault();
      }
    }
  }

  async function fetchDocs() {
    setLoading(true);
    setError(null);
    try {
      const data = await listProductDocs(productId);
      setDocs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch docs");
    } finally {
      setLoading(false);
    }
  }

  function openCreatePanel() {
    setCreateTitle("");
    setCreateFile(null);
    setFieldError(null);
    setOpenCreate(true);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  }

  async function handleCreate(e?: React.FormEvent) {
    e?.preventDefault();
    if (!createTitle.trim()) {
      setFieldError("Title is required");
      return;
    }
    if (!createFile) {
      setFieldError("File is required");
      return;
    }
    setFieldError(null);
    setActionLoading(true);
    setOpenCreate(false);
    try {
      const created = await uploadProductDoc(
        productId,
        createTitle.trim(),
        createFile,
      );
      setDocs((d) => [created, ...d]);
      addToast("Doc uploaded", "success");
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Failed to upload",
        "error",
      );
    } finally {
      setActionLoading(false);
    }
  }

  function startEdit(doc: ProductDoc) {
    setEditing(doc);
    setEditTitle(doc.title);
    setFieldError(null);
    setTimeout(() => {
      const el = document.getElementById("edit-doc-title");
      if (el) (el as HTMLInputElement).focus();
    }, 0);
  }

  async function handleSaveEdit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!editing) return;
    if (!editTitle.trim()) {
      setFieldError("Title is required");
      return;
    }
    setFieldError(null);
    setActionLoading(true);
    const prev = docs;
    const optimistic: ProductDoc = { ...editing, title: editTitle.trim() };
    setDocs((d) => d.map((x) => (x.id === editing.id ? optimistic : x)));
    setEditing(null);
    try {
      const updated = await updateProductDoc(productId, editing.id, {
        title: editTitle.trim(),
      } as UpdateDocInput);
      setDocs((d) => d.map((x) => (x.id === updated.id ? updated : x)));
      addToast("Doc updated", "success");
    } catch (err) {
      setDocs(prev);
      addToast(
        err instanceof Error ? err.message : "Failed to update",
        "error",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!deletingId) return;
    setActionLoading(true);
    const prev = docs;
    setDocs((d) => d.filter((x) => x.id !== deletingId));
    try {
      await deleteProductDoc(productId, deletingId);
      addToast("Doc deleted", "success");
    } catch (err) {
      setDocs(prev);
      addToast(
        err instanceof Error ? err.message : "Failed to delete",
        "error",
      );
    } finally {
      setDeletingId(null);
      setActionLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => window.dispatchEvent(new CustomEvent("close-docs"))}
      />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Product documents"
        className="absolute left-1/2 top-1/2 w-[95%] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card p-4 shadow-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Product Docs</h3>
          <div className="flex gap-2">
            {editable && (
              <Button
                variant="outline"
                onClick={openCreatePanel}
                disabled={actionLoading}
              >
                Upload Doc
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() =>
                window.dispatchEvent(new CustomEvent("close-docs"))
              }
              aria-label="Close docs dialog"
            >
              Close
            </Button>
          </div>
        </div>

        {/* Upload form */}
        {openCreate && (
          <form
            onSubmit={handleCreate}
            className="mb-4 p-3 rounded-lg border bg-muted/30 space-y-3"
          >
            <div className="space-y-1">
              <Label htmlFor="create-doc-title">Title</Label>
              <Input
                id="create-doc-title"
                ref={titleInputRef}
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="e.g. Installation Guide"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="create-doc-file">
                File{" "}
                <span className="text-muted-foreground text-xs">
                  (PDF, JPG, PNG, DOC, DOCX — max 20 MB)
                </span>
              </Label>
              <input
                id="create-doc-file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => setCreateFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-accent cursor-pointer"
              />
            </div>
            {fieldError && (
              <div className="text-sm text-destructive">{fieldError}</div>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpenCreate(false);
                  setFieldError(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={actionLoading}>
                Upload
              </Button>
            </div>
          </form>
        )}

        {/* List */}
        <div className="space-y-2">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : docs.length === 0 ? (
            <div className="text-sm text-muted-foreground">No documents</div>
          ) : (
            <ul className="space-y-2">
              {docs.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-start gap-3 p-3 rounded border"
                >
                  <DocIcon fileUrl={doc.fileUrl} />
                  <div className="flex-1 min-w-0">
                    {editing?.id === doc.id ? (
                      <form onSubmit={handleSaveEdit} className="space-y-2">
                        <Input
                          id="edit-doc-title"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Title"
                        />
                        {fieldError && (
                          <div className="text-xs text-destructive">
                            {fieldError}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            type="submit"
                            size="sm"
                            disabled={actionLoading}
                          >
                            Save
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditing(null);
                              setFieldError(null);
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="font-medium truncate">{doc.title}</div>
                        <a
                          href={`${API_BASE_URL}${doc.fileUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline truncate block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {doc.fileUrl.split("/").pop()}
                        </a>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {new Date(doc.createdAt).toLocaleString()}
                        </div>
                      </>
                    )}
                  </div>
                  {editable && editing?.id !== doc.id && (
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(doc)}
                        aria-label={`Edit doc ${doc.title}`}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeletingId(doc.id)}
                        disabled={actionLoading}
                        aria-label={`Delete doc ${doc.title}`}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!deletingId}
        title="Delete Document"
        message="Are you sure you want to delete this document? The file will also be removed from the server."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
