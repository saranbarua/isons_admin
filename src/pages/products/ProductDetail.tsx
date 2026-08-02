import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import { ImageUploader } from "../../components/ui/image-uploader";
import { ConfirmModal } from "../../components/ui/confirm-modal";
import { useToast } from "../../components/ui/toast";
import {
  getProductById,
  uploadProductImages,
  deleteProductImage,
  type ProductDetail,
} from "../../lib/api";
import { API_BASE_URL } from "../../config/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { ArrowLeft, RefreshCw, Package } from "lucide-react";

export default function ProductDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { addToast } = useToast();
  const [item, setItem] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);

  async function fetchOne() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getProductById(id);
      setItem(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch product");
    } finally {
      setLoading(false);
    }
  }

  const handleImageUpload = useCallback(
    async (files: File[]) => {
      if (!id) return;
      const updatedProduct = await uploadProductImages(id, files);
      setItem(updatedProduct);
      setShowUploader(false);
    },
    [id],
  );

  const handleDeleteImage = useCallback(async () => {
    if (!id || !imageToDelete) return;
    setDeletingImageId(imageToDelete);
    try {
      const updated = await deleteProductImage(id, imageToDelete);
      setItem(updated);
      setImageToDelete(null);
      addToast("Image deleted successfully", "success");
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Failed to delete image",
        "error",
      );
    } finally {
      setDeletingImageId(null);
    }
  }, [id, imageToDelete, addToast]);

  useEffect(() => {
    fetchOne();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div className="flex flex-col gap-5 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Products
          </Button>
          {item && (
            <>
              <span className="text-muted-foreground">/</span>
              <span className="font-medium truncate max-w-[200px]">
                {item.name}
              </span>
            </>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchOne}
          disabled={loading}
          className="gap-1.5 h-9 rounded-md shadow-sm"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex gap-5">
            <Skeleton className="h-32 w-32 rounded-lg shrink-0" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-4 w-36" />
              <div className="flex gap-4 pt-2">
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-10 w-28" />
              </div>
            </div>
          </div>
          <Skeleton className="h-px w-full" />
          <div className="flex gap-6">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      ) : error ? (
        <div className="rounded-xl border bg-card p-6 text-sm text-destructive">
          {error}
        </div>
      ) : item ? (
        <>
          <div className="rounded-2xl border bg-card overflow-hidden shadow-sm transition-all">
            <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8">
              {/* Primary image */}
              <div className="shrink-0 group">
                {item.images?.[0]?.url ? (
                  <img
                    src={`${API_BASE_URL}${item.images[0].url}`}
                    alt={item.name}
                    className="h-40 w-40 md:h-48 md:w-48 rounded-xl object-cover border shadow-sm group-hover:shadow-md transition-shadow"
                  />
                ) : (
                  <div className="h-40 w-40 md:h-48 md:w-48 rounded-xl border bg-muted flex items-center justify-center">
                    <Package className="h-12 w-12 text-muted-foreground/30" />
                  </div>
                )}
              </div>

              {/* Name + stats */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                      {item.name}
                    </h1>
                    <p className="text-sm text-muted-foreground font-medium mt-1 bg-muted/50 inline-block px-2 py-0.5 rounded">
                      {item.slug}
                    </p>
                  </div>
                  <Badge
                    className={
                      item.status === "ACTIVE"
                        ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-transparent text-sm px-3 py-0.5"
                        : "bg-destructive/10 text-destructive hover:bg-destructive/20 border-transparent text-sm px-3 py-0.5"
                    }
                  >
                    {item.status}
                  </Badge>
                </div>

                <div className="mt-8 flex flex-wrap gap-x-8 gap-y-4">
                  <div className="flex flex-col">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Price
                    </p>
                    <p className="text-xl font-bold text-primary">
                      ৳{item.price.toFixed(2)}
                    </p>
                  </div>
                  <div className="w-px bg-border/60 self-stretch" />
                  <div className="flex flex-col">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Stock
                    </p>
                    <p className="text-xl font-bold text-foreground">{item.stock}</p>
                  </div>
                  <div className="w-px bg-border/60 self-stretch" />
                  <div className="flex flex-col">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Category
                    </p>
                    <p className="text-xl font-bold text-foreground">
                      {item.category?.name}
                    </p>
                  </div>
                  {item.modelNumber && (
                    <>
                      <div className="w-px bg-border/60 self-stretch" />
                      <div className="flex flex-col">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                          Model
                        </p>
                        <p className="text-xl font-bold text-foreground">
                          {item.modelNumber}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Meta footer */}
            <div className="border-t px-6 md:px-8 py-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground bg-muted/10">
              <span>
                <span className="uppercase tracking-wide font-medium">ID</span>{" "}
                <span className="font-mono">{item.id}</span>
              </span>
              <span>Created {new Date(item.createdAt).toLocaleString()}</span>
              <span>Updated {new Date(item.updatedAt).toLocaleString()}</span>
            </div>
          </div>

          {/* Description */}
          {item.description && (
            <div className="rounded-2xl border bg-card p-6 md:p-8 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                Description
              </p>
              <div className="prose prose-sm max-w-none text-foreground/90">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  rehypePlugins={[
                    rehypeRaw,
                    [
                      rehypeSanitize,
                      {
                        ...defaultSchema,
                        tagNames: [
                          ...(defaultSchema.tagNames || []),
                          "img",
                          "table",
                          "thead",
                          "tbody",
                          "tr",
                          "th",
                          "td",
                          "h1",
                          "h2",
                          "h3",
                          "h4",
                          "h5",
                          "h6",
                        ],
                        attributes: {
                          ...(defaultSchema.attributes || {}),
                          a: ["href", "title", "rel", "target"],
                          img: ["src", "alt", "title"],
                        },
                      },
                    ],
                  ]}
                >
                  {item.description}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Images */}
          <div className="rounded-2xl border bg-card p-6 md:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Images
                <span className="ml-1.5 normal-case font-normal text-muted-foreground">
                  ({item.images?.length ?? 0})
                </span>
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUploader(!showUploader)}
              >
                {showUploader ? "Cancel" : "Upload Images"}
              </Button>
            </div>

            {showUploader && (
              <div className="mb-4 p-4 rounded-lg border bg-muted/30">
                <ImageUploader
                  onUpload={handleImageUpload}
                  disabled={loading}
                />
              </div>
            )}

            {item.images && item.images.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {item.images.map((img) => (
                  <div key={img.id} className="relative group aspect-square">
                    <img
                      src={`${API_BASE_URL}${img.url}`}
                      alt={item.name}
                      className="h-full w-full rounded-lg object-cover border"
                    />
                    <button
                      type="button"
                      onClick={() => setImageToDelete(img.id)}
                      disabled={deletingImageId === img.id}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                      aria-label="Delete image"
                    >
                      {deletingImageId === img.id ? (
                        <svg
                          className="h-3.5 w-3.5 animate-spin"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No images yet.</p>
            )}
          </div>
        </>
      ) : (
        <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          Product not found.
        </div>
      )}

      <ConfirmModal
        open={!!imageToDelete}
        title="Delete Image"
        message="Are you sure you want to delete this image? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        loading={!!deletingImageId}
        onConfirm={handleDeleteImage}
        onCancel={() => setImageToDelete(null)}
      />
    </div>
  );
}
