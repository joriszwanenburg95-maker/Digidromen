import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Clock3 } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { RoleSurfaceConfig } from "@/lib/roleSurface";

interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surface: RoleSurfaceConfig;
}

export function CommandMenu({ open, onOpenChange, surface }: CommandMenuProps) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange, open]);

  const primaryItems = surface.nav.filter((item) => item.group !== "beheer");
  const managementItems = surface.nav.filter((item) => item.group === "beheer");

  const openPath = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  const renderItems = (items: typeof surface.nav) =>
    items.map((item) => {
      const Icon = item.icon;
      const active = location.pathname === item.path;

      return (
        <CommandItem
          key={item.path}
          value={`${item.label} ${item.path}`}
          onSelect={() => openPath(item.path)}
          className={cn(active && "bg-secondary text-foreground")}
        >
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground",
              active && "bg-digidromen-yellow text-digidromen-dark",
            )}
          >
            <Icon className="size-4" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium">{item.label}</span>
            <span className="truncate text-xs text-muted-foreground">{item.path}</span>
          </span>
          <CommandShortcut>
            {active ? <Clock3 className="size-3.5" /> : <ArrowRight className="size-3.5" />}
          </CommandShortcut>
        </CommandItem>
      );
    });

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput autoFocus placeholder="Zoek pagina of onderdeel..." />
      <CommandList>
        <CommandEmpty>Geen pagina gevonden.</CommandEmpty>
        <CommandGroup heading="Navigatie">{renderItems(primaryItems)}</CommandGroup>
        {managementItems.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Beheer">{renderItems(managementItems)}</CommandGroup>
          </>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}
