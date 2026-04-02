import React from "react";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent: string;
  href?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, icon: Icon, accent }) => {
  return (
    <div className="rounded-2xl border border-digidromen-cream bg-white p-5 transition-shadow hover:shadow-md">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent}/15`}>
        <Icon size={18} className={accent.replace("bg-", "text-")} />
      </div>
      <p className="mt-3 text-2xl font-bold text-digidromen-dark">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-digidromen-dark/50">{label}</p>
    </div>
  );
};

export default KpiCard;
