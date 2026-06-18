import { useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { AppSidebar } from "@/components/app/AppSidebar";
import { AppTopbar } from "@/components/app/AppTopbar";
import { WebshopHeader } from "@/components/app/WebshopHeader";
import { CommandMenu } from "@/components/app/CommandMenu";
import { Toaster } from "@/components/ui/sonner";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";
import { getSupabaseClient } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { getPageTitle, getSurface } from "@/lib/roleSurface";
import type { Role } from "@/types";

export function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [commandOpen, setCommandOpen] = useState(false);

  const role: Role = user?.role ?? "help_org";
  const surface = useMemo(() => getSurface(role), [role]);
  const pageTitle = getPageTitle(role, location.pathname);
  const canReadNotifications = role === "digidromen_admin" || role === "digidromen_staff";

  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: [...queryKeys.notifications.unread(), role],
    queryFn: async () => {
      const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
      const { data, error } = await getSupabaseClient()
        .from("notifications")
        .select("id")
        .gte("created_at", oneDayAgo);
      if (error) {
        console.warn("Notificaties konden niet worden geladen", error);
        return 0;
      }
      return data?.length ?? 0;
    },
    enabled: canReadNotifications,
    retry: false,
  });

  // Hulporganisatie (klant): lichte webshop-header, geen back-office-sidebar.
  if (role === "help_org") {
    return (
      <div className="min-h-dvh bg-background">
        <WebshopHeader
          role={role}
          surface={surface}
          userName={user?.name}
          userEmail={user?.email}
          onLogout={logout}
        />
        <main className="motion-safe:animate-content-in mx-auto max-w-6xl px-4 py-6 lg:px-8">
          <Outlet />
        </main>
        <Toaster position="top-right" richColors closeButton />
      </div>
    );
  }

  // Medewerker/beheerder: back-office met sidebar.
  return (
    <SidebarProvider>
      <AppSidebar surface={surface} />
      <SidebarInset>
        <AppTopbar
          pageTitle={pageTitle}
          role={role}
          userName={user?.name}
          userEmail={user?.email}
          unreadCount={unreadCount}
          onCommandOpen={() => setCommandOpen(true)}
          onLogout={logout}
        />
        <main className="motion-safe:animate-content-in flex-1 px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </SidebarInset>
      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} surface={surface} />
      <Toaster position="top-right" richColors closeButton />
    </SidebarProvider>
  );
}
