const SELF = "'self'";
// Only a plain origin reaches a header, so no stored value can add a directive.
const PLAIN_ORIGIN = /^https?:\/\/[A-Za-z0-9.-]+(:\d{1,5})?$/;
// An https origin and a path of plain characters: nothing that ends a source or a directive.
const HTTPS_PATH = /^https:\/\/[A-Za-z0-9.-]+(:\d{1,5})?(\/(?:[\w.~-]|%[0-9A-Fa-f]{2})*)+$/;
const PERMISSIONS = 'camera=(), microphone=(), geolocation=(), payment=()';
function origins(list, what) {
    if (!list.every((o) => PLAIN_ORIGIN.test(o))) {
        throw new RangeError(`${what} must be plain origins`);
    }
    return list;
}
function frameSources(list) {
    if (!list.every((s) => s === SELF || PLAIN_ORIGIN.test(s) || HTTPS_PATH.test(s))) {
        throw new RangeError('frames must be plain origins or https addresses with a path');
    }
    return list;
}
function ancestorsOf(options) {
    if (options.admin === true)
        return ["'none'"];
    if (options.mode === 'website') {
        if (options.ancestors !== undefined) {
            throw new RangeError('A website install is framed by the website only: no ancestors');
        }
        const site = options.websiteOrigin === undefined ? [] : [options.websiteOrigin];
        return [SELF, ...origins(site, 'The website origin')];
    }
    return [SELF, ...origins(options.ancestors ?? [], 'ancestors')];
}
export function securityHeaderSet(options) {
    const frames = frameSources(options.frames ?? [SELF]);
    const ancestors = ancestorsOf(options);
    const directives = {
        'default-src': [SELF],
        'base-uri': ["'none'"],
        'form-action': [SELF],
        'object-src': ["'none'"],
        'img-src': [SELF, 'data:', ...(options.blobImages === true ? ['blob:'] : [])],
        'font-src': [SELF],
        'style-src': [SELF, ...(options.inlineStyles === true ? ["'unsafe-inline'"] : [])],
        'script-src': [SELF],
        'script-src-attr': ["'none'"],
        'connect-src': [SELF],
        'frame-src': frames.length === 0 ? ["'none'"] : frames,
        'frame-ancestors': ancestors,
        // A directive without a value.
        ...(options.secure === true ? { 'upgrade-insecure-requests': [] } : {}),
        ...(options.admin === true ? { 'require-trusted-types-for': ["'script'"] } : {}),
    };
    // X-Frame-Options has no list: with another site allowed, frame-ancestors decides alone.
    const onlyOwn = ancestors.length === 1;
    const frameOptions = options.admin === true ? 'DENY' : onlyOwn && ancestors[0] === SELF ? 'SAMEORIGIN' : undefined;
    return {
        directives,
        headers: {
            'referrer-policy': 'no-referrer',
            'x-content-type-options': 'nosniff',
            'permissions-policy': PERMISSIONS,
            'cross-origin-opener-policy': 'same-origin',
            'cross-origin-resource-policy': 'same-origin',
            ...(frameOptions === undefined ? {} : { 'x-frame-options': frameOptions }),
        },
    };
}
// The policy as the header's text: `name value value; name value`.
export function renderPolicy(directives) {
    return Object.entries(directives)
        .map(([name, sources]) => [name, ...sources].join(' '))
        .join('; ');
}
// A Fastify `onRequest` hook: `app.addHook('onRequest', securityHeadersHook(set))`.
export function securityHeadersHook(source) {
    return (request, reply, done) => {
        const set = typeof source === 'function' ? source(request.url) : source;
        reply.header('content-security-policy', renderPolicy(set.directives));
        for (const [name, value] of Object.entries(set.headers))
            reply.header(name, value);
        done();
    };
}
