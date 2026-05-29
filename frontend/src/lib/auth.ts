export const AUTH_COOKIE = 'ai_prior_authorization_operations_hub_session';

export type SessionUser = {
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'analyst';
};

export type DemoUser = SessionUser & {
  password: string;
};

export const demoUsers: DemoUser[] = [
  {
    email: 'admin@prior-auth.local',
    password: 'admin123',
    firstName: 'Suite',
    lastName: 'Admin',
    role: 'admin',
  },
  {
    email: 'manager@prior-auth.local',
    password: 'manager123',
    firstName: 'Suite',
    lastName: 'Manager',
    role: 'manager',
  },
  {
    email: 'analyst@prior-auth.local',
    password: 'analyst123',
    firstName: 'Suite',
    lastName: 'Analyst',
    role: 'analyst',
  },
];

export const demoUser = demoUsers[0];

export const rolePermissions: Record<SessionUser['role'], { canApprove: boolean; canManageDocuments: boolean; canManageSettings: boolean }> = {
  admin: { canApprove: true, canManageDocuments: true, canManageSettings: true },
  manager: { canApprove: true, canManageDocuments: true, canManageSettings: false },
  analyst: { canApprove: false, canManageDocuments: false, canManageSettings: false },
};

export function validateDemoCredentials(email: string, password: string): SessionUser | null {
  const user = demoUsers.find((candidate) => candidate.email === email && candidate.password === password);
  if (!user) return null;
  return {
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  };
}

export function getDemoSessionUser(role: SessionUser['role'] = demoUser.role): SessionUser {
  const user = demoUsers.find((candidate) => candidate.role === role) ?? demoUser;
  return {
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  };
}

export function encodeSession(user: SessionUser) {
  return Buffer.from(JSON.stringify(user), 'utf8').toString('base64url');
}

export function decodeSession(value?: string | null): SessionUser | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as SessionUser;
    if (!parsed?.email || !parsed?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function canManageDocuments(user: SessionUser | null) {
  return Boolean(user && rolePermissions[user.role].canManageDocuments);
}

export function canApprove(user: SessionUser | null) {
  return Boolean(user && rolePermissions[user.role].canApprove);
}
