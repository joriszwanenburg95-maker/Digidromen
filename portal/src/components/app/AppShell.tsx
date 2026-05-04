import { useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { AppSidebar } from "@/components/app/AppSidebar";
import { AppTopbar } from "@/components/app/AppTopbar";
import { CommandMenu } from "@/components/app/CommandMenu";
import { Toaster } from "@/components/ui/sonner";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";
import { getSupabaseClient } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { getPageTitle, getSurface } from "@/lib/roleSurface";
import type { Role } from "@/types";

export function AppShell() {
  const { user, logout, supabaseConfigured } = useAuth();
  const location = useLocation();
  const [commandOpen, setCommandOpen] = useState(false);

  const role: Role = user?.role ?? "help_org";
  const surface = useMemo(() => getSurface(role), [role]);
  const pageTitle = getPageTitle(role, location.pathname);

  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: [...queryKeys.notifications.unread(), role],
    queryFn: async () => {
      const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
      const { data, error } = await getSupabaseClient()
        .from("notifications")
        .select("id")
        .gte("created_at", oneDayAgo);
      if (error) throw error;
      return data?.length ?? 0;
    },
    enabled: role !== "help_org",
  });

  const statusCopy = supabaseConfigured
    ? "Verbonden met Supabase"
    : "Supabase-configuratie ontbreekt";

  return (
    <SidebarProvider>
      <AppSidebar
        role={role}
        surface={surface}
        userName={user?.name}
        userEmail={user?.email}
        statusCopy={statusCopy}
        supabaseConfigured={supabaseConfigured}
      />
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
