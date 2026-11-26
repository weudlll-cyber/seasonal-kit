const NAME = /^[a-z_][a-z0-9_]{0,62}$/;
function checked(grants) {
    const all = { appendOnly: [], readOnly: [], ...grants };
    for (const name of [all.schema, all.role, ...all.appendOnly, ...all.readOnly]) {
        if (!NAME.test(name))
            throw new RangeError(`Not a plain database name: ${name}`);
    }
    return all;
}
export async function grantAppRole(db, grants) {
    const { schema, role, appendOnly, readOnly } = checked(grants);
    const found = await db.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [role]);
    if (found.rowCount === 0)
        return false;
    const revoke = (rights, tables) => tables.map((table) => `REVOKE ${rights} ON ${schema}.${table} FROM ${role};`);
    await db.query([
        `GRANT USAGE ON SCHEMA ${schema} TO ${role};`,
        `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ${schema} TO ${role};`,
        `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ${schema} TO ${role};`,
        ...revoke('UPDATE, DELETE, TRUNCATE', appendOnly),
        ...revoke('INSERT, UPDATE, DELETE, TRUNCATE', readOnly),
    ].join('\n'));
    return true;
}
