// @vitest-environment jsdom
/**
 * @file   src/react/barBack.test.tsx
 * @brief  The game bar's two additions of v0.12.0: the `prefs` icon and the optional back link.
 *
 * Responsibility: the `prefs` icon has strokes of its own, not the host icon's. The back link is
 *                 the first child of the bar only when the game passes `back` and is in website
 *                 mode; without the prop the bar has none. Its words are a part of their own
 *                 (`sk-back-words`), so a phone shows the arrow alone, and the link keeps its
 *                 name "Seasonal Entertainment" (./BackLink, reused, not a second link).
 * Source:         Mini Games DECISIONS O143, T414 (the requests); kit DECISIONS K39.
 * Depends on:     vitest, jsdom, @testing-library/react
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GameBar, type BarIconName } from './GameBar.js';

afterEach(cleanup);

const panels = { open: null, toggle: vi.fn(), close: vi.fn(), button: () => () => undefined };

// The strokes of the icon on the one button of a bar.
function strokes(icon: BarIconName): string {
  const { container, unmount } = render(
    <GameBar actions={[{ id: 'x', icon, label: 'X' }]} panels={panels} time={null} />,
  );
  const d = container.querySelector('.sk-bar-icon path')?.getAttribute('d') ?? '';
  unmount();
  return d;
}

describe('the game bar: the prefs icon', () => {
  it('has strokes of its own, on the same 24 px grid', () => {
    expect(strokes('prefs')).toMatch(/^M6 4v6/);
    expect(strokes('prefs')).not.toBe(strokes('host'));
  });
});

describe('the game bar: the back link', () => {
  const bar = (back?: { readonly websiteMode: boolean }) => (
    <GameBar
      actions={[]}
      panels={panels}
      time={null}
      lead={<span>Winter</span>}
      {...(back === undefined ? {} : { back })}
    />
  );

  it('is not there without the prop, nor in standalone mode', () => {
    const { rerender } = render(bar());
    expect(screen.queryByTestId('back-link')).toBeNull();
    rerender(bar({ websiteMode: false }));
    expect(screen.queryByTestId('back-link')).toBeNull();
  });

  it('is the first part of the row in website mode, its words a part of their own', () => {
    render(bar({ websiteMode: true }));
    const link = screen.getByTestId('back-link');
    expect(screen.getByTestId('game-bar').firstElementChild).toBe(link);
    expect(link.querySelector('.sk-back-words')?.textContent).toBe('Seasonal Entertainment');
    // The arrow is not read: the name is the words alone, with or without them shown.
    expect(screen.getByRole('link', { name: 'Seasonal Entertainment' })).toBe(link);
  });
});
