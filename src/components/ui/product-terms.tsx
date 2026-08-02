import React, { useEffect, useRef, useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Skeleton } from "./skeleton";
import { ConfirmModal } from "./confirm-modal";
import { useToast } from "./toast";
import { useAuthStore } from "../../store/auth";
import {
  listProductTerms,
  createProductTerm,
  updateProductTerm,
  deleteProductTerm,
  type ProductTerm,
  type CreateTermInput,
  type UpdateTermInput,
} from "../../lib/api";

export default function ProductTerms({
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

  const [terms, setTerms] = useState<ProductTerm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openCreate, setOpenCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    title?: string;
    content?: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [editing, setEditing] = useState<ProductTerm | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement | null>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    fetchTerms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function fetchTerms() {
    setLoading(true);
    setError(null);
    try {
      const data = await listProductTerms(productId);
      // order by createdAt desc
      data.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      setTerms(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch terms");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // focus trap + escape
    prevFocus.current = document.activeElement as HTMLElement | null;
    const node = modalRef.current;
    if (!node) return;
    const root = node as HTMLElement;
    const focusable = getFocusable(root);
    if (focusable.length) focusable[0].focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        window.dispatchEvent(new CustomEvent("close-terms"));
        return;
      }
      if (e.key === "Tab") handleTabKey(e, root);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prevFocus.current?.focus();
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
    const focusable = getFocusable(root) as HTMLElement[];
    if (focusable.length === 0) return;
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

  function openAdd() {
    setTitle("");
    setContent("");
    setFieldErrors(null);
    setOpenCreate(true);
  }

  async function handleCreate(e?: React.FormEvent) {
    e?.preventDefault();
    setFieldErrors(null);
    if (!title.trim() || !content.trim()) {
      setFieldErrors({
        title: !title.trim() ? "Title is required" : undefined,
        content: !content.trim() ? "Content is required" : undefined,
      });
      return;
    }
    setActionLoading(true);
    const temp: ProductTerm = {
      id: `tmp-${Math.random().toString(36).slice(2, 9)}`,
      title,
      content,
      productId,
      createdAt: new Date().toISOString(),
    };
    setTerms((s) => [temp, ...s]);
    setOpenCreate(false);
    try {
      const created = await createProductTerm(productId, {
        title,
        content,
      } as CreateTermInput);
      setTerms((s) => [created, ...s.filter((t) => t.id !== temp.id)]);
      addToast("Term created", "success");
    } catch (err) {
      setTerms((s) => s.filter((t) => t.id !== temp.id));
      const msg = err instanceof Error ? err.message : "Failed to create";
      // set inline if obvious
      if (msg.toLowerCase().includes("title")) setFieldErrors({ title: msg });
      else if (msg.toLowerCase().includes("content"))
        setFieldErrors({ content: msg });
      addToast(msg, "error");
    } finally {
      setActionLoading(false);
    }
  }

  function startEdit(term: ProductTerm) {
    setEditing(term);
    setTitle(term.title);
    setContent(term.content);
    setFieldErrors(null);
  }

  async function handleSaveEdit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!editing) return;
    setFieldErrors(null);
    if (!title.trim() || !content.trim()) {
      setFieldErrors({
        title: !title.trim() ? "Title is required" : undefined,
        content: !content.trim() ? "Content is required" : undefined,
      });
      return;
    }
    setActionLoading(true);
    const prev = terms;
    const optimistic: ProductTerm = { ...editing, title, content };
    setTerms((s) => s.map((t) => (t.id === editing.id ? optimistic : t)));
    setEditing(null);
    try {
      const updated = await updateProductTerm(productId, editing.id, {
        title,
        content,
      } as UpdateTermInput);
      setTerms((s) => s.map((t) => (t.id === updated.id ? updated : t)));
      addToast("Term updated", "success");
    } catch (err) {
      setTerms(prev);
      const msg = err instanceof Error ? err.message : "Failed to update";
      if (msg.toLowerCase().includes("title")) setFieldErrors({ title: msg });
      else if (msg.toLowerCase().includes("content"))
        setFieldErrors({ content: msg });
      addToast(msg, "error");
    } finally {
      setActionLoading(false);
    }
  }

  function confirmDelete(id: string) {
    setDeletingId(id);
  }

  async function handleDelete() {
    if (!deletingId) return;
    setActionLoading(true);
    const prev = terms;
    setTerms((s) => s.filter((t) => t.id !== deletingId));
    try {
      await deleteProductTerm(productId, deletingId);
      addToast("Term deleted", "success");
    } catch (err) {
      setTerms(prev);
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
        onClick={() => window.dispatchEvent(new CustomEvent("close-terms"))}
      />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Product terms"
        className="absolute left-1/2 top-1/2 w-[95%] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card p-4 shadow-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Product Terms</h3>
          <div className="flex gap-2">
            {editable && (
              <Button variant="outline" onClick={openAdd} aria-label="Add term">
                Add term
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() =>
                window.dispatchEvent(new CustomEvent("close-terms"))
              }
              aria-label="Close terms dialog"
            >
              Close
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : error ? (
          <div className="text-sm text-destructive">{error}</div>
        ) : terms.length === 0 ? (
          <div className="text-sm text-muted-foreground">No terms found.</div>
        ) : (
          <div className="space-y-3">
            {terms.map((t) => (
              <div key={t.id} className="border rounded p-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="font-medium">{t.title}</div>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">
                      {t.content}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      {new Date(t.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {editable && (
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(t)}
                        aria-label={`Edit term ${t.title}`}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => confirmDelete(t.id)}
                        aria-label={`Delete term ${t.title}`}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create / Edit modal content */}
        {(openCreate || editing) && (
          <div className="mt-4 rounded border bg-muted/10 p-3">
            <h4 className="text-md font-semibold mb-2">
              {editing ? "Edit Term" : "Add Term"}
            </h4>
            <form
              onSubmit={editing ? handleSaveEdit : handleCreate}
              className="grid grid-cols-1 gap-2"
            >
              <div>
                <Label>Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  aria-label="Term title"
                />
                {fieldErrors?.title && (
                  <div className="text-xs text-destructive mt-1">
                    {fieldErrors.title}
                  </div>
                )}
              </div>
              <div>
                <Label>Content</Label>
                <textarea
                  className="flex h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  aria-label="Term content"
                />
                {fieldErrors?.content && (
                  <div className="text-xs text-destructive mt-1">
                    {fieldErrors.content}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpenCreate(false);
                    setEditing(null);
                  }}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading}>
                  {actionLoading ? "Saving..." : editing ? "Save" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        )}

        <ConfirmModal
          open={!!deletingId}
          title="Delete Term"
          message="Are you sure you want to delete this term? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
          loading={actionLoading}
          role="alertdialog"
          onConfirm={handleDelete}
          onCancel={() => setDeletingId(null)}
        />
      </div>
    </div>
  );
}
