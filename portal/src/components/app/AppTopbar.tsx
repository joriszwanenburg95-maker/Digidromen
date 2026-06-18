import { Bell, LogOut, Search, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { roleLabels } from "@/lib/roleSurface";
import type { Role } from "@/types";

interface AppTopbarProps {
  pageTitle: string;
  role: Role;
  userName?: string;
  userEmail?: string;
  unreadCount: number;
  onCommandOpen: () => void;
  onLogout: () => Promise<void>;
}

export function AppTopbar({
  pageTitle,
  role,
  userName,
  userEmail,
  unreadCount,
  onCommandOpen,
  onLogout,
}: AppTopbarProps) {
  const navigate = useNavigate();

  return (
    <header className="motion-safe:animate-topbar-in sticky top-0 z-20 border-b border-border bg-background/92 px-4 py-3 backdrop-blur lg:px-8">
      <div className="flex min-h-11 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarTrigger aria-label="Menu openen" className="size-10 rounded-full lg:size-9" />
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/Digidromen logo.png"
              alt="Digidromen"
              className="h-9 w-auto object-contain md:hidden"
            />
            <div className="min-w-0">
              <h1 className="truncate font-heading text-lg font-semibold text-foreground">
                {pageTitle}
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="hidden h-10 min-w-64 justify-start rounded-full bg-card text-muted-foreground transition-all duration-200 hover:-translate-y-px hover:border-digidromen-orange/35 hover:bg-white md:flex"
            onClick={onCommandOpen}
          >
            <Search className="size-4" />
            <span className="flex-1 text-left">Zoek pagina</span>
            <kbd className="rounded-md border border-border bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
              ⌘K
            </kbd>
          </Button>

          <Badge
            variant="outline"
            className="hidden h-9 rounded-full border-border bg-card px-3 text-foreground md:inline-flex"
          >
            {roleLabels[role]}
          </Badge>

          <Button
            type="button"
            aria-label="Notificaties"
            variant="outline"
            size="icon"
            className="relative size-10 rounded-full bg-card transition-transform duration-200 hover:-translate-y-px"
            onClick={() => navigate("/dashboard")}
          >
            <Bell className="size-4" />
            {unreadCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-digidromen-orange px-1 text-[9px] font-bold text-white">
                {unreadCount}
              </span>
            ) : null}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                aria-label="Gebruikersmenu"
                variant="outline"
                size="icon"
                className="size-10 rounded-full bg-card transition-transform duration-200 hover:-translate-y-px"
              >
                <UserRound className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <span className="block truncate text-sm font-semibold">{userName}</span>
                <span className="block truncate text-xs font-normal text-muted-foreground">
                  {userEmail}
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
      </div>
    </header>
  );
}
