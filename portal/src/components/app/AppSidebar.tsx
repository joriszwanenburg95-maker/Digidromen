import { Link, useLocation } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { roleLabels, type RoleSurfaceConfig } from "@/lib/roleSurface";
import type { Role } from "@/types";

interface AppSidebarProps {
  role: Role;
  surface: RoleSurfaceConfig;
  userName?: string;
  userEmail?: string;
  statusCopy: string;
  supabaseConfigured: boolean;
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

export function AppSidebar({
  role,
  surface,
  userName,
  userEmail,
  statusCopy,
  supabaseConfigured,
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="gap-4 p-4">
        <Link to="/dashboard" className="motion-safe:animate-shell-in flex min-h-12 items-center gap-3 rounded-xl px-1">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm transition-transform duration-300 hover:scale-[1.03]">
            <img
              src="/Digidromen logo.png"
              alt="Digidromen"
              className="h-8 w-auto object-contain"
            />
          </span>
          <span className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="block font-heading text-sm font-semibold leading-tight text-white">
              Digidromen
            </span>
            <span className="block text-xs text-white/48">{surface.homeLabel}</span>
          </span>
        </Link>

        <div className="motion-safe:animate-shell-in rounded-xl border border-white/10 bg-white/8 px-3 py-3 group-data-[collapsible=icon]:hidden">
          <Badge className="bg-digidromen-yellow text-digidromen-dark hover:bg-digidromen-yellow">
            {roleLabels[role]}
          </Badge>
          <p className="mt-2 truncate text-sm font-semibold text-white">{userName ?? "Gebruiker"}</p>
          <p className="truncate text-xs text-white/45">{userEmail}</p>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <AppSidebarNav surface={surface} />
      </SidebarContent>

      <SidebarFooter className="p-4 group-data-[collapsible=icon]:items-center">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-[11px] text-white/48 transition-colors duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
          <CheckCircle2
            className={cn(
              "size-4 shrink-0",
              supabaseConfigured ? "text-digidromen-blue" : "text-digidromen-orange",
            )}
          />
          <span className="truncate group-data-[collapsible=icon]:hidden">{statusCopy}</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
