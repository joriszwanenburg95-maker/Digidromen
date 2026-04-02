import React from "react";

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = "" }) => (
  <div
    className={`animate-pulse rounded-xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] ${className}`}
  />
);

export const SkeletonTableRow: React.FC<{ cols?: number }> = ({
  cols = 5,
}) => (
  <tr>
    {Array.from({ length: cols }).map((_, index) => (
      <td key={index} className="px-6 py-4">
        <Skeleton className="h-4 w-full" />
      </td>
    ))}
  </tr>
);

export const SkeletonKpiCard: React.FC = () => (
  <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
    <Skeleton className="h-3 w-24" />
    <Skeleton className="h-8 w-16" />
    <Skeleton className="h-3 w-32" />
  </div>
);

export const SkeletonDetailSection: React.FC<{ rows?: number }> = ({
  rows = 4,
}) => (
  <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
    <Skeleton className="h-5 w-40" />
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="flex justify-between gap-6">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-40" />
      </div>
    ))}
  </div>
);

export const SkeletonListItem: React.FC = () => (
  <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
    <Skeleton className="h-10 w-10 rounded-lg" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3 w-28" />
    </div>
    <Skeleton className="h-6 w-20 rounded-full" />
  </div>
);
