# Optional Cyber Engine Tweaks export (experimental)

The main save-file reader does **not** need this mod. The script targets game 2.50 / CET 1.38.0. Public getter bodies and the CET bindings were checked, and mock/syntax tests passed, but the actual in-game RTTI bridge has not been tested.

If you choose to install it, close the game, keep a backup and copy `DatatermTracker` into your own located game directory under `bin/x64/plugins/cyber_engine_tweaks/mods/`. Do not overwrite another folder. No dependencies are installed automatically.

Load a save and open CET. Click “Exportar JSON y CSV”, or run `GetMod("DatatermTracker").Export()`. Confirm a nonzero count and zero errors. Import the generated JSON into the HTML app. Export files are written only inside the mod folder. Do not export twice in the same second (timestamp filenames).

The script targets 2.50 but cannot independently confirm the commercial game version: check the game menu first. It uses only the audited fast-travel getters, does not register/unlock nodes and does not queue requests. Runtime count/record differences with the catalog disable confident missing-point assertions. NodeRefs may be formatted as hashes; record IDs remain exact decimal strings.
