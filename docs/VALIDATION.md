# Validation, provenance and catalog coverage

Catalog revision: `2026-11-08-public-1`. Target: game 2.50, saveVersion 277 / gameVersion 2500. These are separate version numbers.

## Evidence hierarchy

1. Installed 2.50 scripts were inspected on a copy using redscript CLI 0.5.32. `FastTravelSystem.GetFastTravelPoints()` returns the persistent registration array. `GetAmmountOfFastTravelPointsOnMap()` counts `ShowOnWorldMap && !IsAnEP1Node`. `DataTrackingSystem` reads the achievement record's threshold; the fast-travel request does not override it.
2. TweakDB records/flats were read from the installed base and EP1 databases. Record names were resolved from CET metadata; names and districts from installed localization. Only a small factual catalog of IDs, labels, flags and coordinates is shipped, not those resources.
3. Three always-loaded world sectors were read using the 2.50 compiled-node layout documented by WolvenKit's current source (144 bytes). All 43,414 transform instances passed index, finite-coordinate and padding checks. 306 fast-travel-related markers were identified using the SDK's actual NodeRef hash rules (skip `#` and `;...` suffixes).
4. **3,263 nearby world sectors** were inspected to read typed links `entEntityInstanceData → DataTerm → gameFastTravelPointData → pointRecord/markerRef`. There were zero parser exceptions, 280 links and 213 unique IDs, including hidden secondary entries. A shared marker or name is not sufficient to merge records.

Raw sectors, decompiled scripts, full localization and the maintainer's real saves are deliberately not in this repository. Minimal per-record sector/package references are retained in `data/reference.json`.

## Coverage and uncertainty

245 internal records are retained. Base/expansion destinations form **166 groups** when the two Aldecaldos camp variants are grouped together. This is a directory count, not a proof that every group is simultaneously reachable or required.

**156 base IDs have direct terminal evidence and are eligible for a missing-point assertion.** Six base record IDs remain conservative if absent:

- Both `bls_nth_dataterm_03` and `bls_nth_dataterm_06`: mission-dependent camp variants. Do not demand a second camp merely because its ID is absent.
- `wat_lch_dataterm_08`: Ellison Plaza; distinct from metro records with similar names.
- `cct_cpz_dataterm_03`: Reconciliation Park.
- `cct_cpz_metro_ftp_03`: Metro: Memorial Park.
- `combat_zone_stadium_dataterm_01`: EBM Petrochem Stadium.

These records can be recognized as discovered when present. Their absence stays unverified until active-terminal proof is added. Absence of a visual icon is never used. A temporary global fast-travel lock is not interpreted as undiscovered.

The EBM stadium record comes from the EP1 database but can have `isEP1=false` in a save. Count according to the saved flag; do not exclude every record merely because its definition came from EP1. Unknown IDs suppress a confident achievement percentage. Partial extraction or CET/runtime mismatches suppress new missing-point assertions.

## Additional public-list cross-check

The following independent references were checked on 2026-11-08:

- [PowerPyx](https://www.powerpyx.com/cyberpunk-2077-all-fast-travel-dataterms-locations/): a historical guide whose headline gives 160. The eight ordered district/subregion lists contain **159 entries**. **147** matched current catalog labels after mechanical normalization; the remaining **12** use renamed metro stops, a spelling variation, an alternative camp label or old location names. This demonstrates why headline totals and label-only joins are not reliable IDs. No unresolved name was automatically assigned a new ID.
- [CaptainDK12's 166-location community list](https://www.reddit.com/r/cyberpunkgame/comments/1ak8xqm/frequent_flyer_achievement_all_fast_travel/): explicitly includes Dogtown and treats the moving camp as one. Comments identify duplicated entries and a missing Wellsprings stop. It is useful for aliases and omissions, not a definitive 2.50 achievement contract. Its image/table was not used as an audited 166-ID dataset.
- [CD PROJEKT RED's Update 2.1 notes](https://www.cyberpunk.net/en/news/49597/update-2-1-patch-notes): official confirmation of **19 metro stations on five lines**, not the total dataterm count or a 2.50 achievement checklist.
- [Cyberpunk2077-map.com marker index](https://cyberpunk2077-map.com/night-city): checked as an additional map directory. Its many marker categories cannot be equated to dataterms or achievement requirements.
- [Cyberpunk Wiki's dataterm list](https://cyberpunk.fandom.com/wiki/Cyberpunk_2077_Fast_Travel_Dataterms): discovered but direct access was restricted; not counted as a successfully audited list.

Examples of historical labels requiring care: Zocalo / Megabuilding H10, Farrier St / Farrier & Ferguson, Ellison St / Ellison Plaza, Monroe St / Monroe & Sagan. Republic Way, Market St and Stadium labels need record/marker evidence; a similar string alone does not merge them. There is no claim that all 166 entries in every online list have been independently visited in-game.

## Actual tests

- Real save copies were parsed privately before and after one newly discovered dataterm. The exact new ID was recognized and pending count decreased by one; original/copy SHA-256 values remained unchanged. No actual save, slot metadata or those hashes are shipped as test fixtures.
- Synthetic binary saves exercise header/version checks, LZ4 chunk reading, typed package handles, record IDs, NodeRef and EP1 flags.
- Comparison tests cover hidden icons, complete/partial extraction, unknown/malformed IDs, quest-dependent camps, EP1 exclusion and runtime mismatch.
- Local HTML tests cover a clean no-save state, import/error preservation, filters, CSV, iframe map focus/zoom, small-screen layout and no network requests before the optional external map is loaded.
- Lua syntax/API calls have been audited and mocked previously. **No CET in-game execution is claimed.** No achievement unlock was tested or forced.

## Primary technical references

- [CET 1.38.0 for game 2.5](https://github.com/maximegmd/CyberEngineTweaks/releases/tag/v1.38.0), source commit `ed706fb8518712ffedf6b566e52873b257bc49fb`.
- [redscript CLI 0.5.32](https://github.com/jac3km4/redscript/releases/tag/v0.5.32).
- [REDmodding: native terminal record/marker layout](https://wiki.redmodding.org/cyberpunk-2077-modding/modding-guides/world-editing/devices/custom-fast-travel-points).
- [WolvenKit compiled-node reader](https://github.com/WolvenKit/WolvenKit/blob/main/WolvenKit.RED4/Archive/IO/worldNodeDataReader.cs) and [package reader](https://github.com/WolvenKit/WolvenKit/blob/main/WolvenKit.RED4/Archive/IO/RedPackageReader.File.cs). WolvenKit 9.1.0 extracted resources, but its full sector JSON conversion failed on 2.50; that failure was not treated as validation.
- [RED4ext SDK NodeRef hash](https://github.com/WopsS/RED4ext.SDK/blob/master/include/RED4ext/NodeRef.hpp).
- [CyberpunkPythonHacks](https://github.com/fmwviormv/CyberpunkPythonHacks), commit `1359891aac0f9a652e76848e0c8d5a25109432f9`.
- [Cyberpunk25SaveEditor](https://github.com/desfpc/Cyberpunk25SaveEditor), inspected for its documented 277/2500 version gate; its editor is not used.

This is an AI-assisted preview, not a guarantee of perfect extraction for every mod stack. Please propose catalog changes with exact IDs, version and minimal evidence, not just map-icon screenshots.
