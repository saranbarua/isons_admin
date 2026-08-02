import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  PanelLeftClose,
  FolderTree,
  Package,
  Activity,
  Users,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { useAuthStore } from "../../store/auth";
import logo from "../../assets/logo.png";

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const role = useAuthStore((s) => s.role);
  const username = useAuthStore((s) => s.username);

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 overflow-hidden",
      isActive
        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
        : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
    );

  return (
    <div
      className={cn(
        // Always fixed on the left
        "fixed inset-y-0 left-0 z-40 w-72 bg-card/95 backdrop-blur-xl border-r shadow-sm",
        // Mobile slide-in/out
        open ? "translate-x-0" : "-translate-x-full",
        // Desktop: visible by default
        "md:translate-x-0",
        // Enable smooth transitions
        "transform transition-transform duration-300 ease-in-out flex flex-col",
      )}
    >
      <div className="flex h-20 shrink-0 items-center justify-between px-6 border-b border-border/50">
        <div className="flex items-center gap-2">
          <img src={logo} alt="TSE Admin" className="h-10 object-contain drop-shadow-sm" />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden hover:bg-secondary rounded-full"
          aria-label="Close sidebar"
          onClick={onClose}
        >
          <PanelLeftClose className="h-5 w-5 text-muted-foreground" />
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto py-6 px-4 no-scrollbar">
        <div className="mb-4 px-2">
          <p className="text-xs font-semibold tracking-wider text-muted-foreground/70 uppercase">Main Menu</p>
        </div>
        <nav className="space-y-1.5">
          {role === "ADMIN" && (
            <NavLink to="/dashboard" className={navItemClass} end>
              {({ isActive }) => (
                <>
                  <div className={cn("absolute left-0 top-1/2 -translate-y-1/2 h-full w-1 bg-accent rounded-r-md transition-all duration-300", isActive ? "opacity-100" : "opacity-0")} />
                  <LayoutDashboard className={cn("h-5 w-5 transition-transform duration-200", isActive ? "scale-110" : "group-hover:scale-110")} />
                  <span className="relative z-10">Dashboard</span>
                </>
              )}
            </NavLink>
          )}
          
          <NavLink to="/categories" className={navItemClass}>
            {({ isActive }) => (
              <>
                <div className={cn("absolute left-0 top-1/2 -translate-y-1/2 h-full w-1 bg-accent rounded-r-md transition-all duration-300", isActive ? "opacity-100" : "opacity-0")} />
                <FolderTree className={cn("h-5 w-5 transition-transform duration-200", isActive ? "scale-110" : "group-hover:scale-110")} />
                <span className="relative z-10">Categories</span>
              </>
            )}
          </NavLink>
          
          <NavLink to="/products" className={navItemClass}>
            {({ isActive }) => (
              <>
                <div className={cn("absolute left-0 top-1/2 -translate-y-1/2 h-full w-1 bg-accent rounded-r-md transition-all duration-300", isActive ? "opacity-100" : "opacity-0")} />
                <Package className={cn("h-5 w-5 transition-transform duration-200", isActive ? "scale-110" : "group-hover:scale-110")} />
                <span className="relative z-10">Products</span>
              </>
            )}
          </NavLink>
        </nav>

        {role === "ADMIN" && (
          <div className="mt-8 mb-4 px-2">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground/70 uppercase">Administration</p>
          </div>
        )}
        <nav className="space-y-1.5">
          {role === "ADMIN" && (
            <NavLink to="/users" className={navItemClass}>
              {({ isActive }) => (
                <>
                  <div className={cn("absolute left-0 top-1/2 -translate-y-1/2 h-full w-1 bg-accent rounded-r-md transition-all duration-300", isActive ? "opacity-100" : "opacity-0")} />
                  <Users className={cn("h-5 w-5 transition-transform duration-200", isActive ? "scale-110" : "group-hover:scale-110")} />
                  <span className="relative z-10">Users</span>
                </>
              )}
            </NavLink>
          )}
          {role === "ADMIN" && (
            <NavLink to="/audit-logs" className={navItemClass}>
              {({ isActive }) => (
                <>
                  <div className={cn("absolute left-0 top-1/2 -translate-y-1/2 h-full w-1 bg-accent rounded-r-md transition-all duration-300", isActive ? "opacity-100" : "opacity-0")} />
                  <Activity className={cn("h-5 w-5 transition-transform duration-200", isActive ? "scale-110" : "group-hover:scale-110")} />
                  <span className="relative z-10">Audit Logs</span>
                </>
              )}
            </NavLink>
          )}
        </nav>
      </div>
      
      <div className="mt-auto border-t border-border/50 p-4">
        <div className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-secondary/80 transition-colors cursor-pointer">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {username?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{username ?? "User"}</span>
            <span className="text-xs text-muted-foreground">{role ?? "USER"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
