import { Link, useLocation } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { RoleSurfaceConfig } from "@/lib/roleSurface";

interface AppSidebarProps {
  surface: RoleSurfaceConfig;
}

function isActivePath(pathname: string, path: string) {
  return pathname === path || (path !== "/dashboard" && pathname.startsWith(path + "/"));
}

function AppSidebarNav({
  surface,
}: {
  surface: RoleSurfaceConfig;
}) {
  const location = useLocation();
  const { setOpenMobile } = useSidebar();
  const mainNav = surface.nav.filter((item) => item.group !== "beheer");
  const beheerNav = surface.nav.filter((item) => item.group === "beheer");

  const renderItems = (items: typeof surface.nav) =>
    items.map((item) => {
      const Icon = item.icon;
      const active = isActivePath(location.pathname, item.path);

      return (
        <SidebarMenuItem key={item.path} className="app-nav-item motion-safe:animate-shell-in">
          <SidebarMenuButton
            asChild
            isActive={active}
            tooltip={item.label}
            className={cn(
              "min-h-11 rounded-xl text-sidebar-foreground/72 transition-all duration-200 hover:translate-x-0.5 hover:bg-white/10 hover:text-white data-[active=true]:bg-white data-[active=true]:text-digidromen-dark",
              active && "shadow-sm",
            )}
          >
            <Link to={item.path} onClick={() => setOpenMobile(false)}>
              <Icon strokeWidth={active ? 2.4 : 1.9} />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>{renderItems(mainNav)}</SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {beheerNav.length > 0 ? (
        <>
          <SidebarSeparator className="bg-white/10" />
          <SidebarGroup>
            <SidebarGroupLabel className="px-2 text-[11px] uppercase tracking-[0.14em] text-white/40">
              Beheer
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(beheerNav)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </>
      ) : null}
    </>
  );
}

export function AppSidebar({ surface }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="gap-4 p-4">
        <Link to="/dashboard" className="motion-safe:animate-shell-in flex min-h-12 items-center gap-3 rounded-xl px-1">
          <span className="flex h-10 w-[4.5rem] shrink-0 items-center justify-center rounded-lg bg-white px-2 shadow-sm transition-transform duration-300 hover:scale-[1.02] group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:px-1">
            <img
              src="/Digidromen logo.png"
              alt="Digidromen"
              className="max-h-7 w-full object-contain group-data-[collapsible=icon]:max-h-6"
            />
          </span>
          <span className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="block font-heading text-sm font-semibold leading-tight text-white">
              Digidromen
            </span>
            <span className="block text-xs text-white/48">{surface.homeLabel}</span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <AppSidebarNav surface={surface} />
      </SidebarContent>
    </Sidebar>
  );
}
