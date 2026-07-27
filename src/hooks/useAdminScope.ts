import { useEffect, useState } from "react";
import {
  ADMIN_SCOPE_CHANGED_EVENT,
  getAdminScopeBranchId,
  getAdminScopeCompanyId,
} from "../services/adminScope";

export function useAdminScopeBranchId() {
  const [branchId, setBranchId] = useState(getAdminScopeBranchId);

  useEffect(() => {
    const handleScopeChange = (event: Event) => {
      const detail = (event as CustomEvent<{ branchId?: string }>).detail;
      setBranchId(detail?.branchId ?? getAdminScopeBranchId());
    };

    window.addEventListener(ADMIN_SCOPE_CHANGED_EVENT, handleScopeChange);
    return () => window.removeEventListener(ADMIN_SCOPE_CHANGED_EVENT, handleScopeChange);
  }, []);

  return branchId;
}

export function useAdminScopeCompanyId() {
  const [companyId, setCompanyId] = useState(getAdminScopeCompanyId);

  useEffect(() => {
    const handleScopeChange = (event: Event) => {
      const detail = (event as CustomEvent<{ companyId?: string }>).detail;
      setCompanyId(detail?.companyId ?? getAdminScopeCompanyId());
    };

    window.addEventListener(ADMIN_SCOPE_CHANGED_EVENT, handleScopeChange);
    return () => window.removeEventListener(ADMIN_SCOPE_CHANGED_EVENT, handleScopeChange);
  }, []);

  return companyId;
}
