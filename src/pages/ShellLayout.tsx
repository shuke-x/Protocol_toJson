import { NavLink, Outlet, useLocation } from "react-router-dom";
import { cn } from "../lib/utils";
import { Sparkles, Home, Globe2 } from "lucide-react";

const navItems = [
  { to: "/builder", label: "Protocol Builder", icon: Sparkles },
  { to: "/dns", label: "DNS Router", icon: Globe2 },
];

function ShellLayout() {
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
