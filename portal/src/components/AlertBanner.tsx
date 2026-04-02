import React from "react";
import { CheckCircle, Info, TriangleAlert, X, XCircle } from "lucide-react";

export interface AlertBannerProps {
  variant: "info" | "warning" | "success" | "error";
  title: string;
  message?: string;
  onDismiss?: () => void;
}

const VARIANT_CONFIG: Record<
  AlertBannerProps["variant"],
  { border: string; bg: string; icon: React.ElementType; iconColor: string }
> = {
  info: {
    border: "border-l-blue-500",
    bg: "bg-blue-50",
    icon: Info,
    iconColor: "text-blue-600",
  },
  warning: {
    border: "border-l-amber-500",
    bg: "bg-amber-50",
    icon: TriangleAlert,
    iconColor: "text-amber-600",
  },
  success: {
    border: "border-l-emerald-500",
    bg: "bg-emerald-50",
    icon: CheckCircle,
    iconColor: "text-emerald-600",
  },
  error: {
    border: "border-l-red-500",
    bg: "bg-red-50",
    icon: XCircle,
    iconColor: "text-red-600",
  },
};

const AlertBanner: React.FC<AlertBannerProps> = ({
  variant,
  title,
  message,
  onDismiss,
}) => {
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border-l-4 ${config.border} ${config.bg} px-4 py-3`}
      role="alert"
    >
      <Icon size={18} className={`mt-0.5 shrink-0 ${config.iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-digidromen-dark">{title}</p>
        {message && (
          <p className="mt-0.5 text-sm text-digidromen-dark/60 leading-relaxed">
            {message}
          </p>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 rounded-lg p-1 text-digidromen-dark/30 hover:text-digidromen-dark/60 transition-colors"
          aria-label="Sluiten"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default AlertBanner;
