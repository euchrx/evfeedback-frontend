export type UserRole = "SUPER_ADMIN" | "COMPANY_ADMIN" | "MANAGER";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId?: string | null;
  active?: boolean;
};

export function isSuperAdmin(user: AuthUser | null | undefined) {
  return user?.role === "SUPER_ADMIN";
}

export function isCompanyAdmin(user: AuthUser | null | undefined) {
  return user?.role === "COMPANY_ADMIN";
}

export function isManager(user: AuthUser | null | undefined) {
  return user?.role === "MANAGER";
}

export function isActiveUser(user: AuthUser | null | undefined) {
  return !!user && user.active !== false;
}

export function canAccessCompanies(user: AuthUser | null | undefined) {
  return isSuperAdmin(user);
}

export function canAccessUsers(user: AuthUser | null | undefined) {
  return isSuperAdmin(user) || isCompanyAdmin(user);
}

export function canAccessBranches(user: AuthUser | null | undefined) {
  return isSuperAdmin(user) || isCompanyAdmin(user);
}

export function canAccessKiosks(user: AuthUser | null | undefined) {
  return isSuperAdmin(user) || isCompanyAdmin(user);
}

export function canAccessTags(user: AuthUser | null | undefined) {
  return isSuperAdmin(user) || isCompanyAdmin(user);
}

export function canAccessFeedbacks(user: AuthUser | null | undefined) {
  return isSuperAdmin(user) || isCompanyAdmin(user) || isManager(user);
}

export function canAccessSettings(user: AuthUser | null | undefined) {
  return isSuperAdmin(user) || isCompanyAdmin(user);
}

export function canAccessDashboard(user: AuthUser | null | undefined) {
  return isSuperAdmin(user) || isCompanyAdmin(user) || isManager(user);
}

export function canViewOperationalModules(user: AuthUser | null | undefined) {
  return canAccessDashboard(user);
}

export function canManageOperationalModules(user: AuthUser | null | undefined) {
  return isSuperAdmin(user) || isCompanyAdmin(user);
}

export function canCreateUsers(user: AuthUser | null | undefined) {
  return isSuperAdmin(user) || isCompanyAdmin(user);
}

export function canEditUsers(user: AuthUser | null | undefined) {
  return isSuperAdmin(user) || isCompanyAdmin(user);
}

export function canCreateBranches(user: AuthUser | null | undefined) {
  return isSuperAdmin(user) || isCompanyAdmin(user);
}

export function canEditBranches(user: AuthUser | null | undefined) {
  return isSuperAdmin(user) || isCompanyAdmin(user);
}

export function canCreateKiosks(user: AuthUser | null | undefined) {
  return isSuperAdmin(user) || isCompanyAdmin(user);
}

export function canEditKiosks(user: AuthUser | null | undefined) {
  return isSuperAdmin(user) || isCompanyAdmin(user);
}

export function canCreateTags(user: AuthUser | null | undefined) {
  return isSuperAdmin(user) || isCompanyAdmin(user);
}

export function canEditTags(user: AuthUser | null | undefined) {
  return isSuperAdmin(user) || isCompanyAdmin(user);
}

export function canManageSettings(user: AuthUser | null | undefined) {
  return isSuperAdmin(user) || isCompanyAdmin(user);
}

export function canDeleteFeedbacks(user: AuthUser | null | undefined) {
  return isSuperAdmin(user) || isCompanyAdmin(user);
}

export function canHardDelete(user: AuthUser | null | undefined) {
  return isSuperAdmin(user);
}

export function hasCompanyScope(user: AuthUser | null | undefined) {
  return !isSuperAdmin(user);
}

export function getResolvedCompanyId(user: AuthUser | null | undefined) {
  if (!user) return undefined;
  if (isSuperAdmin(user)) return undefined;
  return user.companyId ?? undefined;
}