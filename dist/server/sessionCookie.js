export function sessionCookie(input) {
    const basePath = input.basePath ?? '/';
    if (!/^\w+$/.test(input.name))
        throw new RangeError('The cookie name is letters, digits and _');
    if (!/^\/[\w./-]*$/.test(basePath) || basePath.includes('..')) {
        throw new RangeError('The base path is a plain path starting with /');
    }
    const path = basePath === '/' ? basePath : basePath.replace(/\/$/, '');
    if (!input.secure)
        return { name: input.name, secure: false, path };
    const prefix = path === '/' ? '__Host-' : '__Secure-';
    return { name: `${prefix}${input.name}`, secure: true, path };
}
export function sessionCookieOptions(cookie, absoluteDays) {
    const base = {
        path: cookie.path,
        httpOnly: true,
        sameSite: 'lax',
        secure: cookie.secure,
    };
    if (absoluteDays === undefined)
        return base;
    const maxAge = Math.floor(absoluteDays * 24 * 3600);
    // A zero, negative or non-finite length would set a cookie that ends at once or never.
    if (!Number.isFinite(absoluteDays) || maxAge < 1) {
        throw new RangeError('The session length is a positive number of days');
    }
    return { ...base, maxAge };
}
