import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Link2,
  BarChart3,
  Hash,
  Zap,
  Users,
  FileText,
  ListTodo,
  RefreshCw,
  Bot,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface Props {
  projectId: string;
}

const navItems = [
  { title: "Dashboard", url: "", icon: LayoutDashboard },
  { title: "GSC Connection", url: "/connect", icon: Link2 },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Keywords", url: "/keywords", icon: Hash },
  { title: "Page Speed", url: "/pagespeed", icon: Zap },
  { title: "Competitors", url: "/competitors", icon: Users },
  { title: "Content Briefs", url: "/briefs", icon: FileText },
  { title: "Tasks", url: "/tasks", icon: ListTodo },
  { title: "Auto Sync", url: "/sync", icon: RefreshCw },
  { title: "AI Assistant", url: "/ai", icon: Bot },
  { title: "Settings", url: "/settings", icon: Settings },
];

export const ProjectSidebar = ({ projectId }: Props) => {
  const { open } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    const fullPath = `/project/${projectId}${path}`;
    if (path === "") {
      return currentPath === fullPath;
    }
    return currentPath.startsWith(fullPath);
  };

  const getNavCls = (active: boolean) =>
    active
      ? "bg-primary/10 text-primary font-medium hover:bg-primary/15"
      : "hover:bg-muted";

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Project</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className={getNavCls(active)}>
                      <NavLink to={`/project/${projectId}${item.url}`} end={item.url === ""}>
                        <item.icon className="h-4 w-4" />
                        {open && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
