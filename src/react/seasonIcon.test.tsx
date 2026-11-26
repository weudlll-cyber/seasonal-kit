// @vitest-environment jsdom
/**
 * @file   src/react/seasonIcon.test.tsx
 * @brief  `SeasonIcon` shows each season under its English name and refuses any other (K83).
 *
 * Responsibility: each of the four is an image named for its season, at the size asked, carrying
 *                 the season for the stylesheet; any CSS length is its size; `mono` marks the
 *                 one-colour form css/seasons.css draws; `decorative` hides it; anything else
 *                 throws.
 * Depends on:     vitest, jsdom, @testing-library/react
 * Source:         new in the kit.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SeasonIcon } from './SeasonIcon.js';
import type { Season } from './StartCard.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('SeasonIcon', () => {
  it.each([
    ['spring', 'Spring'],
    ['summer', 'Summer'],
    ['autumn', 'Autumn'],
    ['winter', 'Winter'],
  ] as const)('shows %s as the image "%s" at the size asked', (season, name) => {
    render(<SeasonIcon season={season} size={32} />);
    const icon = screen.getByRole('img', { name });
    expect(icon.dataset['skSeason']).toBe(season);
    expect([icon.style.width, icon.style.height]).toEqual(['32px', '32px']);
    expect(icon.className).toBe('sk-season-icon');
  });

  it('says nothing where it is decoration, and takes a game’s class', () => {
    const { container } = render(
      <SeasonIcon season="winter" size={16} decorative className="mine" />,
    );
    expect(screen.queryByRole('img')).toBeNull();
    const icon = container.firstElementChild;
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
    expect(icon?.className).toBe('sk-season-icon mine');
  });

  it.each(['1rem', 'min(2em, 40px)', '12%'])('takes the CSS length %s as it is', (size) => {
    render(<SeasonIcon season="spring" size={size} />);
    const { style } = screen.getByRole('img', { name: 'Spring' });
    expect([style.width, style.height]).toEqual([size, size]);
  });

  it('marks the one-colour form, which the stylesheet draws in the text’s colour', () => {
    const { rerender } = render(<SeasonIcon season="autumn" size={16} mono />);
    const icon = () => screen.getByRole('img', { name: 'Autumn' });
    expect(icon().hasAttribute('data-sk-mono')).toBe(true);
    rerender(<SeasonIcon season="autumn" size={16} />);
    expect(icon().hasAttribute('data-sk-mono')).toBe(false);
    const css = readFileSync(path.resolve('css', 'seasons.css'), 'utf8');
    expect(css).toMatch(/\[data-sk-mono\] \{[^}]*background-color: currentColor/);
    for (const season of ['spring', 'summer', 'autumn', 'winter']) {
      expect(css).toContain(
        `[data-sk-mono][data-sk-season='${season}'] {\n  background-image: none;`,
      );
    }
  });

  it.each(['monsoon', 'SPRING', '', 'toString'])('refuses the season %j', (season) => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<SeasonIcon season={season as Season} size={16} />)).toThrow(RangeError);
  });
});
