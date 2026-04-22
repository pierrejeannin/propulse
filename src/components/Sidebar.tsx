import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  Calculator,
  Package,
  Network,
  Presentation,
  Library,
  ChevronRight,
  Sun,
  Moon,
} from "lucide-react";

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

const mainNav: NavItem[] = [
  { label: "Pipeline", path: "/pipeline", icon: LayoutDashboard },
  { label: "Dossiers", path: "/dossiers", icon: FolderOpen },
  { label: "Comptes-rendus", path: "/comptes-rendus", icon: FileText },
  { label: "Chiffrage", path: "/chiffrage", icon: Calculator },
  { label: "Schémas", path: "/schemas", icon: Network },
  { label: "PowerPoint", path: "/powerpoint", icon: Presentation },
];

const globalNav: NavItem[] = [
  { label: "Catalogue articles", path: "/catalogue", icon: Package },
  { label: "Bibliothèque slides", path: "/bibliotheque", icon: Library },
];

function NavSection({ title, items }: { title?: string; items: NavItem[] }) {
  return (
    <div className="space-y-0.5">
      {title && (
        <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
          {title}
        </p>
      )}
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
              isActive
                ? "bg-sidebar-accent text-sidebar-primary shadow-sm"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )
          }
        >
          {({ isActive }) => (
            <>
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  isActive
                    ? "text-sidebar-primary"
                    : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80"
                )}
              />
              <span className="flex-1">{item.label}</span>
              {isActive && (
                <ChevronRight className="h-3 w-3 text-sidebar-primary/60" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
}

export default function Sidebar() {
  const { isDark, toggle } = useTheme();

  return (
    <aside className="flex h-full w-60 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sidebar-primary">
          <span className="text-sm font-bold text-white">P</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-sidebar-foreground">Propulse</p>
          <p className="text-[10px] text-sidebar-foreground/40">Avant-vente IT</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <NavSection items={mainNav} />
        <div className="my-4 h-px bg-sidebar-border" />
        <NavSection title="Données globales" items={globalNav} />
      </nav>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-sidebar-border px-4 py-3">
        <p className="text-[10px] text-sidebar-foreground/30">v0.1.0</p>

        <button
          type="button"
          onClick={toggle}
          title={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sidebar-foreground/40 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          {isDark ? (
            <Sun className="h-3.5 w-3.5" />
          ) : (
            <Moon className="h-3.5 w-3.5" />
          )}
          <span className="text-[10px] font-medium">
            {isDark ? "Clair" : "Sombre"}
          </span>
        </button>
      </div>
    </aside>
  );
}
