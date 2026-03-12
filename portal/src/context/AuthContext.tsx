import React, { createContext, useContext } from "react";

import type { Role } from "../types";
import { portalStore, usePortalContext } from "../lib/portal";

interface AuthUser {
  id: string;
  name: string;
  role: Role;
  organizationId: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  setRole: (role: Role) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { snapshot, viewer, user: domainUser } = usePortalContext();

  const user = domainUser
    ? {
        id: domainUser.id,
        name: domainUser.fullName ?? domainUser.name,
        role: snapshot.role,
        organizationId: viewer.organizationId,
        email: domainUser.email,
      }
    : null;

  const setRole = (role: Role) => {
    portalStore.setRole(role);
  };

  const logout = () => {
    portalStore.setRole("help_org");
  };

  return (
    <AuthContext.Provider value={{ user, setRole, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
