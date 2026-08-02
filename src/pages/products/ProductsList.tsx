import { useEffect, useMemo, useState } from "react";
// import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import {
  listProducts,
  type ProductListItem,
  type ProductStatus,
  listCategories,
  type CategoryBase,
  type ProductListResponse,
  createProduct,
  type ProductCreateInput,
  getProductById,
  type ProductDetail,
  updateProduct,
  type ProductUpdateInput,
  uploadProductImages,
  deleteProductImage,
} from "../../lib/api";
import { API_BASE_URL } from "../../config/api";
import { ImageUploader } from "../../components/ui/image-uploader";
import { ConfirmModal } from "../../components/ui/confirm-modal";
import { useToast } from "../../components/ui/toast";
import { useDebounce } from "../../lib/hooks/useDebounce";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  ArrowUp,
  ArrowDown,
  FileText,
  Tag,
  Star,
  BookOpen,
  Plus,
  RefreshCcw,
} from "lucide-react";
import ProductTerms from "../../components/ui/product-terms";
import ProductSpecs from "../../components/ui/product-specs";
import ProductReviews from "../../components/ui/product-reviews";
import ProductDocs from "../../components/ui/product-docs";
import { useAuthStore } from "../../store/auth";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";

export default function ProductsList() {
  // const navigate = useNavigate();
  const [items, setItems] = useState<ProductListItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryBase[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [, /*detailsId*/ setDetailsId] = useState<string | null>(null);
  const [detailsItem, setDetailsItem] = useState<ProductDetail | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<ProductDetail | null>(null);
  const [specsOpen, setSpecsOpen] = useState(false);
  const [specsProductId, setSpecsProductId] = useState<string | null>(null);
  const [termsOpen, setTermsOpen] = useState(false);
  const [termsProductId, setTermsProductId] = useState<string | null>(null);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [reviewsProductId, setReviewsProductId] = useState<string | null>(null);
  const [docsOpen, setDocsOpen] = useState(false);
  const [docsProductId, setDocsProductId] = useState<string | null>(null);

  // Filters
  const [categoryId, setCategoryId] = useState<string>("");
  const [status, setStatus] = useState<ProductStatus | "">("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [limit, setLimit] = useState<number>(50);
  const [offset, setOffset] = useState<number>(0);
  const [sortBy, setSortBy] = useState<"price" | "stock" | "updatedAt" | "">(
    "",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  async function fetchCategories() {
    setCategoriesLoading(true);
    try {
      const data = await listCategories({ limit: 200, offset: 0 });
      setCategories(data);
    } catch (err) {
      // Silent fail for categories list
      // console.warn(err);
    } finally {
      setCategoriesLoading(false);
    }
  }

  async function fetchProducts() {
    setLoading(true);
    setError(null);
    try {
      const data: ProductListResponse = await listProducts({
        categoryId: categoryId || undefined,
        status: (status || undefined) as ProductStatus | undefined,
        search: debouncedSearch || undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        limit,
        offset,
        sortBy: (sortBy || undefined) as any,
        sortOrder: sortBy ? sortOrder : undefined,
      });
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
      // Optionally sync limit/offset from server response
      // setLimit(data.limit ?? limit);
      // setOffset(data.offset ?? offset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    function onClose() {
      setSpecsOpen(false);
      setSpecsProductId(null);
    }
    function onCloseTerms() {
      setTermsOpen(false);
      setTermsProductId(null);
    }
    function onCloseReviews() {
      setReviewsOpen(false);
      setReviewsProductId(null);
    }
    function onCloseDocs() {
      setDocsOpen(false);
      setDocsProductId(null);
    }
    window.addEventListener("close-specs", onClose as EventListener);
    window.addEventListener("close-terms", onCloseTerms as EventListener);
    window.addEventListener("close-reviews", onCloseReviews as EventListener);
    window.addEventListener("close-docs", onCloseDocs as EventListener);
    return () => {
      window.removeEventListener("close-specs", onClose as EventListener);
      window.removeEventListener("close-terms", onCloseTerms as EventListener);
      window.removeEventListener(
        "close-reviews",
        onCloseReviews as EventListener,
      );
      window.removeEventListener("close-docs", onCloseDocs as EventListener);
    };
  }, []);

  async function openDetails(id: string) {
    setDetailsId(id);
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsError(null);
    try {
      const data = await getProductById(id);
      setDetailsItem(data);
    } catch (err) {
      setDetailsError(
        err instanceof Error ? err.message : "Failed to fetch product",
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  useEffect(() => {
    // Reset offset when filters change (excluding offset itself)
    setOffset(0);
  }, [
    categoryId,
    status,
    debouncedSearch,
    minPrice,
    maxPrice,
    limit,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    categoryId,
    status,
    debouncedSearch,
    minPrice,
    maxPrice,
    limit,
    offset,
    sortBy,
    sortOrder,
  ]);

  const statusBadge = (s: ProductStatus) => (
    <Badge className={s === "ACTIVE" ? "bg-green-500" : "bg-muted"}>{s}</Badge>
  );

  const hasNextPage = useMemo(
    () => offset + items.length < total,
    [offset, items.length, total],
  );

  const currentStart = useMemo(
    () => (total === 0 ? 0 : offset + 1),
    [offset, total],
  );
  const currentEnd = useMemo(
    () => offset + items.length,
    [offset, items.length],
  );

  function toggleSort(field: "price" | "stock" | "updatedAt") {
    setSortBy((prev) => {
      if (prev === field) {
        // toggle order
        setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
        return prev;
      }
      // set new field and reset to asc
      setSortOrder("asc");
      return field;
    });
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Products
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">
            Manage your product inventory, pricing, and availability.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button variant="outline" onClick={fetchProducts} disabled={loading} className="h-10 px-4 rounded-full shadow-sm hover:shadow transition-all bg-background">
            <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="h-10 px-5 rounded-full shadow-md hover:shadow transition-all">
            <Plus className="mr-2 h-4 w-4" /> New Product
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <div className="md:col-span-3 space-y-2">
            <Label className="text-sm font-medium">Category</Label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
              disabled={categoriesLoading}
            >
              {categoriesLoading ? (
                <option value="">Loading categories...</option>
              ) : (
                <>
                  <option value="">— Any —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label className="text-sm font-medium">Status</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProductStatus | "")}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
            >
              <option value="">— Any —</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
          <div className="md:col-span-3 space-y-2">
            <Label className="text-sm font-medium">Search</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, slug, description..."
              className="h-10 shadow-sm focus-visible:ring-primary"
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label className="text-sm font-medium">Min Price</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="h-10 shadow-sm focus-visible:ring-primary"
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label className="text-sm font-medium">Max Price</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="h-10 shadow-sm focus-visible:ring-primary"
            />
          </div>
          <div className="md:col-span-12 lg:col-span-2 space-y-2 mt-4 lg:mt-0">
            <Label className="text-sm font-medium hidden lg:block">&nbsp;</Label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
            >
              {[20, 50, 100, 200].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
        {error && <div className="mt-3 text-sm text-destructive">{error}</div>}
      </div>

      {/* List */}
      <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="border-b text-muted-foreground text-xs uppercase tracking-wider font-semibold">
              <th className="px-3 py-2 text-left">Product</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">
                <button
                  className="inline-flex items-center gap-1 hover:underline"
                  onClick={() => toggleSort("price")}
                >
                  Price
                  {sortBy === "price" &&
                    (sortOrder === "asc" ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    ))}
                </button>
              </th>
              <th className="px-3 py-2 text-left">
                <button
                  className="inline-flex items-center gap-1 hover:underline"
                  onClick={() => toggleSort("stock")}
                >
                  Stock
                  {sortBy === "stock" &&
                    (sortOrder === "asc" ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    ))}
                </button>
              </th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">
                <button
                  className="inline-flex items-center gap-1 hover:underline"
                  onClick={() => toggleSort("updatedAt")}
                >
                  Updated
                  {sortBy === "updatedAt" &&
                    (sortOrder === "asc" ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    ))}
                </button>
              </th>
              <th className="px-3 py-2 text-left">Specs</th>
              <th className="px-3 py-2 text-left">Terms</th>
              <th className="px-3 py-2 text-left">Reviews</th>
              <th className="px-3 py-2 text-left">Docs</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="px-3 py-2">
                    <Skeleton className="h-6 w-56" />
                  </td>
                  <td className="px-3 py-2">
                    <Skeleton className="h-6 w-32" />
                  </td>
                  <td className="px-3 py-2">
                    <Skeleton className="h-6 w-16" />
                  </td>
                  <td className="px-3 py-2">
                    <Skeleton className="h-6 w-12" />
                  </td>
                  <td className="px-3 py-2">
                    <Skeleton className="h-6 w-20" />
                  </td>
                  <td className="px-3 py-2">
                    <Skeleton className="h-6 w-24" />
                  </td>
                  <td className="px-3 py-2">
                    <Skeleton className="h-6 w-16" />
                  </td>
                  <td className="px-3 py-2">
                    <Skeleton className="h-6 w-16" />
                  </td>
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td
                  className="px-3 py-6 text-center text-muted-foreground"
                  colSpan={10}
                >
                  No products match your filters.
                </td>
              </tr>
            ) : (
              items.map((p) => (
                <tr
                  key={p.id}
                  className="border-b hover:bg-accent/40 cursor-pointer"
                  onClick={() => openDetails(p.id)}
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-4">
                      {p.images?.[0]?.url ? (
                        <img
                          src={`${API_BASE_URL}${p.images[0].url}`}
                          alt={p.name}
                          className="h-12 w-12 rounded-lg object-cover border shadow-sm"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg border bg-muted flex items-center justify-center">
                          <BookOpen className="h-5 w-5 text-muted-foreground/30" />
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-foreground">{p.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{p.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">{p.category?.name}</td>
                  <td className="px-3 py-2">৳{p.price.toFixed(2)}</td>
                  <td className="px-3 py-2">{p.stock}</td>
                  <td className="px-3 py-2">{statusBadge(p.status)}</td>
                  <td className="px-3 py-2">
                    {new Date(p.updatedAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSpecsProductId(p.id);
                        setSpecsOpen(true);
                      }}
                      aria-label={`Open specs for ${p.name}`}
                    >
                      <Tag className="h-4 w-4" />
                    </Button>
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTermsProductId(p.id);
                        setTermsOpen(true);
                      }}
                      aria-label={`Open terms for ${p.name}`}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReviewsProductId(p.id);
                        setReviewsOpen(true);
                      }}
                      aria-label={`Open reviews for ${p.name}`}
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDocsProductId(p.id);
                        setDocsOpen(true);
                      }}
                      aria-label={`Open docs for ${p.name}`}
                    >
                      <BookOpen className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-2">
        <div className="text-sm text-muted-foreground font-medium">
          Showing {currentStart}-{currentEnd} of {total}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setOffset((o) => Math.max(0, o - limit))}
            disabled={offset <= 0 || loading}
          >
            Previous
          </Button>
          <Button
            onClick={() => setOffset((o) => o + limit)}
            disabled={!hasNextPage || loading}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Category filter tree */}
      <div className="rounded-lg border bg-card p-3">
        <h2 className="text-sm font-medium mb-2">Category Tree</h2>
        {categoriesLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-6 w-40 ml-6" />
            <Skeleton className="h-6 w-44 ml-6" />
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-6 w-42 ml-6" />
          </div>
        ) : categories.length === 0 ? (
          <div className="text-sm text-muted-foreground py-2">
            No categories found.
          </div>
        ) : (
          <CategoryFilterTree
            categories={categories}
            selectedId={categoryId || null}
            onSelect={(id) => setCategoryId(id ?? "")}
          />
        )}
        <div className="mt-2">
          <Button
            variant="outline"
            onClick={() => setCategoryId("")}
            disabled={categoriesLoading}
          >
            Clear Category Filter
          </Button>
        </div>
      </div>

      <CreateProductModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          fetchProducts();
        }}
        categories={categories}
        categoriesLoading={categoriesLoading}
      />

      <ProductDetailsModal
        open={detailsOpen}
        onClose={() => {
          setDetailsOpen(false);
          setDetailsItem(null);
          setDetailsId(null);
          setDetailsError(null);
        }}
        loading={detailsLoading}
        error={detailsError}
        item={detailsItem}
        onEdit={(product) => {
          setEditItem(product);
          setEditOpen(true);
        }}
        onImageUploaded={(updated) => {
          setDetailsItem(updated);
          fetchProducts();
        }}
      />

      <EditProductModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditItem(null);
        }}
        onUpdated={async (updated) => {
          setEditOpen(false);
          setEditItem(null);
          setDetailsItem(updated);
          fetchProducts();
        }}
        categories={categories}
        categoriesLoading={categoriesLoading}
        item={editItem}
      />
      {specsOpen && specsProductId && (
        <ProductSpecs
          productId={specsProductId}
          role={useAuthStore.getState().role ?? undefined}
        />
      )}
      {termsOpen && termsProductId && (
        <ProductTerms
          productId={termsProductId}
          role={useAuthStore.getState().role ?? undefined}
        />
      )}
      {reviewsOpen && reviewsProductId && (
        <ProductReviews
          productId={reviewsProductId}
          role={useAuthStore.getState().role ?? undefined}
        />
      )}
      {docsOpen && docsProductId && (
        <ProductDocs
          productId={docsProductId}
          role={useAuthStore.getState().role ?? undefined}
        />
      )}
    </div>
  );
}

