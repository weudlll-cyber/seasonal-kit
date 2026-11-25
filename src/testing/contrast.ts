/**
 * @file   src/testing/contrast.ts
 * @brief  A static guard for a game's design tokens: text keeps its WCAG contrast on every
 *         background it names, in the light and the dark theme.
 *
 * Responsibility: `findLowContrast({ css, pairs })` reads the token files as text, in the order
 *                 the page loads them (a later value wins), from the `:root` block (light) and the
 *                 `:root[data-theme='dark']` block over it (dark). Each pair names a text token, a
 *                 stack of background tokens from the bottom up (`['--sk-color-background',
 *                 '--sk-color-card']`) and a ratio (4.5 unless named). A translucent layer is
 *                 composited over the layers below; a token that holds several colours (the
 *                 page's glows, the bar's gradient) is checked with each of them. What falls
 *                 short is returned as "theme: text on background, colour: ratio"; a token that
 *                 is missing or holds no colour throws, so a renamed token cannot pass silently.
 * Depends on:     nothing
 * Source:         seasonal-bingo-royale apps/web/src/designTokens.test.ts at 8d20904 (the parsing,
 *                 compositing and WCAG formula; seasonal-mini-games' file at 9e3c6f3 is the same
 *                 test, 80 % alike). Generalised: the pairs are the game's list.
 * Spec:           WCAG 2.2 SC 1.4.3 and 1.4.11
 */
export interface ContrastPair {
  readonly text: string;
  // Background tokens, bottom first.
  readonly on: readonly string[];
  readonly min?: number;
}

export interface ContrastInput {
  // The token stylesheets' text, in load order.
  readonly css: readonly string[];
  readonly pairs: readonly ContrastPair[];
}

type Rgba = readonly [number, number, number, number];

const SELECTORS = { light: [':root'], dark: [':root', ":root[data-theme='dark']"] } as const;
const COLOUR = /#[0-9a-f]{6}|rgb\(\d+ \d+ \d+(?: \/ [\d.]+%)?\)/gi;

// The custom properties of one theme: every named block of every file, later ones winning.
function tokensOf(css: readonly string[], theme: keyof typeof SELECTORS): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const selector of SELECTORS[theme]) {
    for (const file of css) {
      const start = file.indexOf(`${selector} {`);
      const block = start < 0 ? '' : file.slice(start, file.indexOf('\n}', start));
      for (const m of block.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
        tokens.set(m[1] ?? '', m[2] ?? '');
      }
    }
  }
  return tokens;
}

function parse(value: string): Rgba {
  if (value.startsWith('#')) {
    const at = (i: number): number => Number.parseInt(value.slice(i, i + 2), 16);
    return [at(1), at(3), at(5), 1];
  }
  const [r = 0, g = 0, b = 0, a] = [...value.matchAll(/[\d.]+/g)].map((m) => Number(m[0]));
  return [r, g, b, a === undefined ? 1 : a / 100];
}

// Every colour a token holds (a gradient holds several).
function coloursOf(tokens: Map<string, string>, name: string): Rgba[] {
  const found = (tokens.get(name)?.match(COLOUR) ?? []).map(parse);
  if (found.length === 0) throw new Error(`no colour in the token ${name}`);
  return found;
}

function over(top: Rgba, base: Rgba): Rgba {
  const a = top[3];
  const mix = (i: 0 | 1 | 2): number => top[i] * a + base[i] * (1 - a);
  return [mix(0), mix(1), mix(2), 1];
}

function luminance(c: Rgba): number {
  const channel = (v: number): number => {
    const s = v / 255;
    return s <= 0.040_45 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(c[0]) + 0.7152 * channel(c[1]) + 0.0722 * channel(c[2]);
}

function contrastRatio(a: Rgba, b: Rgba): number {
  const [hi = 0, lo = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Every background the stack can make: each colour of each layer over each result below.
function backgrounds(tokens: Map<string, string>, stack: readonly string[]): Rgba[] {
  return stack.reduce<Rgba[]>(
    (below, name) =>
      coloursOf(tokens, name).flatMap((layer) => below.map((base) => over(layer, base))),
    // White under the bottom layer, as a browser paints a page.
    [[255, 255, 255, 1]],
  );
}

export function findLowContrast(input: ContrastInput): string[] {
  return (['light', 'dark'] as const).flatMap((theme) => {
    const tokens = tokensOf(input.css, theme);
    return input.pairs.flatMap((pair) => {
      const min = pair.min ?? 4.5;
      return backgrounds(tokens, pair.on).flatMap((bg) =>
        coloursOf(tokens, pair.text)
          .map((text) => contrastRatio(over(text, bg), bg))
          .filter((ratio) => ratio < min)
          .map(
            (ratio) =>
              `${theme}: ${pair.text} on ${pair.on.join(' + ')}: ${ratio.toFixed(2)} < ${String(min)}`,
          ),
      );
    });
  });
}
