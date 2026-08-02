import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import {
  getCategoryById,
  listCategories,
  updateCategory,
  type CategoryDetail as CategoryDetailType,
  type CategoryUpdateInput,
} from "../../lib/api";
import { 
  ChevronLeft, 
  Save, 
  Folder, 
  Settings, 
  AlertCircle, 
  RefreshCcw,
  LayoutGrid,
  Box
} from "lucide-react";

export default function CategoryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [cat, setCat] = useState<CategoryDetailType | null>(null);
  const [all, setAll] = useState<CategoryDetailType["children"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState<string | "" | null>("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const detail = await getCategoryById(id);
      setCat(detail);
      setName(detail.name);
      setSlug(detail.slug ?? "");
      setParentId(detail.parentId ?? "");
      setStatus(detail.status);
      const flat = await listCategories({ limit: 200, offset: 0 });
      setAll(flat);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load category");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const parentOptions = useMemo(() => {
    return all.filter((x) => x.id !== id); // avoid self-parenting in UI
  }, [all, id]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      const body: CategoryUpdateInput = {
        name: name || undefined,
        slug: slug || undefined,
        status,
        parentId: parentId === "" ? null : (parentId as string),
      };
      const updated = await updateCategory(id, body);
      setCat(updated);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update category",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <RefreshCcw className="h-8 w-8 animate-spin text-orange-500" />
      <p className="text-muted-foreground font-medium">Loading category details...</p>
    </div>
  );
  
  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <AlertCircle className="h-10 w-10 text-destructive" />
      <p className="text-destructive font-medium">{error}</p>
      <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
    </div>
  );

  if (!cat) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <Folder className="h-10 w-10 text-muted-foreground opacity-50" />
      <p className="text-muted-foreground font-medium">Category not found</p>
      <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <button onClick={() => navigate('/categories')} className="hover:text-blue-600 transition-colors flex items-center gap-1 font-medium">
          <ChevronLeft className="h-4 w-4" /> Categories
        </button>
        <span>/</span>
        <span className="text-foreground font-medium">{cat.name}</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {cat.name}
            </h1>
            <Badge
              className={`border-transparent ${
                cat.status === "ACTIVE"
                  ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                  : "bg-destructive/10 text-destructive hover:bg-destructive/20"
              }`}
            >
              {cat.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">Manage details and settings for this category.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Form Section */}
        <div className="lg:col-span-2">
          <form
            onSubmit={onSave}
            className="rounded-2xl border bg-card shadow-sm overflow-hidden"
          >
            <div className="bg-primary/5 px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" /> General Information
              </h2>
            </div>
            
            <div className="p-6 space-y-6 bg-gradient-to-b from-card to-muted/5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Name</Label>
                  <Input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    className="h-10 rounded-md focus-visible:ring-primary shadow-sm" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Slug</Label>
                  <Input 
                    value={slug} 
                    onChange={(e) => setSlug(e.target.value)} 
                    className="h-10 rounded-md focus-visible:ring-primary shadow-sm" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Parent Category</Label>
                  <select
                    value={parentId ?? ""}
                    onChange={(e) => setParentId(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors shadow-sm"
                  >
                    <option value="">— Top level —</option>
                    {parentOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Status</Label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors shadow-sm"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="pt-6 mt-6 flex items-center justify-end border-t border-muted/50">
                <Button 
                  type="submit" 
                  disabled={saving}
                  className="h-10 px-8 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow transition-all flex items-center gap-2"
                >
                  {saving ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* Sidebar / Children Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            <div className="bg-muted/40 px-6 py-4 border-b flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Subcategories</h2>
            </div>
            <div className="p-4 bg-gradient-to-b from-card to-muted/5">
              {cat.children.length === 0 ? (
                <div className="py-8 flex flex-col items-center justify-center text-center bg-muted/20 rounded-xl border border-dashed border-muted">
                  <Folder className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">No subcategories</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {cat.children.map((c) => (
                    <li key={c.id} className="group flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-primary/20 hover:bg-primary/5 hover:shadow-sm transition-all cursor-pointer" onClick={() => navigate(`/categories/${c.id}`)}>
                      <div className="flex items-center gap-3 font-medium text-sm text-left flex-1">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Folder className="h-4 w-4" />
                        </div>
                        <span className="truncate group-hover:text-primary transition-colors">{c.name}</span>
                      </div>
                      <Badge className="bg-background text-muted-foreground border border-muted font-normal shrink-0 group-hover:bg-primary/10 group-hover:text-primary group-hover:border-transparent transition-colors">
                        {c.productCount} products
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="rounded-2xl border bg-primary text-primary-foreground p-6 shadow-md relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-500">
              <Box className="w-32 h-32" />
            </div>
            <h3 className="text-lg font-semibold mb-2 relative z-10 text-primary-foreground/90">Products in Category</h3>
            <div className="flex items-end gap-3 relative z-10">
              <span className="text-5xl font-extrabold tracking-tighter text-primary-foreground">{cat.productCount ?? 0}</span>
              <span className="text-primary-foreground/80 pb-1.5 font-medium">total items</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
