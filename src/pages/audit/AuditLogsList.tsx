import { useEffect, useState } from "react";
import { useAuthStore } from "../../store/auth";
import { listAuditLogs, type AuditLogEntry } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { RefreshCcw, AlertCircle, FileText, Shield } from "lucide-react";

export default function AuditLogsList() {
  const role = useAuthStore((s) => s.role);
  const navigate = useNavigate();

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [performedById, setPerformedById] = useState("");
  const [limit, setLimit] = useState<number>(50);
  const [offset, setOffset] = useState<number>(0);

  async function fetchLogs() {
    if (role === "MODERATOR") {
      setError("Forbidden");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listAuditLogs(
        { action, entity, performedById, limit, offset },
        role!,
      );
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Audit Logs
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">
            Track all administrative actions and changes across the system.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="outline"
            onClick={fetchLogs}
            disabled={loading}
            className="h-10 px-4 rounded-full shadow-sm hover:shadow transition-all bg-background"
          >
            <RefreshCcw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />{" "}
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Action</Label>
            <Input
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="CREATE_USER"
              className="h-10 shadow-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Entity</Label>
            <Input
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              placeholder="User"
              className="h-10 shadow-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Performed By (ID)</Label>
            <Input
              value={performedById}
              onChange={(e) => setPerformedById(e.target.value)}
              placeholder="UUID"
              className="h-10 shadow-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Limit</Label>
            <Input
              type="number"
              min={1}
              max={200}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="h-10 shadow-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Offset</Label>
            <Input
              type="number"
              min={0}
              value={offset}
              onChange={(e) => setOffset(Number(e.target.value))}
              className="h-10 shadow-sm"
            />
          </div>
        </div>
        <div className="mt-4">
          <Button
            onClick={fetchLogs}
            className="h-10 px-5 rounded-full shadow-sm hover:shadow transition-all"
          >
            Apply Filters
          </Button>
        </div>
        {error && (
          <div className="mt-3 text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="border-b text-muted-foreground text-xs uppercase tracking-wider font-semibold">
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Action</th>
              <th className="px-4 py-3 text-left">Entity</th>
              <th className="px-4 py-3 text-left">Entity ID</th>
              <th className="px-4 py-3 text-left">Performed By</th>
              <th className="px-4 py-3 text-left">Created At</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(8)].map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-4 py-3">
                      <Skeleton className="h-5 w-20" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-5 w-28" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-5 w-20" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-5 w-20" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-5 w-24" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-5 w-32" />
                    </td>
                  </tr>
                ))
              : logs.length === 0
                ? (
                    <tr>
                      <td
                        className="px-4 py-12 text-center text-muted-foreground"
                        colSpan={6}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="h-8 w-8 opacity-50" />
                          <p>No audit logs found.</p>
                        </div>
                      </td>
                    </tr>
                  )
                : (
                    logs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b hover:bg-accent/40 cursor-pointer transition-colors"
                        onClick={() => navigate(`/audit-logs/${log.id}`)}
                      >
                        <td className="px-4 py-3 font-mono text-xs">
                          {truncate(log.id)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className="bg-primary/10 text-primary border-primary/20">
                            {log.action}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className="border-muted-foreground/30">{log.entity}</Badge>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {truncate(log.entityId)}
                        </td>
                        <td className="px-4 py-3">
                          {log.performedById ? (
                            <span className="flex items-center gap-1.5">
                              <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-mono text-xs">
                                {truncate(log.performedById)}
                              </span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(log.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function truncate(s: string, n = 8) {
  if (s.length <= n) return s;
  return `${s.slice(0, n)}…`;
}
function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
