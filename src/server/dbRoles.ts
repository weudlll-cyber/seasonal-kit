/**
 * @file   src/server/dbRoles.ts
 * @brief  The app role's rights on a game's tables, granted by the owner after the migrations (K90).
 *
 * Responsibility: `grantAppRole(db, grants)`, run on the owner's connection after every migration:
 *                 when the app role exists (a production install; ops/lib/db-roles.sql makes it)
 *                 it may use the schema, read and write the rows of every table and use the
 *                 sequences; the `appendOnly` tables it may only read and add to; the `readOnly`
 *                 tables (the migration record) only read. All in one statement batch, which
 *                 PostgreSQL runs as one transaction, so no moment grants more. It returns false
 *                 without the role (development, test suites). Idempotent. Every name must be a
 *                 plain lower-case word. The app role owns nothing, so it cannot create, alter or
 *                 drop.
 * Depends on:     nothing: any client with `query`, such as a `pg` pool
 * Source:         seasonal-bingo-royale apps/server/src/db/roles.ts at d7d841e; its schema, role
 *                 and table names became options.
 * Spec:           docs/OPERATIONS.md "Database roles"
 */
export interface AppRoleGrants {
  readonly schema: string;
  readonly role: string;
  // Tables the app may add to and read, never change or empty (logs of what happened).
  readonly appendOnly?: readonly string[];
  // Tables the app may only read (the migrations' record).
  readonly readOnly?: readonly string[];
}

export interface RoleDatabase {
  query(sql: string, values?: string[]): Promise<{ readonly rowCount: number | null }>;
}

const NAME = /^[a-z_][a-z0-9_]{0,62}$/;

function checked(grants: AppRoleGrants): Required<AppRoleGrants> {
  const all = { appendOnly: [], readOnly: [], ...grants };
  for (const name of [all.schema, all.role, ...all.appendOnly, ...all.readOnly]) {
    if (!NAME.test(name)) throw new RangeError(`Not a plain database name: ${name}`);
  }
  return all;
}

export async function grantAppRole(db: RoleDatabase, grants: AppRoleGrants): Promise<boolean> {
  const { schema, role, appendOnly, readOnly } = checked(grants);
  const found = await db.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [role]);
  if (found.rowCount === 0) return false;
  const revoke = (rights: string, tables: readonly string[]): string[] =>
    tables.map((table) => `REVOKE ${rights} ON ${schema}.${table} FROM ${role};`);
  await db.query(
    [
      `GRANT USAGE ON SCHEMA ${schema} TO ${role};`,
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ${schema} TO ${role};`,
      `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ${schema} TO ${role};`,
      ...revoke('UPDATE, DELETE, TRUNCATE', appendOnly),
      ...revoke('INSERT, UPDATE, DELETE, TRUNCATE', readOnly),
    ].join('\n'),
  );
  return true;
}
