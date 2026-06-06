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
  const user = getConfiguredUsers().find((candidate) => candidate.email === email && candidate.password === password);
  if (!user) return null;
  return {
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  };
}

function getConfiguredUsers(): DemoUser[] {
  const raw = process.env.PRIOR_AUTH_USERS_JSON;
  if (!raw) return demoUsers;
  try {
    const parsed = JSON.parse(raw) as DemoUser[];
    const valid = parsed.filter((user) =>
      user.email &&
      user.password &&
      user.firstName &&
      user.lastName &&
      ['admin', 'manager', 'analyst'].includes(user.role),
    );
    return valid.length ? valid : demoUsers;
  } catch {
    return demoUsers;
  }
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

export function canManageDocuments(user: SessionUser | null) {
  return Boolean(user && rolePermissions[user.role].canManageDocuments);
}

export function canApprove(user: SessionUser | null) {
  return Boolean(user && rolePermissions[user.role].canApprove);
}
