import { Pool, type PoolClient, type QueryResultRow } from "pg";

const g = globalThis as unknown as { __pcPool?: Pool };

export function pool(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  if (!g.__pcPool) {
    const url = process.env.DATABASE_URL;
    const ssl = /sslmode=require|neon\.tech|supabase/.test(url) ? { rejectUnauthorized: false } : undefined;
    g.__pcPool = new Pool({ connectionString: url, ssl, max: 5 });
  }
  return g.__pcPool;
}

/** Parameterized queries only — never interpolate user input into SQL. */
export async function q<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []) {
  return (await pool().query<T>(sql, params)).rows;
}

export async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await pool().connect();
  try {
    await c.query("BEGIN");
    const r = await fn(c);
    await c.query("COMMIT");
    return r;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
