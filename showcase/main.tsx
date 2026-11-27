/**
 * @file   showcase/main.tsx
 * @brief  The showcase's entry: the kit's CSS, the theme from `?theme=`, and the page.
 *
 * Responsibility: imports every kit stylesheet as a game does, sets `?theme=light|dark` on
 *                 <html> before the first render (without it the early script's rule applies,
 *                 through the toggle), and renders ./Showcase, the result instead of the start
 *                 card with `?screen=result`, or one of ./Fixtures' whole screens
 *                 (`places`, `full-header`), ./LargeText's (`bar`, `card`, `round`, `panel`) or
 *                 ./SharedScreen (`shared`, `standalone=1`).
 * Source:         new in the kit.
 */
import '../css/tokens.css';
import '../css/fonts.css';
import '../css/motion.css';
import '../css/shell.css';
import '../css/fit.css';
import '../css/dock.css';
import '../css/frames.css';
import '../css/bar.css';
import '../css/call.css';
import '../css/header.css';
import '../css/steps.css';
import '../css/components.css';
import '../css/seasons.css';
import './showcase.css';

import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';

import { storeTheme } from '../src/theme.js';
import { CasesRoleHeader, FullHeader, Places } from './Fixtures.js';
import { LARGE_SCREENS } from './LargeText.js';
import { SharedScreen } from './SharedScreen.js';
import { Showcase } from './Showcase.js';

const params = new URLSearchParams(window.location.search);
const theme = params.get('theme');
// The toggle starts from the stored choice, so the page's theme is stored first.
if (theme === 'light' || theme === 'dark') storeTheme(theme);

// A whole screen of its own (./Fixtures.tsx), or the showcase page.
function page(screen: string | null): ReactElement {
  if (screen === 'places') return <Places dense={params.get('dense') === '1'} />;
  if (screen === 'full-header') return <FullHeader />;
  if (screen === 'cases-header') return <CasesRoleHeader role={params.get('role') ?? 'player'} />;
  if (screen === 'shared') return <SharedScreen website={params.get('standalone') !== '1'} />;
  const Large = screen === null ? undefined : LARGE_SCREENS[screen];
  if (Large !== undefined) return <Large />;
  return <Showcase result={screen === 'result'} />;
}

const root = document.getElementById('root');
if (root !== null) createRoot(root).render(page(params.get('screen')));
