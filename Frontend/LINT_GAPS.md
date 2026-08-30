# Lint Gaps & Technical Debt

- **Missing ESLint Configuration**: The script `pnpm lint` in `package.json` relies on `eslint`, but the project is missing an `.eslintrc` or `eslint.config.js` file. `pnpm lint` fails with `ESLint couldn't find a configuration file.` No action taken to fix this in Phase 8 as it's an existing issue.
