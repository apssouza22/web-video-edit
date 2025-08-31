# Task execution plan
Important: Always plan the task step by step before writing code. Ask for permission to proceed with the plan .
Important: Before proceed with the plan, create a new file named `tasks/name-of-the-task.md`. Based on the approved plan, list all necessary implementation steps as GitHub-style checkboxes (`- [ ] Step Description`). Use sub-bullets for granular details within each main step.
**CRITICAL: After you successfully complete each step, you MUST update the `tasks/name-of-the-task.md` file by changing the corresponding checkbox from `- [ ]` to `- [x]`.**
Only proceed to the *next* unchecked item after confirming the previous one is checked off in the file. Announce which step you are starting.

## Javascript and TypeScript Code Style Guide
Ensure one class per file and use PascalCase for class names.
Also use private methods for any helper functions that are not intended to be used outside the class.
In javascript use # for private methods
Avoid using global variables or functions that are not encapsulated within a class.
Avoid coupling packages. Preference to use events for communication between different packages.Ensure self-contained packages.
Avoid adding code that is not being used in the current task.
Avoid comments describing functionality ensure self describing code

# Repository Guidelines

## Project Structure & Module Organization
- `assets/js/`: Core source (ES modules). Domains: `audio/`, `demux/`, `muxer/`, `timeline/`, `studio/`, `record/`, `frame/`, `layer/`, `common/`, `transcription/`.
- `assets/css/`: Styles and fonts.  `index.html`: app shell for local dev.
- `tests/`: Jest tests, setup, and mocks. Key files: `tests/setup.js`, `tests/services/*.test.js`.
- Config: `package.json` (scripts), `jest.config.js` (jsdom, coverage), `.github/` (automation), `README.md` (usage).

## Build, Test, and Development Commands
- `npm install`: Install dependencies.
- `npm start`: Serve locally at `http://localhost:8080` using `http-server`.
- `npm test`: Run Jest once in jsdom.
- `npm run test:watch`: Re-run tests on change.
- `npm run test:coverage`: Generate coverage (targets `assets/js/**/*.js`, excluding entry/worker files).
- Example (single file): `npm test tests/services/frame-service.test.js`.

## Coding Style & Naming Conventions
- Language: Vanilla JS (ES modules), browser-first. Avoid Node-only APIs in `assets/js`.
- Indentation: 2 spaces; line width ~100 chars.
- Filenames/dirs: kebab-case (e.g., `layer-image.js`, `video-export.js`).
- Symbols: `camelCase` for functions/vars, `PascalCase` for classes, `UPPER_SNAKE_CASE` for constants.
- Module imports: relative from `assets/js`. In tests, `@/` maps to `assets/js/` via Jest.

## Testing Guidelines
- Framework: Jest with `jsdom` environment.
- Location: Place new tests under `tests/services/` (or create a subfolder mirroring `assets/js` domain).
- Naming: `*.test.js` or `*.spec.js` (matched by Jest config).
- Coverage: Keep or improve coverage (`npm run test:coverage`). Use `tests/setup.js` mocks for Web APIs (MediaRecorder, Worker, Canvas, etc.).

## Commit & Pull Request Guidelines
- Commits: Imperative, concise subject (≤ 50 chars). Example: `Add video speed control`. Use additional body lines for rationale and tradeoffs.
- Scope: Group related changes; include tests when modifying logic.
- PRs: Provide clear description, reproduction steps, and screenshots/GIFs for UI changes. Link related issues. Note any known limitations and follow-up tasks.

## Security & Configuration Tips
- Do not commit large media assets; prefer small samples in `assets/` for demos/tests.
- Keep browser compatibility in mind (see `assets/js/common/browser-support.js`). Gate experimental APIs behind checks and fallbacks.
