// What a role may add back after dropping all. PostgreSQL's image gives its files to its own
// user and switches to it; without any of the four it does not start.
const ROLE_CAPABILITIES = {
    app: [],
    database: ['CHOWN', 'DAC_OVERRIDE', 'SETGID', 'SETUID'],
};
const isFields = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const words = (value) => Array.isArray(value) ? value.filter((v) => typeof v === 'string') : [];
// "cap_net_admin" and "NET_ADMIN" are the same capability.
const capability = (name) => name.toUpperCase().replace(/^CAP_/, '');
// The sentences for one checked service.
function findingsOf(service, allowed) {
    const found = [];
    if (service['read_only'] !== true)
        found.push('read_only is not true');
    const options = words(service['security_opt']);
    if (!options.some((o) => /^no-new-privileges([:=]true)?$/.test(o))) {
        found.push('security_opt lacks no-new-privileges:true');
    }
    if (!words(service['cap_drop']).map(capability).includes('ALL')) {
        found.push('cap_drop lacks ALL');
    }
    const known = allowed.map(capability);
    for (const added of words(service['cap_add']).map(capability)) {
        if (!known.includes(added))
            found.push(`cap_add ${added} is not one it is shown to need`);
    }
    if (service['privileged'] === true)
        found.push('privileged is true');
    return found;
}
export function findWeakContainers(compose, options) {
    const services = isFields(compose) ? compose['services'] : undefined;
    if (!isFields(services))
        throw new TypeError('Not a Compose file: it has no services');
    const found = Object.keys(options.services)
        .filter((name) => !Object.hasOwn(services, name))
        .map((name) => `${name}: the Compose file has no such service`);
    for (const [name, service] of Object.entries(services)) {
        const role = Object.hasOwn(options.services, name) ? options.services[name] : undefined;
        if (role === undefined) {
            found.push(`${name}: has no role in this check (app, database, or unchecked with why)`);
        }
        else if (typeof role === 'string') {
            const allowed = [...ROLE_CAPABILITIES[role], ...(options.capabilities?.[name] ?? [])];
            const fields = isFields(service) ? service : {};
            found.push(...findingsOf(fields, allowed).map((sentence) => `${name}: ${sentence}`));
        }
    }
    return found;
}
