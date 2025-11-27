import { Home, Activity, BarChart3, Settings, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeItem?: string;
}

const menuItems = [
  { id: "home", icon: Home, label: "Home" },
  { id: "monitoring", icon: Activity, label: "Live Monitoring" },
  { id: "analytics", icon: BarChart3, label: "Analytics" },
  { id: "settings", icon: Settings, label: "Settings" },
  { id: "profile", icon: User, label: "User Profile" },
];

const Sidebar = ({ activeItem = "monitoring" }: SidebarProps) => {
  return (
    <aside className="w-64 bg-card border-r border-border/50 flex flex-col">
      <div className="p-6 border-b border-border/50">
        <h1 className="text-2xl font-bold text-primary text-glow">ATCS</h1>
        <p className="text-xs text-muted-foreground mt-1">Bandung Traffic Control</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeItem;
          return (
            <button
              key={item.id}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300",
                isActive
                  ? "bg-primary/10 text-primary border-l-4 border-primary glow-cyan"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border/50">
        <div className="bg-secondary rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">Admin User</p>
              <p className="text-xs text-muted-foreground truncate">admin@bandung.go.id</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
