import React from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-digidromen-cream">
        <Icon size={24} className="text-digidromen-dark/30" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-digidromen-dark">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-digidromen-dark/40">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
};

export default EmptyState;
