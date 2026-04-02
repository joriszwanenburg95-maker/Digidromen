import React from "react";
import { useAuth } from "../context/AuthContext";

export interface RoleGuardProps {
  allowed: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const RoleGuard: React.FC<RoleGuardProps> = ({
  allowed,
  children,
  fallback = null,
}) => {
  const { user } = useAuth();

  if (!user || !allowed.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default RoleGuard;
