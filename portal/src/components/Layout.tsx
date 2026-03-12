import React, { useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  Box,
  ChevronDown,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Settings,
  ShoppingCart,
  Wrench,
  X,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { statusClasses, usePortalContext } from "../lib/portal";
import type { Role } from "../types";

const sidebarLinks = [
  {
    name: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    roles: ["help_org", "digidromen_staff", "digidromen_admin", "service_partner"],
  },
  {
    name: "Bestellingen",
    path: "/orders",
    icon: ShoppingCart,
    roles: ["help_org", "digidromen_staff", "digidromen_admin", "service_partner"],
  },
  {
    name: "Reparaties",
    path: "/repairs",
    icon: Wrench,
    roles: ["help_org", "digidromen_staff", "digidromen_admin", "service_partner"],
  },
  {
    name: "Donaties",
    path: "/donations",
    icon: HeartHandshake,
    roles: ["digidromen_staff", "digidromen_admin", "service_partner"],
  },
  {
    name: "Voorraad",
    path: "/inventory",
    icon: Box,
    roles: ["digidromen_staff", "digidromen_admin", "service_partner"],
  },
  {
    name: "Rapportages",
    path: "/reports",
    icon: BarChart3,
    roles: ["help_org", "digidromen_staff", "digidromen_admin"],
  },
  {
    name: "CRM Sync",
    path: "/crm-sync",
    icon: RefreshCw,
    roles: ["digidromen_staff", "digidromen_admin"],
  },
  {
    name: "Instellingen",
    path: "/settings",
    icon: Settings,
    roles: ["digidromen_admin"],
  },
];

const roleLabels: Record<Role, string> = {
  help_org: "Hulporganisatie",
  digidromen_staff: "Medewerker",
  digidromen_admin: "Beheerder",
  service_partner: "Servicepartner",
};

const Layout: React.FC = () => {
  const { user, setRole, logout, authMode, supabaseConfigured } = useAuth();
  const { snapshot, notifications } = usePortalContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const filteredLinks = useMemo(
    () => sidebarLinks.filter((link) => user && link.roles.includes(user.role)),
    [user],
  );

  const unreadNotifications = notifications.filter(
    (notification) => notification.status === "unread",
  );

  const statusCopy =
    authMode === "supabase"
      ? "Verbonden met Supabase"
      : supabaseConfigured
        ? "Supabase vars gevonden; demo-modus"
        : "Demo modus";

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
            <img src="/Digidromen logo.png" alt="Digidromen" className="h-8 brightness-0 invert" />
          </div>
          <button className="text-white/60 hover:text-white lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="mx-4 mb-4 rounded-xl bg-white/8 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-digidromen-primary">
            {roleLabels[snapshot.role]}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-white">{user?.name}</p>
          <p className="text-xs text-white/40">{user?.email}</p>
        </div>

        <nav className="space-y-0.5 px-3">
          {filteredLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              location.pathname === link.path ||
              (link.path !== "/dashboard" && location.pathname.startsWith(link.path));

            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all ${
                  isActive
                    ? "bg-digidromen-primary text-digidromen-dark"
                    : "text-white/60 hover:bg-white/8 hover:text-white"
                }`}
              >
                <Icon size={17} className="mr-3" strokeWidth={isActive ? 2.5 : 1.8} />
                {link.name}
              </Link>
            );
          })}
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
                className="rounded-lg p-2 text-digidromen-dark/50 hover:bg-digidromen-cream lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu size={20} />
              </button>
              <div>
                <h1 className="text-lg font-bold text-digidromen-dark">
                  {sidebarLinks.find((item) =>
                    location.pathname.startsWith(item.path),
                  )?.name ?? "Portal"}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {authMode === "demo" ? (
                <div className="relative">
                  <button
                    onClick={() => setRoleMenuOpen((open) => !open)}
                    className="flex items-center rounded-full border border-digidromen-cream bg-white px-3 py-1.5 text-xs font-semibold text-digidromen-dark"
                  >
                    {roleLabels[snapshot.role]}
                    <ChevronDown size={14} className="ml-1 text-digidromen-dark/40" />
                  </button>
                  {roleMenuOpen ? (
                    <div className="absolute right-0 mt-2 w-52 rounded-xl border border-digidromen-cream bg-white p-1.5 shadow-lg">
                      {(Object.keys(roleLabels) as Role[]).map((role) => (
                        <button
                          key={role}
                          onClick={() => {
                            setRole(role);
                            setRoleMenuOpen(false);
                          }}
                          className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
                            snapshot.role === role
                              ? "bg-digidromen-orange-light font-semibold text-digidromen-dark"
                              : "text-digidromen-dark/70 hover:bg-digidromen-cream"
                          }`}
                        >
                          {roleLabels[role]}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-full border border-digidromen-cream bg-white px-3 py-1.5 text-xs font-semibold text-digidromen-dark">
                  {user ? roleLabels[user.role] : "-"}
                </div>
              )}

              <button
                onClick={() => navigate("/dashboard")}
                className="relative rounded-full border border-digidromen-cream bg-white p-2 text-digidromen-dark/50 hover:text-digidromen-dark"
              >
                <Bell size={17} />
                {unreadNotifications.length > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-digidromen-primary text-[9px] font-bold text-digidromen-dark">
                    {unreadNotifications.length}
                  </span>
                ) : null}
              </button>

              <button
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
