# Cyberpunk 2077 Dataterm Tracker — Missing Fast Travel Points / Frequent Flyer

Find the fast-travel dataterms missing from **your own Cyberpunk 2077 save**, without comparing hundreds of map icons by hand.

**Read-only · Local processing · Windows portable app · No game mods required · Spanish interface with English location names**

> **Preview release.** Verified save format: **Cyberpunk 2077 2.50, saveVersion 277 / gameVersion 2500**. Other versions are rejected. This is not a claim of compatibility with every Cyberpunk patch, console save format, or modded catalog.

## Download and use

1. Open [Releases](https://github.com/cadugi/cyberpunk2077-dataterm-tracker/releases) and download the Windows x64 ZIP when the build is available.
2. Extract the ZIP and run `Cyberpunk-Dataterm-Tracker.exe`.
3. **Choose the current `sav.dat` yourself.** Save in the game first and wait until saving finishes. The picker normally opens `%USERPROFILE%\Saved Games\CD Projekt Red\Cyberpunk 2077`.
4. The app creates a private snapshot in `output/backups/`, checks SHA-256 before/after, reads the snapshot and opens `output/index.html` in your browser.
5. Browse **discovered**, **verified missing**, and **unverified** points by district. Search Spanish names, English names or internal IDs. Use the embedded map to inspect verified coordinates.

The report displays the selected slot and save modification time, so an older autosave is not silently mistaken for your latest manual save. Re-run the app and choose the new save after discovering more points. Automatic latest-save selection is available only with the explicit `--latest` option.

The executable is **unsigned**; no trusted code-signing certificate is bundled or claimed. Source code and SHA-256 checksums are available for inspection. You can also run the Python source instead.

## Run from source

Requires Python **3.10 or newer**. The reader has no pip runtime dependencies; the small upstream parser is vendored with its license. Tkinter is needed only for the file picker.

```powershell
python tracker.py
python tracker.py --save-file "D:\MySaves\ManualSave-1\sav.dat"
python tracker.py --saves-dir "D:\MySaves" --latest
python tracker.py --save-file "D:\MySaves\ManualSave-1\sav.dat" --output "D:\TrackerReport" --no-open
python tracker.py --import-json "D:\dataterms-export.json"
```

Or double-click `Run-Tracker.cmd` when Python is installed. `--output` must be outside the selected save directory. Output files stay on your computer and are ignored by Git.

Opening the repository's `index.html` directly starts **without anyone's save loaded**. Import an extraction JSON, or use the reader above to create a report. The HTML app needs no server, Python or Node once a report has been generated.

## Features

- Exact internal TweakDB IDs, not matching by display name or map visibility.
- JSON and CSV extraction, comparison CSV and a readable `RESULTADO.md` report.
- District grouping, search and filters for discovered/missing/unverified points.
- English and Spanish location names from the verified catalog.
- An interactive **local schematic coordinate map inside an iframe**, with zoom, pan, status filters and “Ver en el mapa” buttons. It works offline and includes only points with verified coordinates; it is not a street map or route planner.
- An **optional Piggyback street-map iframe**. It connects to the provider only after clicking “Cargar mapa oficial”. A direct-link fallback is always available because providers may block framing or require an account. **No save data is sent to that map.**
- Nearest discovered dataterms where coordinates are available; distances are straight lines, not guaranteed traversable routes.
- An optional manual CET export script in `cet/DatatermTracker`. It is not installed automatically and remains **experimental: mocked/syntax tested, not tested in-game**.

## Why 166, 245 and 157 are different numbers

**166 is the number of location groups in this catalog**, including Dogtown and treating Panam's moving camp as one group. The catalog retains **245 internal FastTravelPoint records**, including hidden metro entries, historical records and development destinations. Neither number is a universal mandatory achievement checklist.

For the inspected 2.50 files, `Achievements.GetMeThereScottie.thresholdValue` is **157**. The system also has a separate value of 159. Its achievement update code counts registered nodes whose record has `ShowOnWorldMap=true` and whose saved flag is `isEP1=false`, and sends updates on changed **even counts**. The percentage shown by this app reconstructs that counter; it does **not** read or change Steam's achievement state.

The public catalog currently verifies **156 base record IDs against typed terminal data** for asserting a missing destination. It retains uncertainty for both camp variants and four other base records lacking sufficient active-terminal proof. A registered exact ID is still recognized as discovered. An absent uncertain ID stays **NO VERIFICADOS**. The coverage number is not an achievement requirement.

There are published lists with different totals, duplicated names and old metro names. They were cross-checked as secondary references, not used to manufacture missing IDs. See [catalog methodology and sources](docs/VALIDATION.md).

## Safety and privacy

The reader copies the selected save, parses the copy and verifies that original and copy hashes stay unchanged. It disables the vendored parser's save-writing method. It does not unlock dataterms, teleport V, set quest facts, edit stats, install mods, alter original game files, or invoke achievement operations.

There is **no save upload, analytics, remote backend or automatic external request**. The optional street map is the only external embedded content. Keep `output/` private: it includes a snapshot of your save. Please **do not attach a full save or personal filesystem paths to public issues**; a small redacted extraction or synthetic reproduction is preferable.

## Compatibility and known limits

| Component | Status |
|---|---|
| Windows x64 + game/save 2.50 / 277 / 2500 | Reader tested against real copies and synthetic fixtures |
| Phantom Liberty | Recognized; counting uses the saved EP1 flag rather than district-name guessing |
| Other game versions | Rejected pending validation |
| Mods adding/changing dataterms | Unknown IDs stay unverified; runtime differences can suppress missing-point assertions |
| Steam achievement unlock | Not tested, queried or modified |
| Temporary quest/mission access | Not determined from discovery state |
| CET export | API audited; in-game bridge test still pending |

The app reports the **selected save**, not unsaved live game memory. A missing map icon is not proof of an undiscovered destination. Some destinations depend on quests, and names alone cannot resolve their identity.

## Tests and builds

```powershell
python -m unittest discover -s tests -v
node tests/test_compare.js
npm ci
npx playwright install chromium
node tests/test_browser.js
python -m pip install pyinstaller==6.22.3
python build_windows.py
```

Tests use **invented save fixtures**, not a maintainer's private save. CI tests the parser/comparison and builds a portable Windows ZIP with checksums. See [VALIDATION.md](docs/VALIDATION.md) for what was and was not validated, and [CONTRIBUTING.md](CONTRIBUTING.md) for changes to the catalog.

## AI disclosure

This project was developed with substantial assistance from **OpenAI Codex / generative AI** for research, implementation, documentation and test generation, under the maintainer's direction. AI-generated output can be wrong. Tests and catalog provenance are provided so findings can be checked; AI assistance is not evidence of full in-game validation. The project is an independent fan tool, not affiliated with or endorsed by CD PROJEKT RED, Steam or Piggyback.

## Licenses and credits

Application code: [MIT](LICENSE). The vendored **CyberpunkPythonHacks** parser by Ali Farzanrad retains its upstream permissive license in `vendor/LICENSE`; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Cyberpunk names and game content belong to their respective owners. No game archives, decompiled game scripts, complete localization resources or private saves are distributed.

---

**Español:** ejecuta el programa, elige expresamente el `sav.dat` actual y consulta `output/index.html`. El guardado original se conserva intacto. **DESCUBIERTOS** exige presencia del ID exacto; **PENDIENTES** exige además una extracción completa y un terminal verificado; **NO VERIFICADOS** conserva cualquier incertidumbre. El mapa local es esquemático; el mapa oficial con calles se carga opcionalmente por Internet. Solo se admite el formato 2.50 validado, no cualquier parche. El proyecto está desarrollado con ayuda sustancial de IA y se publica como versión preliminar.
