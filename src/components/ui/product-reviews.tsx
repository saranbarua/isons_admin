import React, { useEffect, useRef, useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Skeleton } from "./skeleton";
import { ConfirmModal } from "./confirm-modal";
import { useToast } from "./toast";
import { useAuthStore } from "../../store/auth";
import {
  listProductReviews,
  createProductReview,
  updateProductReview,
  patchProductReviewStatus,
  deleteProductReview,
  type ProductReview,
  type CreateReviewInput,
  type UpdateReviewInput,
  type RatingStatus,
} from "../../lib/api";

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1 text-yellow-500" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`h-4 w-4 ${i < value ? "fill-current" : "opacity-30"}`}
          viewBox="0 0 24 24"
        >
          <path d="M12 .587l3.668 7.431L24 9.748l-6 5.848L19.336 24 12 19.897 4.664 24 6 15.596 0 9.748l8.332-1.73z" />
        </svg>
      ))}
    </div>
  );
}

export default function ProductReviews({
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

  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<"ALL" | RatingStatus | "ALL">("ALL");

  const [openCreate, setOpenCreate] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>("");
  const [clientName, setClientName] = useState<string>("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [editing, setEditing] = useState<ProductReview | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, filter]);

  async function fetchReviews() {
    setLoading(true);
    setError(null);
    try {
      const status = filter === "ALL" ? undefined : (filter as RatingStatus);
      const data = await listProductReviews(productId, status);
      data.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      setReviews(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch reviews");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // focus trap and escape
    const node = modalRef.current;
    if (!node) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape")
        window.dispatchEvent(new CustomEvent("close-reviews"));
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function validateRating(n: number) {
    return Number.isInteger(n) && n >= 1 && n <= 5;
  }

  function openAdd() {
    setRating(5);
    setComment("");
    setClientName("");
    setFieldError(null);
    setOpenCreate(true);
  }

  async function handleCreate(e?: React.FormEvent) {
    e?.preventDefault();
    setFieldError(null);
    if (!validateRating(rating)) {
      setFieldError("Rating must be an integer between 1 and 5");
      return;
    }
    setActionLoading(true);
    const temp: ProductReview = {
      id: `tmp-${Math.random().toString(36).slice(2, 9)}`,
      rating,
      comment: comment || null,
      clientName: clientName || null,
      status: "PENDING",
      productId,
      createdAt: new Date().toISOString(),
    };
    setReviews((r) => [temp, ...r]);
    setOpenCreate(false);
    try {
      const created = await createProductReview(productId, {
        rating,
        comment: comment || undefined,
        clientName: clientName || undefined,
      } as CreateReviewInput);
      setReviews((r) => [created, ...r.filter((x) => x.id !== temp.id)]);
      addToast("Review created", "success");
    } catch (err) {
      setReviews((r) => r.filter((x) => x.id !== temp.id));
      addToast(
        err instanceof Error ? err.message : "Failed to create",
        "error",
      );
    } finally {
      setActionLoading(false);
    }
  }

  function startEdit(rv: ProductReview) {
    setEditing(rv);
    setRating(rv.rating);
    setComment(rv.comment || "");
    setClientName(rv.clientName || "");
  }

  async function handleSaveEdit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!editing) return;
    if (!validateRating(rating)) {
      setFieldError("Rating must be an integer between 1 and 5");
      return;
    }
    setActionLoading(true);
    const prev = reviews;
    const optimistic = { ...editing, rating, comment: comment || null };
    (optimistic as any).clientName = clientName || null;
    setReviews((r) => r.map((t) => (t.id === editing.id ? optimistic : t)));
    setEditing(null);
    try {
      const updated = await updateProductReview(productId, editing.id, {
        rating,
        comment: comment || undefined,
        clientName: clientName || undefined,
      } as UpdateReviewInput);
      setReviews((r) => r.map((t) => (t.id === updated.id ? updated : t)));
      addToast("Review updated", "success");
    } catch (err) {
      setReviews(prev);
      addToast(
        err instanceof Error ? err.message : "Failed to update",
        "error",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function moderate(id: string, status: RatingStatus) {
    setActionLoading(true);
    const prev = reviews;
    setReviews((r) => r.map((t) => (t.id === id ? { ...t, status } : t)));
    try {
      const updated = await patchProductReviewStatus(productId, id, {
        status,
      } as any);
      setReviews((r) => r.map((t) => (t.id === updated.id ? updated : t)));
      addToast(`Review ${status.toLowerCase()}`, "success");
    } catch (err) {
      setReviews(prev);
      addToast(
        err instanceof Error ? err.message : "Failed to update status",
        "error",
      );
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
    const prev = reviews;
    setReviews((r) => r.filter((t) => t.id !== deletingId));
    try {
      await deleteProductReview(productId, deletingId);
      addToast("Review deleted", "success");
    } catch (err) {
      setReviews(prev);
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
        onClick={() => window.dispatchEvent(new CustomEvent("close-reviews"))}
      />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Product reviews"
        className="absolute left-1/2 top-1/2 w-[95%] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card p-4 shadow-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Product Reviews</h3>
          <div className="flex gap-2">
            {editable && (
              <Button
                variant="outline"
                onClick={openAdd}
                aria-label="Add review"
              >
                Add review
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Label>Filter</Label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="rounded-md border border-input bg-background px-2 py-1 text-sm"
              >
                <option value="ALL">All</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <Button
              variant="ghost"
              onClick={() =>
                window.dispatchEvent(new CustomEvent("close-reviews"))
              }
              aria-label="Close reviews dialog"
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
        ) : reviews.length === 0 ? (
          <div className="text-sm text-muted-foreground">No reviews</div>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="border rounded p-3">
                <div className="flex items-start gap-3">
                  <div className="w-28">
                    <Stars value={r.rating} />
                    <div className="text-xs text-muted-foreground mt-2">
                      {new Intl.DateTimeFormat(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(r.createdAt))}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm">
                      {r.clientName ? (
                        <div className="font-medium">{r.clientName}</div>
                      ) : null}
                      <div className="mt-1">{r.comment}</div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="text-xs text-muted-foreground">
                      {r.status}
                    </div>
                    {editable && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(r)}
                          aria-label={`Edit review ${r.id}`}
                        >
                          Edit
                        </Button>
                        {r.status === "PENDING" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => moderate(r.id, "APPROVED")}
                              aria-label={`Approve review ${r.id}`}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => moderate(r.id, "REJECTED")}
                              aria-label={`Reject review ${r.id}`}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => confirmDelete(r.id)}
                          aria-label={`Delete review ${r.id}`}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create / Edit */}
        {(openCreate || editing) && (
          <div className="mt-4 rounded border bg-muted/10 p-3">
            <h4 className="text-md font-semibold mb-2">
              {editing ? "Edit Review" : "Add Review"}
            </h4>
            <form
              onSubmit={editing ? handleSaveEdit : handleCreate}
              className="grid grid-cols-1 gap-2"
            >
              <div>
                <Label>Rating</Label>
                <div
                  role="radiogroup"
                  aria-label="Rating"
                  className="flex gap-2"
                >
                  {Array.from({ length: 5 }).map((_, i) => {
                    const v = i + 1;
                    return (
                      <label key={v} className="inline-flex items-center gap-1">
                        <input
                          type="radio"
                          name="rating"
                          value={v}
                          checked={rating === v}
                          onChange={() => setRating(v)}
                        />
                        <span
                          className={`text-yellow-500 ${rating >= v ? "" : "opacity-30"}`}
                        >
                          ★
                        </span>
                      </label>
                    );
                  })}
                </div>
                {fieldError && (
                  <div className="text-xs text-destructive mt-1">
                    {fieldError}
                  </div>
                )}
              </div>
              <div>
                <Label>Client name</Label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  aria-label="Client name"
                />
              </div>
              <div>
                <Label>Comment</Label>
                <textarea
                  className="flex h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  aria-label="Review comment"
                />
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
          title="Delete Review"
          message="Are you sure you want to delete this review?"
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
