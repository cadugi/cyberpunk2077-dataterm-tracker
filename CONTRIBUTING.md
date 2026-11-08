# Contributing

Report the game version, save format if known, OS and a minimal description. Do not post full saves, account identifiers, private filesystem paths or credentials. Synthetic examples and small redacted extraction snippets are preferred.

Catalog corrections need exact `FastTravelPoints.*` IDs and evidence of the active terminal/marker or a repeatable read-only test. Do not mark a point missing just because its icon disappeared. Keep uncertain quest-dependent variants unverified; do not silently merge IDs with the same localized name.

Run `python -m unittest discover -s tests -v`, `npm ci`, `npm test`, and `node tests/test_browser.js` after installing Playwright Chromium. Tests must not depend on a real user's saves or game installation. Disclose material AI assistance in contributions, and describe how generated changes were checked.
