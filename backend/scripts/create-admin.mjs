import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import pg from 'pg';

if (process.env.NODE_ENV !== 'test' && process.env.BOOTSTRAP_ACKNOWLEDGEMENT !== 'create-initial-admin') {
  throw new Error('Refusing prior-authorization identity provisioning without explicit acknowledgement');
}
const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = String(process.env.ADMIN_PASSWORD || '');
const tenantId = String(process.env.TENANT_ID || process.env.GOVERNANCE_TENANT_ID || '').trim();
if (!process.env.DATABASE_URL || !email || !email.includes('@') || password.length < 12 || !tenantId) {
  throw new Error('DATABASE_URL, explicit ADMIN_EMAIL, strong ADMIN_PASSWORD, and TENANT_ID are required');
}
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO prior_auth_identities(id,tenant_id,email,password_hash,first_name,last_name,role)
     VALUES($1,$2,$3,$4,'Runtime','Acceptance','admin')
     ON CONFLICT (tenant_id,email) DO UPDATE SET
       password_hash=EXCLUDED.password_hash,first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,role='admin',disabled_at=NULL`,
    [`runtime-${crypto.randomUUID()}`, tenantId, email, passwordHash],
  );
} finally {
  await pool.end();
}
