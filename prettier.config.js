/**
 * @file   prettier.config.js
 * @brief  Prettier formatting options for the kit, the same as Mini Games'.
 *
 * Responsibility: the one source of formatting; ESLint stays out of formatting
 *                 (eslint-config-prettier).
 */

/** @type {import('prettier').Config} */
const config = {
  singleQuote: true,
  printWidth: 100,
};

export default config;
