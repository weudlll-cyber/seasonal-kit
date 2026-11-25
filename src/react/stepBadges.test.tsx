// @vitest-environment jsdom
/**
 * @file   src/react/stepBadges.test.tsx
 * @brief  The step badges beside a name: only the website's icons, at most three, named (K68).
 *
 * Responsibility: each step shows an image named by the step, with the shared classes and the
 *                 place's own; an address that is not the website's file, a step without an icon
 *                 and a fourth step are left out; nothing at all renders without a drawable step;
 *                 and the header's CSS brings the shared stylesheet along.
 * Depends on:     vitest, @testing-library/react
 * Source:         new in the kit (K68).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { Step } from '../stepShape.js';
import { StepBadges } from './StepBadges.js';

afterEach(cleanup);

const icon = (n: string): string => `/media/step-icons/${n.padStart(32, '0')}.webp`;
const step = (ladder: Step['ladder'], name: string, at: string | null): Step => ({
  ladder,
  name,
  icon: at,
});

describe('StepBadges', () => {
  it('shows each step as an image named by the step', () => {
    render(
      <StepBadges
        className="list"
        imageClassName="mine"
        steps={[step('holder', 'Diamond holder', icon('1')), step('farmer', 'Golden', icon('2'))]}
      />,
    );
    const images = screen.getAllByRole('img');
    expect(images.map((i) => i.getAttribute('alt'))).toEqual(['Diamond holder', 'Golden']);
    expect(images[0]?.getAttribute('src')).toBe(icon('1'));
    expect(images[0]?.className).toBe('sk-step mine');
    expect(screen.getByTestId('steps').className).toBe('sk-steps list');
  });

  it('draws only the website’s own icons, at most three', () => {
    render(
      <StepBadges
        steps={[
          step('holder', 'a', 'https://evil.example/x.webp'),
          step('farmer', 'b', null),
          step('investor', 'c', icon('3')),
          step('holder', 'd', icon('4')),
        ]}
      />,
    );
    // The first three are judged: only the third has the website's file; the fourth is cut.
    expect(screen.getAllByRole('img').map((i) => i.getAttribute('alt'))).toEqual(['c']);
  });

  it.each([undefined, [], [step('holder', 'x', null)]])('renders nothing for %j', (steps) => {
    const { container } = render(<StepBadges steps={steps} />);
    expect(container.innerHTML).toBe('');
  });

  it('comes with the header’s stylesheet, so the chip keeps its look', () => {
    // The package's root is the working directory of the test run (jsdom has no file URLs).
    const css = (name: string): string => readFileSync(path.resolve('css', name), 'utf8');
    const header = css('header.css');
    expect(header).toContain("@import './steps.css';");
    const steps = css('steps.css');
    expect(steps).toMatch(/\.sk-step \{[^}]*var\(--sk-step-icon, 1\.25rem\)/);
  });
});
