/**
 * @file   src/testing/cssColour.ts
 * @brief  The colours a token's value holds, with its `var()` references followed and its
 *         `color-mix()` in srgb worked out, for ./contrast.
 *
 * Responsibility: `resolveValue(value, tokens)` replaces every `var(--name)` (with its fallback
 *                 where the name is unknown) by that token's value, then every
 *                 `color-mix(in srgb, a p%, b q%)` by the colour a browser mixes (premultiplied;
 *                 one share given gives the other its rest; two that sum to under 100 % make the
 *                 result that much transparent), inside out, as `rgb(r g b / a%)`. It returns null
 *                 when something cannot be worked out (an unknown name without a fallback, a cycle,
 *                 another colour space, an operand that is no hex, rgb() or `transparent`), so the
 *                 guard reports it instead of passing it. `coloursIn` reads the colours of a
 *                 resolved value; a gradient holds several.
 * Depends on:     nothing
 * Source:         the mixing from seasonal-mini-games apps/web/src/ownRowTint.test.ts at e91cdef;
 *                 the colour forms moved here from ./contrast.ts (v0.34.0).
 */
export type Rgba = readonly [number, number, number, number];

const COLOUR = /#[0-9a-f]{6}|rgb\([\d.]+ [\d.]+ [\d.]+(?: \/ [\d.]+%)?\)/gi;
const ONE_COLOUR = new RegExp(`^(?:${COLOUR.source})$`, 'i');
// The innermost call: no other function's bracket inside it but a colour's rgb().
const INNER_MIX = /color-mix\((?:[^()]|rgb\([^()]*\))*\)/;
// References inside references end here: a cycle is unresolved.
const DEPTH = 20;

function parse(value: string): Rgba {
  if (value.startsWith('#')) {
    const at = (i: number): number => Number.parseInt(value.slice(i, i + 2), 16);
    return [at(1), at(3), at(5), 1];
  }
  const [r = 0, g = 0, b = 0, a] = [...value.matchAll(/[\d.]+/g)].map((m) => Number(m[0]));
  return [r, g, b, a === undefined ? 1 : a / 100];
}

export const coloursIn = (value: string): Rgba[] => (value.match(COLOUR) ?? []).map(parse);

// Where the bracket opened just before `from` closes, or -1.
function closing(text: string, from: number): number {
  let open = 1;
  for (let i = from; i < text.length; i += 1) {
    if (text[i] === '(') open += 1;
    else if (text[i] === ')' && (open -= 1) === 0) return i;
  }
  return -1;
}

// Every var() replaced by its token's value, or its fallback; null for neither.
function followed(value: string, tokens: Map<string, string>, depth: number): string | null {
  const at = value.indexOf('var(');
  if (at < 0) return value;
  const end = closing(value, at + 4);
  if (end < 0 || depth > DEPTH) return null;
  const [, name = '', , fallback] =
    /^\s*(--[\w-]+)\s*(,([\s\S]*))?$/.exec(value.slice(at + 4, end)) ?? [];
  const found = tokens.get(name) ?? fallback?.trim();
  if (found === undefined) return null;
  return followed(`${value.slice(0, at)}${found}${value.slice(end + 1)}`, tokens, depth + 1);
}

// One operand of a mix: its colour and its share, if it names one.
function operand(text: string): { colour: Rgba; share: number | null } | null {
  const [, body = '', share] = /^([\s\S]*?)(?:\s+([\d.]+)%)?$/.exec(text.trim()) ?? [];
  const colour = body === 'transparent' ? 'rgb(0 0 0 / 0%)' : body;
  if (!ONE_COLOUR.test(colour)) return null;
  return { colour: parse(colour), share: share === undefined ? null : Number(share) / 100 };
}

// `color-mix(in srgb, a, b)` as an rgb() text, or null.
function mixOf(call: string): string | null {
  const parts = call.slice('color-mix('.length, -1).split(',');
  if (parts.length !== 3 || parts[0]?.trim() !== 'in srgb') return null;
  const a = operand(parts[1] ?? '');
  const b = operand(parts[2] ?? '');
  if (a === null || b === null) return null;
  const first = a.share ?? (b.share === null ? 0.5 : 1 - b.share);
  const second = b.share ?? 1 - first;
  const sum = first + second;
  if (sum <= 0) return null;
  const [p, q] = [first / sum, second / sum];
  const alpha = a.colour[3] * p + b.colour[3] * q;
  const channel = (i: 0 | 1 | 2): number =>
    alpha === 0 ? 0 : (a.colour[i] * a.colour[3] * p + b.colour[i] * b.colour[3] * q) / alpha;
  const shown = (n: number): string => n.toFixed(3);
  const opacity = shown(alpha * Math.min(1, sum) * 100);
  return `rgb(${shown(channel(0))} ${shown(channel(1))} ${shown(channel(2))} / ${opacity}%)`;
}

export function resolveValue(value: string, tokens: Map<string, string>): string | null {
  let text = followed(value, tokens, 0);
  while (text !== null && text.includes('color-mix(')) {
    const inner = INNER_MIX.exec(text)?.[0];
    const mixed = inner === undefined ? null : mixOf(inner);
    text = mixed === null ? null : text.replace(inner ?? '', mixed);
  }
  return text;
}
