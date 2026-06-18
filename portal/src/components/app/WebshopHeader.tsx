import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { roleLabels, type RoleSurfaceConfig } from "@/lib/roleSurface";
import type { Role } from "@/types";

interface WebshopHeaderProps {
  role: Role;
  surface: RoleSurfaceConfig;
  userName?: string;
  userEmail?: string;
  onLogout: () => Promise<void>;
}

function isActivePath(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(path + "/");
}

/**
 * Lichte webshop-header voor de hulporganisatie: één duidelijke navigatie en
 * een account-menu, zonder de back-office-sidebar. "Mijn organisatie" zit in
 * het account-menu, zodat de bovenbalk op de webshop gericht blijft.
 */
export function WebshopHeader({ role, surface, userName, userEmail, onLogout }: WebshopHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Alle bestemmingen zichtbaar in de balk (Webshop + Mijn organisatie). Voor
  // een 2-item-webshop is dat duidelijker dan items in een menu verstoppen.
  const primaryNav = surface.nav;

  return (
    <header className="motion-safe:animate-topbar-in sticky top-0 z-20 border-b border-border bg-background/92 px-4 py-3 backdrop-blur lg:px-8">
      <div className="mx-auto flex min-h-11 max-w-6xl items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Link to="/orders" className="flex shrink-0 items-center">
            <span className="flex h-9 items-center rounded-lg bg-white px-2 shadow-sm">
              <img src="/Digidromen logo.png" alt="Digidromen" className="h-6 w-auto object-contain" />
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {primaryNav.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(location.pathname, item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex min-h-10 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition-colors",
                    active
                      ? "bg-digidromen-orange/10 text-digidromen-orange"
                      : "text-foreground/65 hover:bg-card hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" strokeWidth={active ? 2.4 : 1.9} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              aria-label="Accountmenu"
              variant="outline"
              size="icon"
              className="size-10 rounded-full bg-card transition-transform duration-200 hover:-translate-y-px"
            >
              <UserRound className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              <span className="block truncate text-sm font-semibold">{userName ?? "Gebruiker"}</span>
              <span className="block truncate text-xs font-normal text-muted-foreground">{userEmail}</span>
              <span className="mt-1 inline-block rounded-full bg-digidromen-yellow px-2 py-0.5 text-[11px] font-semibold text-digidromen-dark">
                {roleLabels[role]}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                onLogout().then(() => navigate("/login"));
              }}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="size-4" />
              Uitloggen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
