/**
 * @file   src/testing/standInProxy.ts
 * @brief  The proxy half of the stand-in website: a game's pages under `/games/<slug>/`, the
 *         identity only on the sign-in route.
 *
 * Responsibility: forwards every request (and WebSocket upgrade) under a game's path to its app,
 *                 as the game's route file does: the identity headers and the proxy secret a
 *                 client sends are removed on every path and the website's session cookie never
 *                 reaches the app; only `<base>/auth/website` asks the website's authorize first,
 *                 passes its identity headers on and then adds the game's secret, and a refusal
 *                 goes to `<base>/auth/website/login` with the same query; `<base>/metrics` is 404.
 * Depends on:     node:http, ./standInContract
 * Source:         seasonal-mini-games ops/lib/website-route.sh at 9e3c6f3 and its
 *                 e2e/websiteStub.ts; seasonal-bingo-royale e2e/websiteStack.ts at 8d20904 (K74).
 * Spec:           website docs/GAME-INTEGRATION.md §2 "Required trust checks" at cc743b9
 */
import http, {} from 'node:http';
const SESSION_COOKIES = /^(?:__Host-)?se\.sid=/;
// The browser's headers as the app gets them: no identity, no secret, no website session.
function cleaned(headers, game) {
    const out = {};
    for (const [name, value] of Object.entries(headers)) {
        if (name.startsWith('x-acting-') || name === game.secretHeader.toLowerCase())
            continue;
        out[name] = value;
    }
    const cookies = (headers.cookie ?? '')
        .split(';')
        .map((c) => c.trim())
        .filter((c) => c !== '' && !SESSION_COOKIES.test(c));
    if (cookies.length === 0)
        delete out.cookie;
    else
        out.cookie = cookies.join('; ');
    return out;
}
// The headers for one request to the app, or the redirect that answers it instead.
export function appHeaders(request, target, ask) {
    const url = new URL(request.url ?? '/', 'http://stand-in');
    const headers = cleaned(request.headers, target.game);
    if (url.pathname !== `${target.base}/auth/website`)
        return headers;
    const answer = ask();
    if (answer.status !== 204)
        return { redirect: `${target.base}/auth/website/login${url.search}` };
    for (const [name, value] of Object.entries(answer.headers)) {
        if (name.startsWith('x-acting-'))
            headers[name] = value;
    }
    // After the authorize call, which never carries it.
    headers[target.game.secretHeader.toLowerCase()] = target.game.secret;
    return headers;
}
// Where a request goes: the game's own host, port and nothing else of the request's address, so
// a request line naming another host ("//elsewhere/…" or an absolute address) stays with the game.
function toApp(request, app, headers) {
    const { pathname, search } = new URL(request.url ?? '/', 'http://stand-in');
    const { hostname, port } = new URL(app);
    return { hostname, port, path: `${pathname}${search}`, method: request.method ?? 'GET', headers };
}
export function forward(request, response, app, headers) {
    const upstream = http.request(toApp(request, app, headers), (answer) => {
        response.writeHead(answer.statusCode ?? 502, answer.headers);
        answer.pipe(response);
    });
    upstream.on('error', () => {
        response.writeHead(502).end('the game does not answer');
    });
    request.pipe(upstream);
}
// A WebSocket (or another upgrade): the same headers, then the two sockets joined.
export function forwardUpgrade(request, socket, app, headers) {
    const upstream = http.request(toApp(request, app, headers));
    upstream.on('upgrade', (answer, appSocket, head) => {
        const lines = Object.entries(answer.headers).flatMap(([name, value]) => [value].flat().map((v) => `${name}: ${String(v)}`));
        socket.write(`HTTP/1.1 101 Switching Protocols\r\n${lines.join('\r\n')}\r\n\r\n`);
        socket.write(head);
        appSocket.pipe(socket).pipe(appSocket);
        appSocket.on('error', () => socket.destroy());
        socket.on('error', () => appSocket.destroy());
    });
    upstream.on('response', () => socket.destroy());
    upstream.on('error', () => socket.destroy());
    upstream.end();
}
