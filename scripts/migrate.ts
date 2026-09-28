/* Applies db/migrations/*.sql in order, then seeds the first admin from ADMIN_EMAIL / ADMIN_PASSWORD. */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pool, tx } from "../src/lib/db";
import { createUser } from "../src/lib/users";

async function main() {
  const dir = join(process.cwd(), "db/migrations");
  await pool().query("CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
  const done = new Set((await pool().query("SELECT name FROM schema_migrations")).rows.map((r) => r.name));
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    if (done.has(f)) continue;
    await tx(async (c) => {
      await c.query(readFileSync(join(dir, f), "utf8"));
      await c.query("INSERT INTO schema_migrations (name) VALUES ($1)", [f]);
    });
    console.log(`applied ${f}`);
  }
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  const admins = (await pool().query("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1")).rowCount;
  if (!admins && ADMIN_EMAIL && ADMIN_PASSWORD) {
    await createUser(ADMIN_EMAIL, ADMIN_PASSWORD, "admin");
    console.log(`seeded admin ${ADMIN_EMAIL}`);
  }
  await pool().end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
