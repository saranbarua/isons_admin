import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import { getAuditLogById, type AuditLogEntry } from "../../lib/api";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import { Button } from "../../components/ui/button";
import {
  ArrowLeft,
  AlertCircle,
  Shield,
  Clock,
  Hash,
  Activity,
} from "lucide-react";

export default function AuditLogDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.role);

  const [log, setLog] = useState<AuditLogEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOne() {
      if (!id) return;
      if (role === "MODERATOR") {
        setError("Forbidden");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await getAuditLogById(id, role!);
        setLog(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch log");
      } finally {
        setLoading(false);
      }
    }
    fetchOne();
  }, [id, role]);

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/audit-logs")}
            className="mb-2 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Audit Logs
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Audit Log Detail
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">
            Detailed view of a single audit log entry.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 col-span-2 w-48" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 col-span-2 w-32" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 col-span-2 w-24" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 col-span-2 w-40" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 col-span-2 w-36" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 col-span-2 w-40" />
          </div>
          <Skeleton className="h-32 w-full mt-4" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="text-destructive font-medium">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/audit-logs")}
              className="mt-2"
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> Back to Logs
            </Button>
          </div>
        </div>
      ) : !log ? (
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex flex-col items-center gap-3 py-8 text-center text-muted-foreground">
            <Activity className="h-10 w-10 opacity-50" />
            <p>No log found.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/audit-logs")}
              className="mt-2"
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> Back to Logs
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <div className="p-6 space-y-0">
            <DetailRow
              icon={<Hash className="h-4 w-4 text-muted-foreground" />}
              label="ID"
              value={log.id}
              mono
            />
            <DetailRow
              icon={<Activity className="h-4 w-4 text-muted-foreground" />}
              label="Action"
              value={
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  {log.action}
                </Badge>
              }
            />
            <DetailRow
              icon={<Activity className="h-4 w-4 text-muted-foreground" />}
              label="Entity"
              value={<Badge className="border-muted-foreground/30">{log.entity}</Badge>}
            />
            <DetailRow
              icon={<Hash className="h-4 w-4 text-muted-foreground" />}
              label="Entity ID"
              value={log.entityId}
              mono
            />
            <DetailRow
              icon={<Shield className="h-4 w-4 text-muted-foreground" />}
              label="Performed By"
              value={
                log.performedById ? (
                  <span className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-mono text-xs">{log.performedById}</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )
              }
            />
            <DetailRow
              icon={<Clock className="h-4 w-4 text-muted-foreground" />}
              label="Created At"
              value={new Date(log.createdAt).toLocaleString()}
              last
            />
          </div>

          {/* Changes */}
          <div className="border-t bg-muted/20 p-6">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">
                Changes
              </span>
            </div>
            <pre className="whitespace-pre-wrap rounded-xl border bg-card p-4 text-xs font-mono leading-relaxed shadow-sm">
              {log.changes}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  mono,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-3 gap-4 py-3 ${last ? "" : "border-b"}`}
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={`col-span-2 text-sm ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}
