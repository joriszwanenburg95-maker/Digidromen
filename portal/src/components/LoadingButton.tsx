import React from "react";
import { CheckCircle2 } from "lucide-react";

interface LoadingButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  isSuccess?: boolean;
  loadingLabel?: string;
  successLabel?: string;
  variant?: "primary" | "secondary" | "danger" | "success";
}

const VARIANT_CLASSES: Record<
  NonNullable<LoadingButtonProps["variant"]>,
  string
> = {
  danger: "bg-red-500 text-white hover:bg-red-600",
  primary: "bg-digidromen-primary text-digidromen-dark hover:opacity-90",
  secondary:
    "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  success: "bg-emerald-500 text-white hover:bg-emerald-600",
};

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  children,
  className = "",
  disabled,
  isLoading = false,
  isSuccess = false,
  loadingLabel,
  successLabel,
  variant = "primary",
  ...props
}) => (
  <button
    {...props}
    disabled={disabled || isLoading}
    className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
  >
    {isLoading ? (
      <svg className="h-4 w-4 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v8H4z"
        />
      </svg>
    ) : null}
    {isSuccess && !isLoading ? (
      <CheckCircle2 size={14} className="shrink-0" />
    ) : null}
    <span>
      {isLoading && loadingLabel
        ? loadingLabel
        : isSuccess && successLabel
          ? successLabel
          : children}
    </span>
  </button>
);
