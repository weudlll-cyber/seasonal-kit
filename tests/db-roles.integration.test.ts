/**
 * @file   tests/db-roles.integration.test.ts
 * @brief  The owner and app roles on a real PostgreSQL: who may do what (K90).
 *
 * Responsibility: a throw-away PostgreSQL container, started and removed by this test. A database
 *                 made and filled by the superuser (an install before the roles) is converted by
 *                 ops/lib/db-roles.sql through ops/lib/db-roles.sh, twice; the owner then owns the
 *                 schema's tables, views, sequences, functions and types, but not an extension's.
 *                 The owner works with temporary tables, as a migration may (the app may not), and
 *                 adds tables, and `grantAppRole` gives the app its rights: rows read and
 *                 written, append-only and read-only tables as named, no change to the schema or
 *                 the roles, a later table after the next grant. Neither role is a superuser or may
 *                 create roles or databases. Bad names and passwords are refused without being
 *                 said. Needs Docker and bash.
 * Depends on:     vitest, pg, node:child_process, ../src/server/dbRoles
 * Source:         after seasonal-bingo-royale apps/server/test/dbRoles.integration.test.ts at
 *                 d7d841e.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { grantAppRole } from '../src/server/dbRoles.js';

// The pinned image the ops tests use (ops/test/backup.test.sh).
const IMAGE =
  process.env['SK_TEST_PG_IMAGE'] ??
  'postgres:17-alpine@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24';
const NAME = `sk-roles-${String(process.pid)}`;
const OWNER_PASSWORD = 'owner-test-only-0123456789';
const APP_PASSWORD = 'app-test-only-0123456789';
const LIBRARY = fileURLToPath(new URL('../ops/lib/db-roles.sh', import.meta.url)).replaceAll(
  '\\',
  '/',
);
const GRANTS = { schema: 'game', role: 'gm_app', appendOnly: ['events'], readOnly: ['migrations'] };
const names = {
  SK_DB_PREFIX: 'gm',
  SK_DB_SCHEMA: 'game',
  SK_DB_OWNER_PASSWORD: OWNER_PASSWORD,
  SK_DB_APP_PASSWORD: APP_PASSWORD,
};

const docker = (...args: string[]): string =>
  execFileSync('docker', args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();

// ops/lib/db-roles.sh as a game calls it, its psql the container's.
function applyRoles(settings: Record<string, string>) {
  const psql = ['docker', 'exec', '-i', NAME, 'psql', '-X', '-q', '-v', 'ON_ERROR_STOP=1'];
  return spawnSync(
    'bash',
    ['-c', 'source "$1"; shift; sk_db_roles_apply "$@"', '_', LIBRARY, ...psql, '-U', 'postgres'],
    { encoding: 'utf8', env: { ...process.env, ...settings } },
  );
}

const pools: pg.Pool[] = [];
let port = '';
function poolOf(user: string, password: string): pg.Pool {
  const pool = new pg.Pool({
    connectionString: `postgresql://${user}:${password}@127.0.0.1:${port}/postgres`,
    max: 1,
  });
  pools.push(pool);
  return pool;
}

// The error a statement fails with, or ''.
const refusal = (pool: pg.Pool, sql: string): Promise<string> =>
  pool.query(sql).then(
    () => '',
    (error: unknown) => String(error),
  );

let owner: pg.Pool;
let app: pg.Pool;
let superuser: pg.Pool;

beforeAll(async () => {
  docker(
    'run',
    '-d',
    '--name',
    NAME,
    '-e',
    'POSTGRES_PASSWORD=throwaway',
    '-p',
    '127.0.0.1::5432',
    IMAGE,
  );
  port = docker('port', NAME, '5432/tcp').split(':').at(-1) ?? '';
  superuser = poolOf('postgres', 'throwaway');
  // The image starts once to set itself up; over TCP it answers only after that.
  await vi.waitFor(() => superuser.query('SELECT 1'), { timeout: 60_000, interval: 500 });
  await superuser.query(`
    CREATE SCHEMA game;
    CREATE EXTENSION citext SCHEMA game;
    CREATE TYPE game.colour AS ENUM ('red');
    CREATE DOMAIN game.name AS text;
    CREATE TABLE game.players (id serial PRIMARY KEY, name game.citext);
    CREATE TABLE game.events (id int);
    CREATE TABLE game.migrations (id text);
    CREATE VIEW game.names AS SELECT name FROM game.players;
    CREATE SEQUENCE game.numbers;
    CREATE FUNCTION game.one() RETURNS int LANGUAGE sql AS 'SELECT 1';`);
  for (const run of [applyRoles(names), applyRoles(names)]) {
    expect([run.status, run.stderr]).toEqual([0, '']);
  }
  owner = poolOf('gm_owner', OWNER_PASSWORD);
  app = poolOf('gm_app', APP_PASSWORD);
  expect(await grantAppRole(owner, GRANTS)).toBe(true);
}, 120_000);

afterAll(async () => {
  await Promise.all(pools.map((pool) => pool.end()));
  docker('rm', '-f', '-v', NAME);
}, 60_000);

describe('the database roles', () => {
  it('give the owner everything in the schema but an extension’s', async () => {
    const owners = await superuser.query<{ name: string; owner: string }>(`
      SELECT c.relname AS name, pg_get_userbyid(c.relowner) AS owner FROM pg_class c
        WHERE c.relnamespace = 'game'::regnamespace AND c.relkind IN ('r', 'v', 'S')
      UNION ALL SELECT proname, pg_get_userbyid(proowner) FROM pg_proc
        WHERE pronamespace = 'game'::regnamespace AND proname IN ('one', 'citext_eq')
      UNION ALL SELECT typname, pg_get_userbyid(typowner) FROM pg_type
        WHERE typnamespace = 'game'::regnamespace AND typname IN ('colour', 'name', 'citext')`);
    for (const row of owners.rows) {
      const expected = row.name.startsWith('citext') ? 'postgres' : 'gm_owner';
      expect([row.name, row.owner]).toEqual([row.name, expected]);
    }
    expect(owners.rows.length).toBeGreaterThanOrEqual(11);
  });

  it('let the app read and write rows', async () => {
    await app.query("INSERT INTO players (name) VALUES ('ana')");
    await app.query("UPDATE players SET name = 'bo'");
    expect((await app.query('SELECT name FROM names')).rows).toEqual([{ name: 'bo' }]);
    await app.query('DELETE FROM players');
    await app.query('INSERT INTO events VALUES (1)');
    expect((await app.query('SELECT game.one() AS one')).rows).toEqual([{ one: 1 }]);
  });

  it.each([
    'UPDATE events SET id = 2',
    'DELETE FROM events',
    'TRUNCATE events',
    "INSERT INTO migrations VALUES ('x')",
    'DELETE FROM migrations',
    'CREATE TABLE game.extra (id int)',
    'CREATE SCHEMA extra',
    'CREATE TEMPORARY TABLE extra (id int)',
    'DROP TABLE players',
    'ALTER TABLE players ADD COLUMN x int',
    'CREATE ROLE intruder',
  ])('refuse the app: %s', async (sql) => {
    expect(await refusal(app, sql)).toMatch(/permission denied|must be owner/);
  });

  it('let the owner add a table, which the app uses after the next grant', async () => {
    await owner.query('CREATE TABLE later (id int)');
    expect(await refusal(app, 'SELECT * FROM later')).toMatch(/permission denied/);
    await grantAppRole(owner, GRANTS);
    expect(await refusal(app, 'SELECT * FROM later')).toBe('');
    expect(await refusal(app, 'DELETE FROM events')).toMatch(/permission denied/);
  });
});

describe('the owner’s migrations', () => {
  it('let a migration of the owner work with a temporary table', async () => {
    // As a game's migration moves rows (Mini Games), on the fresh database's own grants.
    await owner.query(`
      BEGIN;
      CREATE TEMP TABLE moves ON COMMIT DROP AS SELECT 1 AS id;
      INSERT INTO events SELECT id FROM moves;
      COMMIT;`);
    expect((await app.query('SELECT count(*)::int AS n FROM events')).rows[0]).not.toEqual({
      n: 0,
    });
  });
});

describe('the limits of the roles and of what is accepted', () => {
  it('make neither role more than it needs', async () => {
    const roles = await superuser.query(
      `SELECT rolname FROM pg_roles WHERE rolname LIKE 'gm\\_%'
        AND NOT (rolsuper OR rolcreaterole OR rolcreatedb OR rolbypassrls) ORDER BY 1`,
    );
    expect(roles.rows).toEqual([{ rolname: 'gm_app' }, { rolname: 'gm_owner' }]);
    expect(await refusal(owner, 'CREATE ROLE intruder')).toMatch(/permission denied/);
  });

  it('grant nothing where there is no app role, and refuse a name that is not plain', async () => {
    expect(await grantAppRole(owner, { schema: 'game', role: 'nobody_app' })).toBe(false);
    for (const bad of [
      { ...GRANTS, role: 'a; DROP' },
      { ...GRANTS, appendOnly: ['Events'] },
    ]) {
      await expect(grantAppRole(owner, bad)).rejects.toThrow(RangeError);
    }
  });

  it.each([
    ['a prefix with a quote', { SK_DB_PREFIX: "gm'" }],
    ['a schema that is no word', { SK_DB_SCHEMA: 'game; DROP' }],
    ['a short password', { SK_DB_APP_PASSWORD: 'short-secret' }],
    ['a password with a quote', { SK_DB_OWNER_PASSWORD: "quoted'secret-0123456789" }],
  ])('send nothing for %s', (_name, change) => {
    const run = applyRoles({ ...names, ...change });
    expect(run.status).toBe(1);
    expect(run.stderr).toMatch(/^database roles: /);
    expect(run.stderr).not.toMatch(/secret/);
  });
});
