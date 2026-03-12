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
  User,
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
  digidromen_staff: "Digidromen Medewerker",
  digidromen_admin: "Digidromen Beheerder",
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
        ? "Supabase vars gevonden; portal draait nog op demo-auth en lokale store"
        : "Demo data wordt lokaal opgeslagen";

  return (
    <div className="flex min-h-screen bg-slate-50">
      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-20 bg-slate-900/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-30 w-72 border-r border-slate-200 bg-white transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Digidromen
            </p>
            <p className="text-lg font-bold text-slate-900">Supply & Service Portal</p>
          </div>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X size={22} />
          </button>
        </div>

        <div className="px-4 py-4">
          <div className="rounded-2xl bg-slate-900 px-4 py-4 text-white">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Actieve persona</p>
            <p className="mt-2 text-lg font-bold">{roleLabels[snapshot.role]}</p>
            <p className="mt-1 text-sm text-slate-300">{user?.name}</p>
          </div>
        </div>

        <nav className="space-y-1 px-3">
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
                className={`flex items-center rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-sky-50 text-sky-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon size={18} className="mr-3" />
                {link.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu size={22} />
              </button>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {sidebarLinks.find((item) =>
                    location.pathname.startsWith(item.path),
                  )?.name ?? "Portal"}
                </p>
                <p className="text-xs text-slate-400">{statusCopy}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {authMode === "demo" ? (
                <div className="relative">
                  <button
                    onClick={() => setRoleMenuOpen((open) => !open)}
                    className="flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    {roleLabels[snapshot.role]}
                    <ChevronDown size={14} className="ml-1" />
                  </button>
                  {roleMenuOpen ? (
                    <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                      {(Object.keys(roleLabels) as Role[]).map((role) => (
                        <button
                          key={role}
                          onClick={() => {
                            setRole(role);
                            setRoleMenuOpen(false);
                          }}
                          className={`block w-full rounded-xl px-3 py-2 text-left text-sm ${
                            snapshot.role === role
                              ? "bg-slate-100 font-semibold text-slate-900"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {roleLabels[role]}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                  {user ? roleLabels[user.role] : "-"}
                </div>
              )}

              <button
                onClick={() => navigate("/dashboard")}
                className="relative rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-100"
              >
                <Bell size={18} />
                {unreadNotifications.length > 0 ? (
                  <span
                    className={`absolute -right-1 -top-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${statusClasses(
                      "queued",
                    )}`}
                  >
                    {unreadNotifications.length}
                  </span>
                ) : null}
              </button>

              <div className="hidden items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-1.5 md:flex">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <User size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
                  <p className="text-xs text-slate-400">{user?.email}</p>
                </div>
              </div>

              <button
                onClick={async () => {
                  await logout();
                  navigate("/login");
                }}
                className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-100"
              >
                <LogOut size={18} />
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
