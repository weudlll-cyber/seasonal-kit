// @vitest-environment jsdom
/**
 * @file   src/react/seasonIcon.test.tsx
 * @brief  `SeasonIcon` shows each season under its English name and refuses any other (K83).
 *
 * Responsibility: each of the four is an image named for its season, at the size asked, carrying
 *                 the season for the stylesheet; `decorative` hides it; anything else throws.
 * Depends on:     vitest, jsdom, @testing-library/react
 * Source:         new in the kit.
 */
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

  it.each(['monsoon', 'SPRING', '', 'toString'])('refuses the season %j', (season) => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<SeasonIcon season={season as Season} size={16} />)).toThrow(RangeError);
  });
});
