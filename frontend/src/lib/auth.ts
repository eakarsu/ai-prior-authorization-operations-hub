export const AUTH_COOKIE = 'prior_auth_governed_session';

export type SessionUser = {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'analyst' | 'clinician';
};

export const rolePermissions: Record<SessionUser['role'], { canApprove: boolean; canManageDocuments: boolean; canManageSettings: boolean }> = {
  admin: { canApprove: true, canManageDocuments: true, canManageSettings: true },
  manager: { canApprove: false, canManageDocuments: true, canManageSettings: false },
  analyst: { canApprove: false, canManageDocuments: true, canManageSettings: false },
  clinician: { canApprove: true, canManageDocuments: false, canManageSettings: false },
};

export function canManageDocuments(user: SessionUser | null) { return Boolean(user && rolePermissions[user.role].canManageDocuments); }
export function canApprove(user: SessionUser | null) { return Boolean(user && rolePermissions[user.role].canApprove); }
