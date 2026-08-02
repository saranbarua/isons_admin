import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/auth";

export default function AdminRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // Only MODERATOR are forbidden; ADMIN may pass
  if (role === "MODERATOR") return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
