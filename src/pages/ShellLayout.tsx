import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import { LogOut, Settings, Sparkles, UserRound, Wrench, KeyRound, Home } from "lucide-react";

const navItems = [
  { to: "/builder", label: "Protocol Builder", icon: Sparkles },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/login", label: "Login", icon: KeyRound },
  { to: "/register", label: "Register", icon: UserRound },
];

function ShellLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  return (
    <div className="relative h-screen overflow-hidden bg-slate-950 text-foreground">
      <div className="glow" />
      <div className="relative z-10 flex h-full flex-col py-8 px-4 sm:px-6 lg:px-10">
        <div className="grid h-full min-h-0 gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="h-full min-h-0 overflow-auto rounded-2xl border border-white/5 bg-white/5 p-5 backdrop-blur-lg shadow-[0_20px_70px_-50px_rgba(15,23,42,0.9)]">
            <div className="flex items-center gap-3 pb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-slate-900 shadow-inner">
                <Home className="h-6 w-6 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-semibold">Sing-Box</span>
                <span className="text-sm font-semibold text-muted-foreground">Protocol to JSON</span>
              </div>
            </div>

            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;
                const hiddenForAuth = user && (item.to === "/login" || item.to === "/register");
                if (hiddenForAuth) return null;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-all",
                      isActive
                        ? "bg-primary/15 text-foreground border border-primary/40 shadow-sm"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground border border-transparent",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>

            <div className="mt-6 rounded-lg border border-border/60 bg-slate-900/50 p-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-primary" />
                  <span className="font-semibold">Quick actions</span>
                </div>
                <Badge variant="outline">beta</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Auth is optional. Log in to remember your form states and selections across sessions.
              </p>
              {user ? (
                <Button
                  variant="ghost"
                  className="mt-3 w-full gap-2 border border-border/60 bg-white/5"
                  onClick={() => logout()}
                >
                  <LogOut className="h-4 w-4" />
                  Logout ({user.username})
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  className="mt-3 w-full gap-2 border border-border/60 bg-white/5"
                  onClick={() => nav("/login")}
                >
                  <KeyRound className="h-4 w-4" />
                  Sign in to sync
                </Button>
              )}
            </div>
          </aside>

          <main className="min-h-0 overflow-auto pr-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export default ShellLayout;
