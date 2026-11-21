/**
 * @file   showcase/main.tsx
 * @brief  The showcase's entry: the kit's CSS, the theme from `?theme=`, and the page.
 *
 * Responsibility: imports every kit stylesheet as a game does, sets `?theme=light|dark` on
 *                 <html> before the first render (without it the early script's rule applies,
 *                 through the toggle), and renders ./Showcase, the result instead of the start
 *                 card with `?screen=result`.
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
import './showcase.css';

import { createRoot } from 'react-dom/client';

import { storeTheme } from '../src/theme.js';
import { Showcase } from './Showcase.js';

const params = new URLSearchParams(window.location.search);
const theme = params.get('theme');
// The toggle starts from the stored choice, so the page's theme is stored first.
if (theme === 'light' || theme === 'dark') storeTheme(theme);

const root = document.getElementById('root');
if (root !== null) createRoot(root).render(<Showcase result={params.get('screen') === 'result'} />);
