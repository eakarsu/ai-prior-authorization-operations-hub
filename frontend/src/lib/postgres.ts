import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { DATA_DIR } from '@/lib/storePaths';

const DEFAULT_DB = 'marketing_growth_automation_suite';

let pool: Pool | null = null;
let initialized = false;
let initPromise: Promise<Pool> | null = null;

type JsonMap<T> = Record<string, T>;

function getPool() {
  if (pool) return pool;
  pool = new Pool(
    process.env.DATABASE_URL
      ? { connectionString: process.env.DATABASE_URL }
      : {
          host: process.env.PGHOST || '127.0.0.1',
          port: Number(process.env.PGPORT || 5432),
          user: process.env.PGUSER || process.env.USER,
          password: process.env.PGPASSWORD || undefined,
          database: process.env.PGDATABASE || DEFAULT_DB,
        },
  );
  return pool;
}

function readJsonFallback<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

export async function ensurePostgres() {
  if (initialized) return getPool();
  if (!initPromise) {
    initPromise = (async () => {
      const current = getPool();
      await current.query(`
        CREATE TABLE IF NOT EXISTS feature_states (
          slug TEXT PRIMARY KEY,
          payload JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS entities (
          slug TEXT PRIMARY KEY,
          payload JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY,
          payload JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          payload JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS audit_log (
          id TEXT PRIMARY KEY,
          payload JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS source_data_tables (
          id TEXT PRIMARY KEY,
          payload JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS source_table_rows (
          id TEXT PRIMARY KEY,
          table_id TEXT NOT NULL,
          payload JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      initialized = true;
      return current;
    })();
  }
  return initPromise;
}

export async function ensureKeyValueSeed<T>(
  table: 'feature_states' | 'entities',
  seed: JsonMap<T>,
  jsonFile: string,
) {
  const current = await ensurePostgres();
  const { rows } = await current.query<{ count: string }>(`SELECT COUNT(*)::text as count FROM ${table}`);
  if (Number(rows[0]?.count || 0) > 0) return;
  const source = readJsonFallback<JsonMap<T>>(path.join(DATA_DIR, jsonFile), seed);
  for (const [slug, payload] of Object.entries(source)) {
    await current.query(
      `INSERT INTO ${table} (slug, payload) VALUES ($1, $2::jsonb) ON CONFLICT (slug) DO NOTHING`,
      [slug, JSON.stringify(payload)],
    );
  }
}

export async function ensureListSeed<T extends { id: string }>(
  table: 'documents' | 'notifications' | 'audit_log' | 'source_data_tables',
  seed: T[],
  jsonFile: string,
) {
  const current = await ensurePostgres();
  const { rows } = await current.query<{ count: string }>(`SELECT COUNT(*)::text as count FROM ${table}`);
  if (Number(rows[0]?.count || 0) > 0) return;
  const source = readJsonFallback<T[]>(path.join(DATA_DIR, jsonFile), seed);
  for (const item of source) {
    await current.query(
      `INSERT INTO ${table} (id, payload) VALUES ($1, $2::jsonb) ON CONFLICT (id) DO NOTHING`,
      [item.id, JSON.stringify(item)],
    );
  }
}

export async function getPgKeyValue<T>(table: 'feature_states' | 'entities', slug: string): Promise<T | null> {
  const current = await ensurePostgres();
  const { rows } = await current.query<{ payload: T }>(`SELECT payload FROM ${table} WHERE slug = $1`, [slug]);
  return rows[0]?.payload ?? null;
}

export async function setPgKeyValue<T>(table: 'feature_states' | 'entities', slug: string, payload: T) {
  const current = await ensurePostgres();
  await current.query(
    `INSERT INTO ${table} (slug, payload, updated_at) VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (slug) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
    [slug, JSON.stringify(payload)],
  );
}

export async function listPgPayloads<T>(table: 'documents' | 'notifications' | 'audit_log' | 'source_data_tables'): Promise<T[]> {
  const current = await ensurePostgres();
  const { rows } = await current.query<{ payload: T }>(`SELECT payload FROM ${table} ORDER BY updated_at DESC`);
  return rows.map((row: { payload: T }) => row.payload);
}

export async function replacePgPayloads<T extends { id: string }>(table: 'documents' | 'notifications' | 'audit_log' | 'source_data_tables', items: T[]) {
  const current = await ensurePostgres();
  await current.query('BEGIN');
  try {
    await current.query(`DELETE FROM ${table}`);
    for (const item of items) {
      await current.query(
        `INSERT INTO ${table} (id, payload, updated_at) VALUES ($1, $2::jsonb, NOW())`,
        [item.id, JSON.stringify(item)],
      );
    }
    await current.query('COMMIT');
  } catch (error) {
    await current.query('ROLLBACK');
    throw error;
  }
}

export async function upsertPgPayload<T extends { id: string }>(table: 'documents' | 'notifications' | 'audit_log' | 'source_data_tables', item: T) {
  const current = await ensurePostgres();
  await current.query(
    `INSERT INTO ${table} (id, payload, updated_at) VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
    [item.id, JSON.stringify(item)],
  );
}
