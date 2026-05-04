import React, { useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  LogOut,
  Menu,
  X,
} from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { getSupabaseClient } from "../lib/supabase";
import { queryKeys } from "../lib/queryKeys";
import { getSurface, getPageTitle, roleLabels } from "../lib/roleSurface";
import type { Role } from "../types";

const Layout: React.FC = () => {
  const { user, logout, supabaseConfigured } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const role: Role = user?.role ?? "help_org";
  const surface = useMemo(() => getSurface(role), [role]);

  const mainNav = useMemo(
    () => surface.nav.filter((item) => item.group !== "beheer"),
    [surface],
  );
  const beheerNav = useMemo(
    () => surface.nav.filter((item) => item.group === "beheer"),
    [surface],
  );

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

  const pageTitle = getPageTitle(role, location.pathname);

  return (
    <div className="flex min-h-screen bg-digidromen-warm">
      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-20 bg-digidromen-dark/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-30 w-[17rem] bg-digidromen-dark transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <img
              src="/Digidromen logo.png"
              alt="Digidromen"
              className="h-10 w-auto rounded-md bg-digidromen-warm object-contain px-2 py-1"
            />
          </div>
          <button
            aria-label="Sidebar sluiten"
            className="text-white/60 hover:text-white lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="mx-4 mb-4 rounded-xl bg-white/8 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-digidromen-primary">
            {roleLabels[role]}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-white">{user?.name}</p>
          <p className="text-xs text-white/40">{user?.email}</p>
        </div>

        <nav className="space-y-0.5 overflow-y-auto px-3 pb-16">
          {mainNav.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== "/dashboard" && location.pathname.startsWith(item.path));

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex min-h-[44px] items-center rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all ${
                  isActive
                    ? "bg-digidromen-primary text-digidromen-dark"
                    : "text-white/60 hover:bg-white/8 hover:text-white"
                }`}
              >
                <Icon size={17} className="mr-3" strokeWidth={isActive ? 2.5 : 1.8} />
                {item.label}
              </Link>
            );
          })}

          {beheerNav.length > 0 && (
            <>
              <div className="px-3 pb-1 pt-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30">
                  Beheer
                </p>
              </div>
              {beheerNav.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.path ||
                  location.pathname.startsWith(item.path + "/");

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex min-h-[44px] items-center rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all ${
                      isActive
                        ? "bg-digidromen-primary text-digidromen-dark"
                        : "text-white/60 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    <Icon size={17} className="mr-3" strokeWidth={isActive ? 2.5 : 1.8} />
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-white/8 p-4">
          <p className="text-[10px] text-white/30">{statusCopy}</p>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-digidromen-cream bg-digidromen-warm/95 px-4 py-3 backdrop-blur lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                aria-label="Menu openen"
                className="rounded-lg p-2 text-digidromen-dark/50 hover:bg-digidromen-cream lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu size={20} />
              </button>
              <div>
                <h1 className="font-heading text-lg font-bold text-digidromen-dark">
                  {pageTitle}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="rounded-full border border-digidromen-cream bg-white px-3 py-1.5 text-xs font-semibold text-digidromen-dark">
                {user ? roleLabels[user.role] : "-"}
              </div>

              <button
                aria-label="Notificaties"
                onClick={() => navigate("/dashboard")}
                className="relative rounded-full border border-digidromen-cream bg-white p-2 text-digidromen-dark/50 hover:text-digidromen-dark"
              >
                <Bell size={17} />
                {unreadCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-digidromen-primary text-[9px] font-bold text-digidromen-dark">
                    {unreadCount}
                  </span>
                ) : null}
              </button>

              <button
                aria-label="Uitloggen"
                onClick={async () => {
                  await logout();
                  navigate("/login");
                }}
                className="rounded-full border border-digidromen-cream bg-white p-2 text-digidromen-dark/50 hover:text-digidromen-dark"
              >
                <LogOut size={17} />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
