import { useEffect, useState } from "react";
import {
  Users,
  FolderTree,
  Package,
  Star,
  Activity,
} from "lucide-react";
import { getDashboard, type DashboardData } from "../lib/api";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import { cn } from "../lib/utils";

const REVIEW_BADGE: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  APPROVED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  REJECTED: "bg-red-500/10 text-red-600 border-red-500/20",
};

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm flex items-center gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}

function BarChart({
  data,
  maxLabelLen = 18,
}: {
  data: { label: string; count: number }[];
  maxLabelLen?: number;
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3 text-sm">
          <span className="w-32 shrink-0 truncate text-muted-foreground text-right">
            {d.label.length > maxLabelLen
              ? d.label.slice(0, maxLabelLen) + "…"
              : d.label}
          </span>
          <div className="flex-1 h-5 rounded bg-muted/40 overflow-hidden">
            <div
              className={cn(
                "h-full rounded bg-primary/70 transition-all duration-500",
              )}
              style={{ width: `${(d.count / max) * 100}%` }}
            />
          </div>
          <span className="w-10 text-right font-medium tabular-nums">
            {d.count}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDashboard()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load dashboard");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="p-8 space-y-8">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-6 py-4 text-center">
          <p className="text-destructive font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary, users, products, reviews, recentActivity } = data;

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <SummaryCard icon={Users} label="Users" value={summary.totalUsers} />
        <SummaryCard
          icon={FolderTree}
          label="Categories"
          value={summary.totalCategories}
        />
        <SummaryCard
          icon={Package}
          label="Products"
          value={summary.totalProducts}
        />
        <SummaryCard
          icon={Star}
          label="Reviews"
          value={summary.totalReviews}
        />
        <SummaryCard
          icon={Activity}
          label="Audit Logs"
          value={summary.totalAuditLogs}
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Users by role */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <h2 className="font-semibold">Users by Role</h2>
          <BarChart
            data={users.byRole.map((r) => ({
              label: r.role,
              count: r.count,
            }))}
          />
        </div>

        {/* Users by status */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <h2 className="font-semibold">Users by Status</h2>
          <BarChart
            data={users.byStatus.map((s) => ({
              label: s.status,
              count: s.count,
            }))}
          />
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Products by category */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <h2 className="font-semibold">Products by Category</h2>
          {products.byCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data</p>
          ) : (
            <BarChart
              data={products.byCategory.map((c) => ({
                label: c.category,
                count: c.count,
              }))}
            />
          )}
        </div>

        {/* Reviews by status */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <h2 className="font-semibold">Reviews by Status</h2>
          <BarChart
            data={reviews.byStatus.map((s) => ({
              label: s.status,
              count: s.count,
            }))}
          />
        </div>
      </div>

      {/* Charts row 3 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Stock & Price summary */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <h2 className="font-semibold">Product Stock &amp; Price</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">Total Stock</p>
              <p className="text-xl font-bold">{products.stock.total.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Avg Stock</p>
              <p className="text-xl font-bold">{products.stock.average.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Avg Price</p>
              <p className="text-xl font-bold">৳{products.price.average.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Price Range</p>
              <p className="text-xl font-bold">
                ৳{products.price.min.toLocaleString()} – ৳{products.price.max.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent audit logs */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold">Recent Audit Logs</h2>
          </div>
          <div className="divide-y max-h-96 overflow-y-auto">
            {recentActivity.auditLogs.length === 0 && (
              <p className="p-5 text-sm text-muted-foreground">No recent activity</p>
            )}
            {recentActivity.auditLogs.map((log) => (
              <div key={log.id} className="px-5 py-3 text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    {log.action}
                  </Badge>
                  <span className="text-muted-foreground">{log.entity}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  by {log.performedBy?.name ?? log.performedBy?.username ?? "Unknown"} ·{" "}
                  {formatDate(log.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent reviews */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold">Recent Reviews</h2>
          </div>
          <div className="divide-y max-h-96 overflow-y-auto">
            {recentActivity.reviews.length === 0 && (
              <p className="p-5 text-sm text-muted-foreground">No recent reviews</p>
            )}
            {recentActivity.reviews.map((rev) => (
              <div key={rev.id} className="px-5 py-3 text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{rev.clientName}</span>
                  <span className="text-amber-500">{"★".repeat(rev.rating)}</span>
                  <Badge className={cn(REVIEW_BADGE[rev.status])}>{rev.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {rev.product.name} · {formatDate(rev.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
