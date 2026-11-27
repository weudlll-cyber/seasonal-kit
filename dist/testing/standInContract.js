const SAFE = ['GET', 'HEAD', 'OPTIONS'];
const CHANGING = ['POST', 'PUT', 'PATCH', 'DELETE'];
export function authorize(request, member) {
    const headers = { 'cache-control': 'no-store' };
    if (request.method !== 'GET')
        return { status: 405, headers };
    const original = (request.originalMethod ?? '').toUpperCase();
    const changing = CHANGING.includes(original);
    // An unknown or missing original method fails closed.
    if (!changing && !SAFE.includes(original))
        return { status: 403, headers };
    if (changing && request.origin !== request.siteOrigin)
        return { status: 403, headers };
    if (member === null) {
        return { status: 204, headers: { ...headers, 'x-acting-guest': 'true' } };
    }
    return {
        status: 204,
        headers: {
            ...headers,
            'x-acting-user-id': String(member.id),
            'x-acting-user': member.name,
            'x-acting-user-roles': member.role,
            'x-acting-user-email-verified': String(member.emailVerified !== false),
            'x-acting-user-can-host': String(member.role === 'admin' || member.canHost === true),
            'x-acting-user-steps': Buffer.from(JSON.stringify(member.steps ?? [])).toString('base64url'),
        },
    };
}
const DAY_MS = 86_400_000;
const day = (at) => new Date(at).toISOString().slice(0, 10);
export function seasonFeed(now) {
    return {
        v: 1,
        inSeason: {
            season: 'autumn',
            token: 'AUTUMN',
            since: new Date(now - 90 * DAY_MS).toISOString(),
        },
        // From 30 days ago to the two years ahead, oldest first.
        halvingDays: [
            { day: day(now - 30 * DAY_MS), token: 'SUMMER' },
            { day: day(now + 100 * DAY_MS), token: 'AUTUMN' },
        ],
    };
}
// The website's checks (server/src/games/openRoundsContract.js).
const text = (max, empty = false) => (v) => typeof v === 'string' && v.length <= max && (empty || v.trim() !== '');
const count = (least) => (v) => Number.isInteger(v) && Number(v) >= least;
// ISO 8601 in UTC ("…Z"), or null.
const utc = (v) => v === null || (typeof v === 'string' && v.endsWith('Z') && !Number.isNaN(Date.parse(v)));
// The first rule a round breaks, or null.
function brokenRule(round, origin, now) {
    const joins = (v) => {
        if (typeof v !== 'string' || !URL.canParse(v))
            return false;
        const url = new URL(v);
        return url.protocol === 'https:' && url.origin === origin;
    };
    const closes = round['signupClosesAt'];
    const rules = [
        ['id', text(64)(round['id'])],
        ['title', text(80)(round['title'])],
        ['kind', text(40, true)(round['kind'])],
        ['startsAt', utc(round['startsAt'])],
        ['signupClosesAt', utc(closes)],
        ['sign-up closed', typeof closes !== 'string' || Date.parse(closes) > now],
        ['players', count(0)(round['players'])],
        ['maxPlayers', round['maxPlayers'] === null || count(1)(round['maxPlayers'])],
        ['joinUrl', joins(round['joinUrl'])],
    ];
    return rules.find(([, kept]) => !kept)?.[0] ?? null;
}
export function checkOpenRounds(page, origin, now) {
    const { version, rounds } = (page ?? {});
    if (!Number.isInteger(version))
        throw new Error('not the open-rounds contract: no version');
    // A newer contract than the website knows counts as no rounds.
    if (Number(version) > 1)
        return { rounds: [], dropped: [] };
    if (version !== 1 || !Array.isArray(rounds))
        throw new Error('not the open-rounds contract');
    const kept = [];
    const dropped = [];
    rounds.slice(0, 20).forEach((entry, i) => {
        const round = (typeof entry === 'object' && entry !== null ? entry : {});
        const broken = brokenRule(round, origin, now);
        if (broken === null)
            kept.push(round);
        else
            dropped.push(`round ${String(i + 1)}: ${broken}`);
    });
    return { rounds: kept, dropped };
}
