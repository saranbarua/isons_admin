import { useEffect, useMemo, useState } from "react";
// import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import {
  ChevronRight,
  Folder,
  Plus,
  Pencil,
  X,
  Trash,
  GripVertical,
  Layers,
  AlertCircle,
  Box,
  Tag,
  RefreshCcw,
} from "lucide-react";
import {
  DndContext,
  type DragEndEvent,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  createCategory,
  listCategories,
  updateCategory,
  getCategoryById,
  deleteCategory,
  type CategoryBase,
  type CategoryCreateInput,
  type CategoryDetail,
} from "../../lib/api";

export default function CategoriesList() {
  const [items, setItems] = useState<CategoryBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState<string | "" | null>("");
  const [creating, setCreating] = useState(false);
  // Inline subcategory add state
  const [addForParentId, setAddForParentId] = useState<string | null>(null);
  const [subName, setSubName] = useState("");
  const [subSlug, setSubSlug] = useState("");
  const [subCreating, setSubCreating] = useState(false);
  // Edit modal state
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editParentId, setEditParentId] = useState<string | "" | null>("");
  const [editSaving, setEditSaving] = useState(false);
  const [editStatus, setEditStatus] = useState<string>("");
  // Details panel state
  // const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<CategoryDetail | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [selectedError, setSelectedError] = useState<string | null>(null);
  // Delete modal state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchAll() {
    setLoading(true);
    setError(null);
    try {
      const data = await listCategories({
        limit: 200,
        offset: 0,
      });
      setItems(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch categories",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const topLevel = useMemo(
    () => items.filter((c) => c.parentId === null),
    [items],
  );
  const byParent = useMemo(() => {
    const map = new Map<string, CategoryBase[]>();
    items.forEach((c) => {
      if (!c.parentId) return;
      const arr = map.get(c.parentId) ?? [];
      arr.push(c);
      map.set(c.parentId, arr);
    });
    return map;
  }, [items]);

  function childrenOf(id: string) {
    return byParent.get(id) ?? [];
  }

  async function fetchSelected(id: string) {
    setSelectedLoading(true);
    setSelectedError(null);
    try {
      const data = await getCategoryById(id);
      setSelected(data);
    } catch (err) {
      setSelectedError(
        err instanceof Error ? err.message : "Failed to fetch details",
      );
    } finally {
      setSelectedLoading(false);
    }
  }

  function isDescendant(parentId: string, potentialChildId: string): boolean {
    const stack = [...childrenOf(parentId)];
    while (stack.length) {
      const node = stack.pop()!;
      if (node.id === potentialChildId) return true;
      stack.push(...childrenOf(node.id));
    }
    return false;
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const body: CategoryCreateInput = { name };
      if (slug) body.slug = slug;
      if (parentId === "") {
        // omit parentId to create top-level
      } else if (parentId === null) {
        body.parentId = null;
      } else {
        body.parentId = parentId;
      }
      await createCategory(body);
      setName("");
      setSlug("");
      setParentId("");
      await fetchAll();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create category",
      );
    } finally {
      setCreating(false);
    }
  }

  async function onCreateSub(parent: string) {
    setSubCreating(true);
    setError(null);
    try {
      const body: CategoryCreateInput = { name: subName };
      if (subSlug) body.slug = subSlug;
      body.parentId = parent;
      await createCategory(body);
      setSubName("");
      setSubSlug("");
      setAddForParentId(null);
      await fetchAll();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create subcategory",
      );
    } finally {
      setSubCreating(false);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const sourceId = String(active.id);
    const targetId = String(over.id);
    if (sourceId === targetId) return;
    // Handle drop to root
    if (targetId === "ROOT") {
      try {
        await updateCategory(sourceId, { parentId: null } as any);
        await fetchAll();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to move to top level",
        );
      }
      return;
    }
    // Prevent dropping a node into one of its descendants
    if (isDescendant(sourceId, targetId)) {
      setError("Cannot move a category into its own descendant.");
      return;
    }
    try {
      await updateCategory(sourceId, { parentId: targetId } as any);
      await fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move category");
    }
  }

  function openEdit(id: string) {
    const cat = items.find((c) => c.id === id);
    if (!cat) return;
    setEditId(id);
    setEditName(cat.name);
    setEditSlug((cat as any)?.slug ?? "");
    setEditParentId(cat.parentId ?? "");
    setEditStatus((cat as any)?.status ?? "");
  }

  function openDelete(id: string) {
    setDeleteId(id);
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteCategory(deleteId);
      setDeleteId(null);
      // Clear selection if it was deleted
      setSelected((prev) => (prev && prev.id === deleteId ? null : prev));
      await fetchAll();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete category",
      );
    } finally {
      setDeleting(false);
    }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setEditSaving(true);
    setError(null);
    try {
      const payload: any = { name: editName };
      if (editSlug) payload.slug = editSlug;
      if (editParentId === "") payload.parentId = null;
      else payload.parentId = editParentId;
      if (editStatus) payload.status = editStatus;
      await updateCategory(editId, payload);
      setEditId(null);
      await fetchAll();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update category",
      );
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Categories
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">
            Manage your product taxonomy. Drag and drop to reorganize, click to view details, and seamlessly build your category structure.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="outline"
            onClick={fetchAll}
            className="hidden sm:inline-flex h-10 px-4 rounded-full shadow-sm hover:shadow transition-all bg-background"
          >
            <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button onClick={() => setAddForParentId(null)} className="h-10 px-5 rounded-full shadow-md hover:shadow-lg transition-all">
            <Plus className="mr-2 h-4 w-4" /> New Category
          </Button>
        </div>
      </div>

      {/* Create form */}
      <form
        onSubmit={onCreate}
        className="mb-8 overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:shadow-md"
      >
        <div className="bg-muted/40 px-6 py-3.5 border-b flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              <Plus className="h-4 w-4" />
            </div>
            Quick Create Category
          </h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-end bg-gradient-to-b from-card to-muted/5">
          <div className="md:col-span-4 space-y-2">
            <Label className="text-sm font-medium text-foreground">Name <span className="text-destructive">*</span></Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Electronics"
              className="h-10 rounded-md bg-background shadow-sm transition-shadow focus-visible:ring-primary/50"
            />
          </div>
          <div className="md:col-span-3 space-y-2">
            <Label className="text-sm font-medium text-foreground">Slug</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. electronics"
              className="h-10 rounded-md bg-background shadow-sm transition-shadow focus-visible:ring-primary/50"
            />
          </div>
          <div className="md:col-span-3 space-y-2">
            <Label className="text-sm font-medium text-foreground">Parent Category</Label>
            <select
              value={parentId ?? ""}
              onChange={(e) => setParentId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors shadow-sm"
            >
              <option value="">— Top Level —</option>
              {items.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" className="w-full h-10 rounded-md shadow-sm hover:shadow transition-all group" disabled={creating}>
              {creating ? (
                <span className="flex items-center gap-2"><RefreshCcw className="h-4 w-4 animate-spin" /> Creating...</span>
              ) : (
                <>
                  Create <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </div>
        </div>
        {error && (
          <div className="px-6 py-3 bg-destructive/5 text-sm text-destructive flex items-center gap-2 border-t border-destructive/10">
            <AlertCircle className="h-4 w-4"/> {error}
          </div>
        )}
      </form>

      {/* Two-pane layout: tree and info */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Tree Pane */}
        <div className="xl:col-span-7 2xl:col-span-8 flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" /> Category Hierarchy
            </h2>
          </div>
          <div className="rounded-2xl border bg-card p-4 shadow-sm min-h-[500px]">
            <DndContext
              onDragEnd={handleDragEnd}
              sensors={useSensors(
                useSensor(PointerSensor, {
                  activationConstraint: { distance: 8 },
                }),
                useSensor(KeyboardSensor),
              )}
              collisionDetection={closestCenter}
            >
              <RootDropZone />
              <ul className="space-y-2 mt-4">
                {loading ? (
                  <div className="py-12 text-center flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl border-muted">
                    <RefreshCcw className="h-8 w-8 mb-3 opacity-50 animate-spin text-primary" />
                    <p>Loading categories...</p>
                  </div>
                ) : topLevel.length === 0 ? (
                  <div className="py-12 text-center flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl border-muted">
                    <Layers className="h-8 w-8 mb-3 opacity-50" />
                    <p>No categories found.</p>
                    <p className="text-sm opacity-70">Create one above to get started.</p>
                  </div>
                ) : (
                  topLevel.map((c) => (
                    <CategoryNode
                      key={c.id}
                      node={c}
                      getChildren={childrenOf}
                      onOpen={(id) => fetchSelected(id)}
                      onAddClick={(id) =>
                        setAddForParentId((v) => (v === id ? null : id))
                      }
                      onEditClick={(id) => openEdit(id)}
                      onDeleteClick={(id) => openDelete(id)}
                      currentAddId={addForParentId}
                      subName={subName}
                      subSlug={subSlug}
                      setSubName={setSubName}
                      setSubSlug={setSubSlug}
                      onCreateSub={(id) => onCreateSub(id)}
                      subCreating={subCreating}
                      selectedId={selected?.id}
                    />
                  ))
                )}
              </ul>
            </DndContext>
          </div>
        </div>

        {/* Details Pane */}
        <div className="xl:col-span-5 2xl:col-span-4 rounded-2xl border bg-card shadow-sm sticky top-6 overflow-hidden flex flex-col min-h-[400px]">
          <div className="h-1.5 w-full bg-gradient-to-r from-primary to-primary/40"></div>
          {selected ? (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="p-6 border-b bg-muted/20">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2.5">
                      <Badge className="bg-background text-xs py-0.5 border text-foreground">
                        {selected.parentId ? 'Subcategory' : 'Top Level'}
                      </Badge>
                      <Badge 
                        className={selected.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-transparent' : 'bg-destructive/10 text-destructive hover:bg-destructive/20 border-transparent'} 
                      >
                        {selected.status ?? 'ACTIVE'}
                      </Badge>
                    </div>
                    <h3 className="text-2xl font-bold tracking-tight">{selected.name}</h3>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-2">
                      <Tag className="h-3.5 w-3.5" />
                      {(selected as any)?.slug ?? "No slug defined"}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 shadow-sm hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => openEdit(selected.id)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 shadow-sm"
                      onClick={() => openDelete(selected.id)}
                    >
                      <Trash className="h-3.5 w-3.5 mr-1.5" /> Delete
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-6 flex-1 bg-background">
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="rounded-xl border bg-card p-4 flex flex-col gap-1.5 shadow-sm">
                    <span className="text-sm font-medium text-muted-foreground">Products</span>
                    <div className="flex items-center gap-2">
                      <Box className="h-5 w-5 text-primary/70" />
                      <span className="text-2xl font-semibold">{selected.productCount ?? 0}</span>
                    </div>
                  </div>
                  <div className="rounded-xl border bg-card p-4 flex flex-col gap-1.5 shadow-sm">
                    <span className="text-sm font-medium text-muted-foreground">Parent</span>
                    <div className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-primary/70" />
                      <span className="text-sm font-medium truncate max-w-[100px]" title={selected.parentId ? (items.find((c) => c.id === selected.parentId)?.name ?? "Unknown") : "None"}>
                        {selected.parentId
                          ? (items.find((c) => c.id === selected.parentId)?.name ??
                            "Unknown")
                          : "None"}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-4">
                    <Folder className="h-4 w-4 text-muted-foreground" /> Subcategories ({childrenOf(selected.id).length})
                  </h4>
                  <ul className="space-y-2.5">
                    {childrenOf(selected.id).map((child) => (
                      <li
                        key={child.id}
                        className="group flex items-center justify-between rounded-xl border bg-card px-4 py-3 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => fetchSelected(child.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                            <Folder className="h-4 w-4" />
                          </div>
                          <span className="font-medium text-sm group-hover:text-primary transition-colors">{child.name}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </li>
                    ))}
                    {childrenOf(selected.id).length === 0 && (
                      <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/30 rounded-xl border border-dashed border-muted">
                        <Layers className="h-8 w-8 text-muted-foreground/40 mb-2" />
                        <p className="text-sm font-medium text-muted-foreground">No subcategories</p>
                      </div>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          ) : selectedLoading ? (
            <div className="p-12 flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
              <RefreshCcw className="h-8 w-8 animate-spin text-primary/50" />
              <p className="text-sm font-medium">Loading details...</p>
            </div>
          ) : (
            <div className="p-12 flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-4">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-2">
                <Box className="h-8 w-8 opacity-50" />
              </div>
              <p className="text-base font-medium text-foreground">No Category Selected</p>
              <p className="text-sm max-w-[200px]">
                Click on a category from the hierarchy to view its details and manage it.
              </p>
            </div>
          )}
          {selectedError && (
            <div className="m-6 p-4 rounded-lg bg-destructive/10 text-sm text-destructive flex items-center gap-2 border border-destructive/20">
              <AlertCircle className="h-5 w-5 shrink-0" /> {selectedError}
            </div>
          )}
        </div>
      </div>
      <EditModal
        open={!!editId}
        onClose={() => setEditId(null)}
        onSubmit={saveEdit}
        name={editName}
        slug={editSlug}
        parentId={editParentId}
        status={editStatus}
        setName={setEditName}
        setSlug={setEditSlug}
        setParentId={(v: string) => setEditParentId(v)}
        setStatus={(v: string) => setEditStatus(v)}
        items={items}
        saving={editSaving}
      />
      <DeleteModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        name={
          deleteId ? (items.find((c) => c.id === deleteId)?.name ?? "") : ""
        }
        deleting={deleting}
      />
    </div>
  );
}

function RootDropZone() {
  const { setNodeRef, isOver } = useDroppable({ id: "ROOT" });
  return (
    <div
      ref={setNodeRef}
      className={`mb-4 flex items-center justify-between rounded-xl border-2 border-dashed px-4 py-3 text-sm transition-all duration-200 ${isOver ? "bg-primary/5 border-primary/50 text-primary" : "bg-muted/30 border-muted-foreground/20 text-muted-foreground"}`}
    >
      <div className="flex items-center gap-2 font-medium">
        <Layers className="h-4 w-4" />
        Top Level
      </div>
      <span>Drop here to make a root category</span>
    </div>
  );
}

function CategoryNode({
  node,
  getChildren,
  onOpen,
  onAddClick,
  onEditClick,
  onDeleteClick,
  currentAddId,
  subName,
  subSlug,
  setSubName,
  setSubSlug,
  onCreateSub,
  subCreating,
  selectedId,
}: {
  node: CategoryBase;
  getChildren: (id: string) => CategoryBase[];
  onOpen: (id: string) => void;
  onAddClick: (id: string) => void;
  onEditClick: (id: string) => void;
  onDeleteClick: (id: string) => void;
  currentAddId: string | null;
  subName: string;
  subSlug: string;
  setSubName: (v: string) => void;
  setSubSlug: (v: string) => void;
  onCreateSub: (id: string) => void;
  subCreating: boolean;
  selectedId?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const children = getChildren(node.id);
  const hasChildren = children.length > 0;
  const addOpen = currentAddId === node.id;
  const isActive = selectedId === node.id;
  
  useEffect(() => {
    if (isActive || addOpen) {
      setExpanded(true);
    }
  }, [isActive, addOpen]);

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({ id: node.id });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: node.id });
  const style = transform
    ? { transform: CSS.Transform.toString(transform), zIndex: 50 }
    : undefined;
    
  return (
    <li
      ref={setDropRef}
      className={`group rounded-xl transition-all duration-200 ${isOver ? "bg-primary/5 ring-2 ring-primary/30" : ""}`}
    >
      <div
        ref={setDragRef}
        style={style}
        className={`flex items-center gap-2 py-2 px-2 rounded-lg transition-colors border border-transparent ${
          isActive 
            ? "bg-primary/5 border-primary/20 shadow-sm" 
            : "hover:bg-muted/50"
        } ${isDragging ? "opacity-50 scale-[0.98] shadow-md bg-background border-border" : ""}`}
      >
        <div
          className="flex items-center justify-center h-8 w-6 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground transition-colors shrink-0"
          {...listeners}
          {...attributes}
        >
          <GripVertical className="h-4 w-4" />
        </div>

        <button
          className={`flex items-center justify-center h-7 w-7 rounded-md transition-colors shrink-0 ${hasChildren ? "hover:bg-accent text-foreground" : "opacity-0 cursor-default"}`}
          onClick={() => hasChildren && setExpanded((v) => !v)}
          disabled={!hasChildren}
        >
          <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${expanded ? "rotate-90" : ""}`} />
        </button>

        <div className={`flex items-center justify-center h-8 w-8 rounded-lg shrink-0 transition-colors ${isActive ? "bg-primary text-primary-foreground shadow-sm" : "bg-primary/10 text-primary"}`}>
          <Folder className="h-4 w-4" />
        </div>

        <button
          className={`text-left font-medium text-sm transition-colors truncate max-w-[150px] sm:max-w-[250px] ${isActive ? "text-primary" : "hover:text-primary"}`}
          onClick={() => onOpen(node.id)}
        >
          {node.name}
        </button>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          <Badge className="text-xs font-normal bg-muted/50 text-muted-foreground border-transparent hover:bg-muted/70">
            {node.productCount} items
          </Badge>
        </div>

        <div className={`flex items-center transition-opacity ml-1 gap-0.5 shrink-0 ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
            onClick={() => onAddClick(node.id)}
            title="Add Subcategory"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-blue-500/10 hover:text-blue-500"
            onClick={() => onEditClick(node.id)}
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDeleteClick(node.id)}
            title="Delete"
          >
            <Trash className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {addOpen && (
        <div className="ml-14 my-3 mr-2 p-4 rounded-xl border bg-muted/30 shadow-inner animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
            <Plus className="h-4 w-4" /> Add Subcategory to {node.name}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-5">
              <Input
                value={subName}
                onChange={(e) => setSubName(e.target.value)}
                placeholder="Subcategory name"
                className="bg-background shadow-sm h-10"
                autoFocus
              />
            </div>
            <div className="sm:col-span-4">
              <Input
                value={subSlug}
                onChange={(e) => setSubSlug(e.target.value)}
                placeholder="Slug (optional)"
                className="bg-background shadow-sm h-10"
              />
            </div>
            <div className="sm:col-span-3 flex gap-2">
              <Button
                variant="outline"
                className="h-10 px-3 shrink-0"
                onClick={() => onAddClick(node.id)}
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                className="h-10 flex-1 shadow-sm"
                onClick={() => onCreateSub(node.id)}
                disabled={subCreating || !subName}
              >
                {subCreating ? <RefreshCcw className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {expanded && hasChildren && (
        <div className="ml-7 mt-1 border-l-2 border-muted/50 pl-3 animate-in fade-in duration-300">
          <ul className="space-y-1.5">
            {children.map((c) => (
              <CategoryNode
                key={c.id}
                node={c}
                getChildren={getChildren}
                onOpen={onOpen}
                onAddClick={onAddClick}
                onEditClick={onEditClick}
                onDeleteClick={onDeleteClick}
                currentAddId={currentAddId}
                subName={subName}
                subSlug={subSlug}
                setSubName={setSubName}
                setSubSlug={setSubSlug}
                onCreateSub={onCreateSub}
                subCreating={subCreating}
                selectedId={selectedId}
              />
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

// Edit Modal
function EditModal({
  open,
  onClose,
  onSubmit,
  name,
  slug,
  parentId,
  status,
  setName,
  setSlug,
  setParentId,
  setStatus,
  items,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  name: string;
  slug: string;
  parentId: string | "" | null;
  status: string;
  setName: (v: string) => void;
  setSlug: (v: string) => void;
  setParentId: (v: string) => void;
  setStatus: (v: string) => void;
  items: CategoryBase[];
  saving: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[95%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card p-6 shadow-xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-semibold tracking-tight">Edit Category</h3>
          <button
            className="rounded-full hover:bg-muted p-2 transition-colors"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Slug (optional)</Label>
            <Input 
              value={slug} 
              onChange={(e) => setSlug(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Parent</Label>
            <select
              value={parentId ?? ""}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 h-11 text-sm shadow-sm"
            >
              <option value="">— Top level —</option>
              {items.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Status</Label>
            <select
              value={status ?? ""}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 h-11 text-sm shadow-sm"
            >
              <option value="">— Select —</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="h-11 px-6">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="h-11 px-6 shadow-sm">
              {saving ? <RefreshCcw className="h-4 w-4 animate-spin" /> : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Delete Modal
function DeleteModal({
  open,
  onClose,
  onConfirm,
  name,
  deleting,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  name: string;
  deleting: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[95%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card p-6 shadow-xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-semibold tracking-tight text-destructive flex items-center gap-2">
            <AlertCircle className="h-5 w-5" /> Delete Category
          </h3>
          <button
            className="rounded-full hover:bg-muted p-2 transition-colors"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 text-sm mt-4">
          <p className="text-base text-muted-foreground">
            Are you sure you want to delete <span className="font-semibold text-foreground">{name || "this category"}</span>?
          </p>
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-destructive">
            <p className="font-semibold mb-2">Cascade warnings:</p>
            <ul className="list-disc pl-5 space-y-1 text-destructive/90">
              <li>All subcategories will be deleted.</li>
              <li>All associated products and their images will be deleted.</li>
            </ul>
            <p className="mt-3 text-xs opacity-80">
              This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="h-11 px-6">
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onConfirm}
              disabled={deleting}
              className="h-11 px-6 shadow-sm"
            >
              {deleting ? <RefreshCcw className="h-4 w-4 animate-spin mr-2" /> : null}
              {deleting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
