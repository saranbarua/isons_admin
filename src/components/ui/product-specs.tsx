import React, { useEffect, useRef, useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { ConfirmModal } from "./confirm-modal";
import { useToast } from "./toast";
import { useAuthStore } from "../../store/auth";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import {
  listProductSpecs,
  createProductSpec,
  updateProductSpec,
  deleteProductSpec,
  type ProductSpec,
  type CreateSpecInput,
  type UpdateSpecInput,
} from "../../lib/api";

export default function ProductSpecs({
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

  const [specs, setSpecs] = useState<ProductSpec[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openCreate, setOpenCreate] = useState(false);
  const [createKey, setCreateKey] = useState("");
  const [createValue, setCreateValue] = useState("");
  const createKeyRef = useRef<HTMLInputElement | null>(null);

  const [editing, setEditing] = useState<ProductSpec | null>(null);
  const [editKey, setEditKey] = useState("");
  const [editValue, setEditValue] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const modalRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    fetchSpecs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  useEffect(() => {
    // focus trap setup
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const node = modalRef.current;
    if (!node) return;
    const root = node as HTMLElement;
    const focusable = getFocusable(root);
    if (focusable.length) focusable[0].focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        window.dispatchEvent(new CustomEvent("close-specs"));
        return;
      }
      if (e.key === "Tab") {
        handleTabKey(e, root);
      }
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

  async function fetchSpecs() {
    setLoading(true);
    setError(null);
    try {
      const data = await listProductSpecs(productId);
      setSpecs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch specs");
    } finally {
      setLoading(false);
    }
  }

  function openCreatePanel() {
    setCreateKey("");
    setCreateValue("");
    setOpenCreate(true);
    setTimeout(() => createKeyRef.current?.focus(), 0);
  }

  async function handleCreate(e?: React.FormEvent) {
    e?.preventDefault();
    if (!createKey.trim()) {
      setError("Key is required");
      return;
    }
    setActionLoading(true);
    setError(null);
    const temp: ProductSpec = {
      id: `tmp-${Math.random().toString(36).slice(2, 9)}`,
      key: createKey,
      value: createValue,
      productId,
      createdAt: new Date().toISOString(),
    };
    setSpecs((s) => [temp, ...s]);
    setOpenCreate(false);
    try {
      const created = await createProductSpec(productId, {
        key: createKey,
        value: createValue,
      } as CreateSpecInput);
      setSpecs((s) => [created, ...s.filter((x) => x.id !== temp.id)]);
      addToast("Spec created", "success");
    } catch (err) {
      setSpecs((s) => s.filter((x) => x.id !== temp.id));
      addToast(
        err instanceof Error ? err.message : "Failed to create",
        "error",
      );
    } finally {
      setActionLoading(false);
    }
  }

  function startEdit(spec: ProductSpec) {
    setEditing(spec);
    setEditKey(spec.key);
    setEditValue(spec.value);
    setTimeout(() => {
      const el = document.getElementById("edit-spec-key");
      if (el) (el as HTMLInputElement).focus();
    }, 0);
  }

  async function handleSaveEdit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!editing) return;
    if (!editKey.trim()) {
      setError("Key is required");
      return;
    }
    setActionLoading(true);
    const prev = specs;
    const optimistic: ProductSpec = {
      ...editing,
      key: editKey,
      value: editValue,
    };
    setSpecs((s) => s.map((p) => (p.id === editing.id ? optimistic : p)));
    setEditing(null);
    try {
      const updated = await updateProductSpec(productId, editing.id, {
        key: editKey,
        value: editValue,
      } as UpdateSpecInput);
      setSpecs((s) => s.map((p) => (p.id === updated.id ? updated : p)));
      addToast("Spec updated", "success");
    } catch (err) {
      setSpecs(prev);
      addToast(
        err instanceof Error ? err.message : "Failed to update",
        "error",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function confirmDelete(id: string) {
    setDeletingId(id);
  }

  async function handleDelete() {
    if (!deletingId) return;
    setActionLoading(true);
    const prev = specs;
    setSpecs((s) => s.filter((p) => p.id !== deletingId));
    try {
      await deleteProductSpec(productId, deletingId);
      addToast("Spec deleted", "success");
    } catch (err) {
      setSpecs(prev);
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
        onClick={() => window.dispatchEvent(new CustomEvent("close-specs"))}
      />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Product specifications"
        className="absolute left-1/2 top-1/2 w-[95%] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card p-4 shadow-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Product Specs</h3>
          <div className="flex gap-2">
            {editable && (
              <Button
                variant="outline"
                onClick={openCreatePanel}
                aria-label="Add spec"
              >
                Add spec
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() =>
                window.dispatchEvent(new CustomEvent("close-specs"))
              }
              aria-label="Close specs dialog"
            >
              Close
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : specs.length === 0 ? (
            <div className="text-sm text-muted-foreground">No specs</div>
          ) : (
            <ul className="space-y-2">
              {specs.map((s) => (
                <li
                  key={s.id}
                  className="flex items-start gap-3 p-3 rounded border"
                >
                  <div className="flex-1">
                    <div className="font-medium">{s.key}</div>
                    <div className="text-sm text-muted-foreground">
                      {s.value}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(s.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {editable && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(s)}
                          aria-label={`Edit spec ${s.key}`}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => confirmDelete(s.id)}
                          aria-label={`Delete spec ${s.key}`}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Inline create panel */}
        {openCreate && (
          <div className="mt-4 rounded border bg-muted/10 p-3">
            <h4 className="text-md font-semibold mb-2">Add Spec</h4>
            <form onSubmit={handleCreate} className="grid grid-cols-1 gap-2">
              <div>
                <Label>Key</Label>
                <Input
                  ref={createKeyRef}
                  value={createKey}
                  onChange={(e) => setCreateKey(e.target.value)}
                  required
                  aria-label="Spec key"
                />
              </div>
              <div>
                <Label>Value (Markdown)</Label>
                <div data-color-mode="light" className="rounded-md border">
                  <MDEditor
                    value={createValue}
                    onChange={(v) => setCreateValue(v || "")}
                    preview="live"
                    height={160}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenCreate(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading}>
                  {actionLoading ? "Saving..." : "Create"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Inline edit panel */}
        {editing && (
          <div className="mt-4 rounded border bg-muted/10 p-3">
            <h4 className="text-md font-semibold mb-2">Edit Spec</h4>
            <form onSubmit={handleSaveEdit} className="grid grid-cols-1 gap-2">
              <div>
                <Label>Key</Label>
                <Input
                  id="edit-spec-key"
                  value={editKey}
                  onChange={(e) => setEditKey(e.target.value)}
                  required
                  aria-label="Edit spec key"
                />
              </div>
              <div>
                <Label>Value (Markdown)</Label>
                <div data-color-mode="light" className="rounded-md border">
                  <MDEditor
                    value={editValue}
                    onChange={(v) => setEditValue(v || "")}
                    preview="live"
                    height={160}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(null)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading}>
                  {actionLoading ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          </div>
        )}

        <ConfirmModal
          open={!!deletingId}
          title="Delete Spec"
          message="Are you sure you want to delete this spec? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
          loading={actionLoading}
          onConfirm={handleDelete}
          onCancel={() => setDeletingId(null)}
        />
      </div>
    </div>
  );
}
