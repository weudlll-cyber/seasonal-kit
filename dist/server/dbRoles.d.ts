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
    readonly appendOnly?: readonly string[];
    readonly readOnly?: readonly string[];
}
export interface RoleDatabase {
    query(sql: string, values?: string[]): Promise<{
        readonly rowCount: number | null;
    }>;
}
export declare function grantAppRole(db: RoleDatabase, grants: AppRoleGrants): Promise<boolean>;