function CategoryFilterTree({
  categories,
  selectedId,
  onSelect,
}: {
  categories: CategoryBase[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const topLevel = useMemo(
    () => categories.filter((c) => c.parentId === null),
    [categories],
  );
  const byParent = useMemo(() => {
    const map = new Map<string, CategoryBase[]>();
    categories.forEach((c) => {
      if (!c.parentId) return;
      const arr = map.get(c.parentId) ?? [];
      arr.push(c);
      map.set(c.parentId, arr);
    });
    return map;
  }, [categories]);

  function childrenOf(id: string) {
    return byParent.get(id) ?? [];
  }

  return (
    <ul className="space-y-1">
      {topLevel.map((c) => (
        <CategoryTreeNode
          key={c.id}
          node={c}
          getChildren={childrenOf}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}

function ProductDetailsModal({
  open,
  onClose,
  loading,
  error,
  item,
  onEdit,
  onImageUploaded,
}: {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  error: string | null;
  item: ProductDetail | null;
  onEdit: (product: ProductDetail) => void;
  onImageUploaded: (updated: ProductDetail) => void;
}) {
  const { addToast } = useToast();
  const [showUploader, setShowUploader] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);

  const handleImageUpload = async (files: File[]) => {
    if (!item) return;
    const updated = await uploadProductImages(item.id, files);
    onImageUploaded(updated);
    setShowUploader(false);
  };

  const handleDeleteImage = async () => {
    if (!item || !imageToDelete) return;
    setDeletingImageId(imageToDelete);
    try {
      const updated = await deleteProductImage(item.id, imageToDelete);
      onImageUploaded(updated);
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
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-[95%] max-w-3xl max-h-[90vh] flex flex-col rounded-lg border bg-card shadow-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Product Details</h3>
          <div className="flex gap-2">
            {item && (
              <Button variant="outline" onClick={() => onEdit(item)}>
                Edit
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : item ? (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                {item.images?.[0]?.url ? (
                  <img
                    src={`${API_BASE_URL}${item.images[0].url}`}
                    alt={item.name}
                    className="h-24 w-24 rounded object-cover border"
                  />
                ) : (
                  <div className="h-24 w-24 rounded border bg-muted" />
                )}
                <div>
                  <h2 className="text-xl font-semibold">{item.name}</h2>
                  <div className="text-muted-foreground">{item.slug}</div>
                  <div className="mt-2 prose prose-sm max-w-none">
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
                      {item.description || ""}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <Label>Category</Label>
                  <div>
                    {item.category?.name} ({item.category?.slug})
                  </div>
                </div>
                <div>
                  <Label>Price</Label>
                  <div>৳{item.price.toFixed(2)}</div>
                </div>
                <div>
                  <Label>Stock</Label>
                  <div>{item.stock}</div>
                </div>
                <div>
                  <Label>Status</Label>
                  <div>
                    <Badge
                      className={
                        item.status === "ACTIVE" ? "bg-green-500" : "bg-muted"
                      }
                    >
                      {item.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Model Number</Label>
                  <div>
                    {item.modelNumber ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
                <div>
                  <Label>Created</Label>
                  <div>{new Date(item.createdAt).toLocaleString()}</div>
                </div>
                <div>
                  <Label>Updated</Label>
                  <div>{new Date(item.updatedAt).toLocaleString()}</div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Images</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUploader(!showUploader)}
                  >
                    {showUploader ? "Cancel" : "Upload Images"}
                  </Button>
                </div>

                {showUploader && (
                  <div className="mb-4 p-4 border rounded-lg bg-muted/30">
                    <ImageUploader
                      onUpload={handleImageUpload}
                      disabled={loading}
                    />
                  </div>
                )}

                {item.images && item.images.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {item.images.map((img) => (
                      <div key={img.id} className="relative group">
                        <img
                          src={`${API_BASE_URL}${img.url}`}
                          alt={item.name}
                          className="h-24 w-full rounded object-cover border"
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
                              className="h-4 w-4 animate-spin"
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
                              className="h-4 w-4"
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
                  <div className="text-sm text-muted-foreground mt-1">
                    No images
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Product not found.
            </div>
          )}
        </div>
      </div>

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

function CreateProductModal({
  open,
  onClose,
  onCreated,
  categories,
  categoriesLoading,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  categories: CategoryBase[];
  categoriesLoading: boolean;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [price, setPrice] = useState<string>("0");
  const [stock, setStock] = useState<string>("0");
  const [description, setDescription] = useState("");
  const [modelNumber, setModelNumber] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [status, setStatus] = useState<ProductStatus>("ACTIVE");
  const [saving, setSaving] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [slugEdited, setSlugEdited] = useState(false);
  const { addToast } = useToast();

  function slugify(s: string) {
    return s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  useEffect(() => {
    if (open) {
      setName("");
      setSlug("");
      setPrice("0");
      setStock("0");
      setDescription("");
      setModelNumber("");
      setCategoryId("");
      setStatus("ACTIVE");
      setErrorState(null);
      setFieldErrors({});
      setSlugEdited(false);
    }
  }, [open]);

  useEffect(() => {
    if (!slugEdited) setSlug(slugify(name));
  }, [name, slugEdited]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorState(null);
    setFieldErrors({});
    try {
      const errs: Record<string, string> = {};
      if (!name || !name.trim()) errs.name = "Name is required";
      if (!categoryId) errs.categoryId = "Category is required";
      const priceNum = Number(price);
      const stockNum = Number(stock);
      if (Number.isNaN(priceNum) || priceNum < 0)
        errs.price = "Price must be >= 0";
      if (Number.isNaN(stockNum) || stockNum < 0)
        errs.stock = "Stock must be >= 0";
      if (Object.keys(errs).length) {
        setFieldErrors(errs);
        setSaving(false);
        return;
      }

      const payload: ProductCreateInput = { name, categoryId, status };
      if (slug) payload.slug = slug;
      if (description) payload.description = description;
      if (modelNumber) payload.modelNumber = modelNumber;
      if (!Number.isNaN(priceNum) && priceNum >= 0) payload.price = priceNum;
      if (!Number.isNaN(stockNum) && stockNum >= 0)
        payload.stock = Math.floor(stockNum);
      await createProduct(payload);
      addToast("Product created", "success");
      onCreated();
    } catch (err) {
      setErrorState(
        err instanceof Error ? err.message : "Failed to create product",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-xl border bg-card shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="text-base font-semibold">New Product</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Fill in the details to create a new product
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        <form onSubmit={onSubmit} className="px-6 py-5 space-y-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Basic Info
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Product name"
                  required
                />
                {fieldErrors.name && (
                  <div className="text-xs text-destructive">
                    {fieldErrors.name}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>
                  Category <span className="text-destructive">*</span>
                </Label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                  disabled={categoriesLoading}
                >
                  {categoriesLoading ? (
                    <option value="">Loading categories...</option>
                  ) : (
                    <>
                      <option value="">— Select category —</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                {fieldErrors.categoryId && (
                  <div className="text-xs text-destructive">
                    {fieldErrors.categoryId}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>
                  Slug{" "}
                  <span className="text-muted-foreground text-xs font-normal">
                    (optional — auto-generated)
                  </span>
                </Label>
                <Input
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugEdited(true);
                  }}
                  placeholder="product-slug"
                />
                {!slugEdited && name && (
                  <div className="text-xs text-muted-foreground">
                    Suggested: {slugify(name)}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>
                  Model Number{" "}
                  <span className="text-muted-foreground text-xs font-normal">
                    (optional)
                  </span>
                </Label>
                <Input
                  value={modelNumber}
                  onChange={(e) => setModelNumber(e.target.value)}
                  placeholder="e.g. TRS-2026"
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Pricing & Inventory
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Price</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
                {fieldErrors.price && (
                  <div className="text-xs text-destructive">
                    {fieldErrors.price}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Stock</Label>
                <Input
                  type="number"
                  min={0}
                  step="1"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                />
                {fieldErrors.stock && (
                  <div className="text-xs text-destructive">
                    {fieldErrors.stock}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProductStatus)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Description
            </p>
            <div
              data-color-mode="light"
              className="rounded-md border overflow-hidden"
            >
              <MDEditor
                value={description}
                onChange={(v) => setDescription(v || "")}
                preview="live"
                height={240}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Supports Markdown — headings, tables, lists, links.
            </p>
          </div>

          {errorState && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {errorState}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !!Object.keys(fieldErrors).length}
            >
              {saving ? "Creating..." : "Create Product"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CategoryTreeNode({
  node,
  getChildren,
  selectedId,
  onSelect,
}: {
  node: CategoryBase;
  getChildren: (id: string) => CategoryBase[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const children = getChildren(node.id);
  const hasChildren = children.length > 0;
  const isSelected = selectedId === node.id;
  return (
    <li>
      <div className="flex items-center gap-2 py-1">
        {hasChildren ? (
          <button
            className="h-6 w-6 rounded hover:bg-accent"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <span className="h-6 w-6 inline-block" />
        )}
        <Folder className="h-4 w-4 text-muted-foreground" />
        <button
          className={`text-left hover:underline ${isSelected ? "font-medium" : ""}`}
          onClick={() => onSelect(isSelected ? null : node.id)}
        >
          {node.name}
        </button>
        <span className="ml-auto">
          <Badge className="text-muted-foreground">{node.productCount}</Badge>
        </span>
      </div>
      {expanded && hasChildren && (
        <ul className="ml-6 border-l pl-3">
          {children.map((c) => (
            <CategoryTreeNode
              key={c.id}
              node={c}
              getChildren={getChildren}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function EditProductModal({
  open,
  onClose,
  onUpdated,
  categories,
  categoriesLoading,
  item,
}: {
  open: boolean;
  onClose: () => void;
  onUpdated: (updated: ProductDetail) => void;
  categories: CategoryBase[];
  categoriesLoading: boolean;
  item: ProductDetail | null;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [price, setPrice] = useState<string>("0");
  const [stock, setStock] = useState<string>("0");
  const [description, setDescription] = useState("");
  const [modelNumber, setModelNumber] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [status, setStatus] = useState<ProductStatus>("ACTIVE");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && item) {
      setName(item.name);
      setSlug(item.slug);
      setPrice(String(item.price));
      setStock(String(item.stock));
      setDescription(item.description || "");
      setModelNumber(item.modelNumber ?? "");
      setCategoryId(item.categoryId);
      setStatus(item.status);
      setError(null);
    }
  }, [open, item]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    setSaving(true);
    setError(null);
    try {
      const payload: ProductUpdateInput = {};
      if (name !== item.name) payload.name = name;
      if (slug !== item.slug) payload.slug = slug;
      if (description !== (item.description || ""))
        payload.description = description;
      const newModelNumber = modelNumber || null;
      if (newModelNumber !== (item.modelNumber ?? null))
        payload.modelNumber = newModelNumber;
      if (categoryId !== item.categoryId) payload.categoryId = categoryId;
      if (status !== item.status) payload.status = status;
      const priceNum = Number(price);
      const stockNum = Number(stock);
      if (!Number.isNaN(priceNum) && priceNum !== item.price)
        payload.price = priceNum;
      if (!Number.isNaN(stockNum) && Math.floor(stockNum) !== item.stock)
        payload.stock = Math.floor(stockNum);
      const updated = await updateProduct(item.id, payload);
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update product");
    } finally {
      setSaving(false);
    }
  }

  if (!open || !item) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[95%] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card p-4 shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Edit Product</h3>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        <form
          onSubmit={onSubmit}
          className="grid grid-cols-1 md:grid-cols-12 gap-3"
        >
          <div className="md:col-span-6 space-y-1">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="md:col-span-6 space-y-1">
            <Label>Slug</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
          </div>
          <div className="md:col-span-6 space-y-1">
            <Label>Model Number</Label>
            <Input
              value={modelNumber}
              onChange={(e) => setModelNumber(e.target.value)}
              placeholder="optional"
            />
          </div>
          <div className="md:col-span-4 space-y-1">
            <Label>Price</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div className="md:col-span-4 space-y-1">
            <Label>Stock</Label>
            <Input
              type="number"
              min={0}
              step="1"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </div>
          <div className="md:col-span-4 space-y-1">
            <Label>Status</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProductStatus)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
          <div className="md:col-span-6 space-y-1">
            <Label>Category</Label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
              disabled={categoriesLoading}
            >
              {categoriesLoading ? (
                <option value="">Loading categories...</option>
              ) : (
                <>
                  <option value="">— Select —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
          <div className="md:col-span-12 space-y-1">
            <Label>Description (Markdown)</Label>
            <div data-color-mode="light" className="rounded-md border">
              <MDEditor
                value={description}
                onChange={(v) => setDescription(v || "")}
                preview="live"
                height={240}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Tip: Use headings, lists, tables, and links.
            </div>
          </div>
          {error && (
            <div className="md:col-span-12 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="md:col-span-12 flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
