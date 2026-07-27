const ADMIN_SCOPE_BRANCH_KEY = "evfeedback.adminScopeBranchId";
const ADMIN_SCOPE_COMPANY_KEY = "evfeedback.adminScopeCompanyId";
export const ADMIN_SCOPE_CHANGED_EVENT = "evfeedback:admin-scope-changed";
export const NO_BRANCH_SCOPE = "__NO_BRANCH__";

export function getAdminScopeBranchId() {
  return localStorage.getItem(ADMIN_SCOPE_BRANCH_KEY) ?? "";
}

export function getAdminScopeCompanyId() {
  return localStorage.getItem(ADMIN_SCOPE_COMPANY_KEY) ?? "";
}

export function setAdminBranchScope(branchId: string, companyId = "") {
  if (branchId) localStorage.setItem(ADMIN_SCOPE_BRANCH_KEY, branchId);
  else localStorage.removeItem(ADMIN_SCOPE_BRANCH_KEY);

  if (companyId) localStorage.setItem(ADMIN_SCOPE_COMPANY_KEY, companyId);
  else localStorage.removeItem(ADMIN_SCOPE_COMPANY_KEY);

  window.dispatchEvent(
    new CustomEvent(ADMIN_SCOPE_CHANGED_EVENT, { detail: { branchId, companyId } }),
  );
}