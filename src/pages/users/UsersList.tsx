import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import { ConfirmModal } from "../../components/ui/confirm-modal";
import { useToast } from "../../components/ui/toast";
import { useDebounce } from "../../lib/hooks/useDebounce";
import {
  listUsers,
  createUser,
  updateUser,
  setUserPassword,
  deleteUser,
  type UserItem,
  type UserListResponse,
  type UserRole,
  type UserStatus,
  type UserCreateInput,
  type UserUpdateInput,
} from "../../lib/api";
import { Plus, RefreshCcw, Pencil, Key, Trash } from "lucide-react";

export default function UsersList() {
  const [items, setItems] = useState<UserItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "">("");
  const [limit, setLimit] = useState<number>(50);
  const [offset, setOffset] = useState<number>(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<UserItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [passwordItem, setPasswordItem] = useState<UserItem | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<UserItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const data: UserListResponse = await listUsers({
        search: debouncedSearch || undefined,
        role: (roleFilter || undefined) as UserRole | undefined,
        status: (statusFilter || undefined) as UserStatus | undefined,
        limit,
        offset,
      });
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setOffset(0);
  }, [debouncedSearch, roleFilter, statusFilter, limit]);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, roleFilter, statusFilter, limit, offset]);

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

  async function handleDelete() {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await deleteUser(deleteItem.id);
      setDeleteItem(null);
      addToast("User deleted", "success");
      fetchUsers();
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Failed to delete user",
        "error",
      );
    } finally {
      setDeleting(false);
    }
  }

  const { addToast } = useToast();

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Users
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">
            Manage admin and moderator user accounts.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="outline"
            onClick={fetchUsers}
            disabled={loading}
            className="h-10 px-4 rounded-full shadow-sm hover:shadow transition-all bg-background"
          >
            <RefreshCcw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />{" "}
            Refresh
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            className="h-10 px-5 rounded-full shadow-md hover:shadow transition-all"
          >
            <Plus className="mr-2 h-4 w-4" /> New User
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <div className="md:col-span-4 space-y-2">
            <Label className="text-sm font-medium">Search</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Username or name..."
              className="h-10 shadow-sm focus-visible:ring-primary"
            />
          </div>
          <div className="md:col-span-3 space-y-2">
            <Label className="text-sm font-medium">Role</Label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as UserRole | "")}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
            >
              <option value="">— Any —</option>
              <option value="ADMIN">ADMIN</option>
              <option value="MODERATOR">MODERATOR</option>
            </select>
          </div>
          <div className="md:col-span-3 space-y-2">
            <Label className="text-sm font-medium">Status</Label>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as UserStatus | "")
              }
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
            >
              <option value="">— Any —</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
          <div className="md:col-span-2 space-y-2 mt-4 md:mt-0">
            <Label className="text-sm font-medium hidden md:block">&nbsp;</Label>
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

      {/* Table */}
      <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="border-b text-muted-foreground text-xs uppercase tracking-wider font-semibold">
              <th className="px-3 py-2 text-left">Username</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Role</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Created</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="px-3 py-2">
                    <Skeleton className="h-6 w-40" />
                  </td>
                  <td className="px-3 py-2">
                    <Skeleton className="h-6 w-32" />
                  </td>
                  <td className="px-3 py-2">
                    <Skeleton className="h-6 w-20" />
                  </td>
                  <td className="px-3 py-2">
                    <Skeleton className="h-6 w-16" />
                  </td>
                  <td className="px-3 py-2">
                    <Skeleton className="h-6 w-28" />
                  </td>
                  <td className="px-3 py-2">
                    <Skeleton className="h-6 w-24" />
                  </td>
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td
                  className="px-3 py-6 text-center text-muted-foreground"
                  colSpan={6}
                >
                  No users match your filters.
                </td>
              </tr>
            ) : (
              items.map((u) => (
                <tr key={u.id} className="border-b hover:bg-accent/40">
                  <td className="px-3 py-3 font-medium text-foreground">
                    {u.username}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {u.name ?? <span className="italic">—</span>}
                  </td>
                  <td className="px-3 py-3">
                    <Badge
                      className={
                        u.role === "ADMIN"
                          ? "bg-blue-500 text-white"
                          : "bg-muted"
                      }
                    >
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    <Badge
                      className={
                        u.status === "ACTIVE" ? "bg-green-500" : "bg-muted"
                      }
                    >
                      {u.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {new Date(u.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditItem(u);
                          setEditOpen(true);
                        }}
                        aria-label={`Edit ${u.username}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setPasswordItem(u);
                          setPasswordOpen(true);
                        }}
                        aria-label={`Set password for ${u.username}`}
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteItem(u)}
                        aria-label={`Delete ${u.username}`}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
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

      {/* Modals */}
      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          fetchUsers();
        }}
      />

      <EditUserModal
        open={editOpen}
        item={editItem}
        onClose={() => {
          setEditOpen(false);
          setEditItem(null);
        }}
        onUpdated={() => {
          setEditOpen(false);
          setEditItem(null);
          fetchUsers();
        }}
      />

      <SetPasswordModal
        open={passwordOpen}
        item={passwordItem}
        onClose={() => {
          setPasswordOpen(false);
          setPasswordItem(null);
        }}
      />

      <ConfirmModal
        open={!!deleteItem}
        title="Delete User"
        message={`Are you sure you want to delete "${deleteItem?.username}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteItem(null)}
      />
    </div>
  );
}

function CreateUserModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("MODERATOR");
  const [status, setStatus] = useState<UserStatus>("ACTIVE");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { addToast } = useToast();

  useEffect(() => {
    if (open) {
      setUsername("");
      setPassword("");
      setName("");
      setRole("MODERATOR");
      setStatus("ACTIVE");
      setError(null);
      setFieldErrors({});
    }
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      const errs: Record<string, string> = {};
      if (!username.trim()) errs.username = "Username is required";
      if (!password) errs.password = "Password is required";
      else if (password.length < 6)
        errs.password = "Password must be at least 6 characters";
      if (Object.keys(errs).length) {
        setFieldErrors(errs);
        setSaving(false);
        return;
      }

      const payload: UserCreateInput = {
        username: username.trim(),
        password,
        role,
        status,
      };
      if (name.trim()) payload.name = name.trim();
      await createUser(payload);
      addToast("User created", "success");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-[90%] max-w-md rounded-xl border bg-card shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="text-base font-semibold">New User</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Create a new admin or moderator account
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        <form onSubmit={onSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <Label>
              Username <span className="text-destructive">*</span>
            </Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. john_doe"
              required
            />
            {fieldErrors.username && (
              <div className="text-xs text-destructive">
                {fieldErrors.username}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>
              Password <span className="text-destructive">*</span>
            </Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              required
            />
            {fieldErrors.password && (
              <div className="text-xs text-destructive">
                {fieldErrors.password}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>
              Name{" "}
              <span className="text-muted-foreground text-xs font-normal">
                (optional)
              </span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Display name"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="ADMIN">ADMIN</option>
                <option value="MODERATOR">MODERATOR</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as UserStatus)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditUserModal({
  open,
  item,
  onClose,
  onUpdated,
}: {
  open: boolean;
  item: UserItem | null;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("MODERATOR");
  const [status, setStatus] = useState<UserStatus>("ACTIVE");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { addToast } = useToast();

  useEffect(() => {
    if (open && item) {
      setUsername(item.username);
      setName(item.name ?? "");
      setRole(item.role);
      setStatus(item.status);
      setError(null);
      setFieldErrors({});
    }
  }, [open, item]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      const errs: Record<string, string> = {};
      if (!username.trim()) errs.username = "Username is required";
      if (Object.keys(errs).length) {
        setFieldErrors(errs);
        setSaving(false);
        return;
      }

      const payload: UserUpdateInput = {};
      if (username.trim() !== item.username) payload.username = username.trim();
      const newName = name.trim() || undefined;
      if (newName !== (item.name ?? undefined)) payload.name = newName;
      if (role !== item.role) payload.role = role;
      if (status !== item.status) payload.status = status;
      await updateUser(item.id, payload);
      addToast("User updated", "success");
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setSaving(false);
    }
  }

  if (!open || !item) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-[90%] max-w-md rounded-xl border bg-card shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="text-base font-semibold">Edit User</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Update account details for {item.username}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        <form onSubmit={onSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <Label>
              Username <span className="text-destructive">*</span>
            </Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            {fieldErrors.username && (
              <div className="text-xs text-destructive">
                {fieldErrors.username}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>
              Name{" "}
              <span className="text-muted-foreground text-xs font-normal">
                (optional)
              </span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Display name"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="ADMIN">ADMIN</option>
                <option value="MODERATOR">MODERATOR</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as UserStatus)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
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

function SetPasswordModal({
  open,
  item,
  onClose,
}: {
  open: boolean;
  item: UserItem | null;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { addToast } = useToast();

  useEffect(() => {
    if (open) {
      setPassword("");
      setError(null);
      setFieldErrors({});
    }
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      const errs: Record<string, string> = {};
      if (!password) errs.password = "Password is required";
      else if (password.length < 6)
        errs.password = "Password must be at least 6 characters";
      if (Object.keys(errs).length) {
        setFieldErrors(errs);
        setSaving(false);
        return;
      }

      await setUserPassword(item.id, password);
      addToast("Password updated", "success");
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to set password",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!open || !item) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-[90%] max-w-md rounded-xl border bg-card shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="text-base font-semibold">Set Password</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Change password for {item.username}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        <form onSubmit={onSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <Label>
              New Password <span className="text-destructive">*</span>
            </Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              autoFocus
              required
            />
            {fieldErrors.password && (
              <div className="text-xs text-destructive">
                {fieldErrors.password}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Set Password"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
