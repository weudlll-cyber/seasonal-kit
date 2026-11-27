/**
 * @file   src/testing/preview.ts
 * @brief  The local website-mode preview: the stand-in website in front of a game's running dev
 *         server, with one test member signed in, for the owner to look at before a merge (K124).
 *
 * Responsibility: `previewSettings(argv, env)` reads the command's options (`previewUsage`);
 *                 `startPreview(settings)` starts ./websiteStandIn on 127.0.0.1 with the game's
 *                 app behind it, one test member signed in and a live shared call to show the
 *                 slot, and answers the one address to open: it signs the member in and goes to
 *                 the game's website sign-in. `runPreview` is the command (./previewCli): it says
 *                 what to open and stops when told. The app must be on this computer. The proxy
 *                 secret is read from the environment and never printed. The preview writes
 *                 nothing: what changes in the game's database is what the game does for a
 *                 signed-in member. The call is the stand-in's page, not a real call.
 * Depends on:     node:util, ./websiteStandIn
 * Source:         new in the kit, on the stand-in (K74).
 */
import { parseArgs } from 'node:util';
import { startWebsiteStandIn } from './websiteStandIn.js';
export const previewUsage = `usage: sk-preview --slug <game> --app <http://127.0.0.1:port> --secret-header <name>
                  --secret-env <VARIABLE> [--port 4400] [--role member|organiser|admin]
                  [--can-host]
  --slug           the game's name under /games/<slug>/
  --app            where the game, running in website mode, answers on this computer
  --secret-header  the header the game trusts the website's proxy by
  --secret-env     the environment variable holding that header's value, as the game reads it
  --port           where the preview listens (default 4400)
  --role           the test member's role (default member); --can-host lets the member host
Stop it with Ctrl+C.`;
const OPTIONS = {
    slug: { type: 'string' },
    app: { type: 'string' },
    'secret-header': { type: 'string' },
    'secret-env': { type: 'string' },
    port: { type: 'string', default: '4400' },
    role: { type: 'string', default: 'member' },
    'can-host': { type: 'boolean', default: false },
};
const LOCAL_APP = /^http:\/\/(?:127\.0\.0\.1|localhost|\[::1\]):\d{1,5}\/?$/;
const ROLES = ['member', 'organiser', 'admin'];
function need(ok, sentence) {
    if (!ok)
        throw new Error(sentence);
}
export function previewSettings(argv, env) {
    const { values } = parseArgs({ args: [...argv], options: OPTIONS });
    const { slug = '', app = '', 'secret-header': secretHeader = '' } = values;
    const variable = values['secret-env'] ?? '';
    const secret = env[variable] ?? '';
    const port = Number(values.port);
    const role = ROLES.find((r) => r === values.role);
    need(/^[a-z0-9-]+$/.test(slug), '--slug is the game’s name, as in /games/<slug>/.');
    need(LOCAL_APP.test(app), '--app is the game on this computer, like http://127.0.0.1:5400.');
    need(/^[A-Za-z0-9-]+$/.test(secretHeader), '--secret-header is the proxy’s header name.');
    need(variable !== '' && secret !== '', `--secret-env names a variable that is set: ${variable}`);
    need(Number.isInteger(port) && port > 0 && port < 65536, '--port is a port number.');
    need(role !== undefined, '--role is member, organiser or admin.');
    return {
        slug,
        app: app.replace(/\/$/, ''),
        secretHeader,
        secret,
        port,
        role: role ?? 'member',
        canHost: values['can-host'],
    };
}
// The one test member: no e-mail address, and three steps so the header shows its badges.
function testMember(settings) {
    const icon = (n) => `/media/step-icons/${String(n).padStart(32, '0')}.webp`;
    return {
        id: 1001,
        name: 'Preview Member',
        role: settings.role,
        canHost: settings.canHost,
        steps: [
            { ladder: 'holder', name: 'Diamond holder', icon: icon(1) },
            { ladder: 'farmer', name: 'Golden farmer', icon: icon(2) },
            { ladder: 'investor', name: 'Early investor', icon: icon(3) },
        ],
    };
}
// The call the stand-in's shared view says is live, so the dock's slot shows.
const SHARED_CALL = 7;
export async function startPreview(settings) {
    const { slug, app, secretHeader, secret, port } = settings;
    const member = testMember(settings);
    const site = await startWebsiteStandIn({
        games: { [slug]: { app, secretHeader, secret } },
        members: [member],
        port,
        sharedCall: SHARED_CALL,
    });
    site.signInAs(member.id);
    const signIn = encodeURIComponent(`/games/${slug}/auth/website`);
    return { address: `${site.origin}/login?next=${signIn}`, origin: site.origin, stop: site.close };
}
// The command: 0 once it listens (it then runs until stopped), 1 where it cannot start.
export async function runPreview(argv, env, say, onStop) {
    if (argv.includes('--help')) {
        say(previewUsage);
        return 0;
    }
    try {
        const settings = previewSettings(argv, env);
        const preview = await startPreview(settings);
        say(`Open: ${preview.address}`);
        say(`It signs the test member in and opens ${settings.slug} in website mode. The game must run ` +
            `in website mode at ${settings.app}, with ${preview.origin}/games/${settings.slug}/ as its ` +
            'public address and the same secret. The shared call is a stand-in: the real one is only ' +
            'on the website. Stop with Ctrl+C.');
        onStop(async () => {
            await preview.stop();
            say('Preview stopped.');
        });
        return 0;
    }
    catch (error) {
        say(`preview: ${error instanceof Error ? error.message : String(error)}`);
        say(previewUsage);
        return 1;
    }
}
