import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Sidebar } from "../components/layout/Sidebar";
import { Button } from "../components/ui/button";
import { Menu } from "lucide-react";
import { useAuthStore } from "../store/auth";
import logo from "../assets/logo.png";

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const username = useAuthStore((s) => s.username);
  const role = useAuthStore((s) => s.role);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 z-30 h-14 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-full items-center justify-between px-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Open sidebar"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <img src={logo} alt="TSE Admin" className="h-8 object-contain md:opacity-0" />
          <div className="flex items-center gap-3">
            <div className="text-sm">
              <div className="font-medium leading-none">
                {username ?? "User"}
              </div>
              {role && (
                <div className="text-xs text-muted-foreground">{role}</div>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => {
                logout();
                navigate("/login", { replace: true });
              }}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <Sidebar open={open} onClose={() => setOpen(false)} />

      {/* Page content (scrolls independently when overflowing) */}
      <main className="pt-14 md:pl-64 overflow-y-auto">
        <div className="p-4">
          <Outlet />
        </div>
      </main>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}
