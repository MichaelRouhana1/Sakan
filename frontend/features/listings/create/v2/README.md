# Units wizard prototype

Branch: `wizard-units-v2`. Baseline: `82918daa859248e4d2ed957129df10d36fa1edef` (`wizard-cards-v1`).

V2 requires `__DEV__`, web, and the exact `wizard=v2` query parameter. Native, production builds, and `/create` without the flag retain the existing wizard. V1's provider, shell, step order and draft storage are unchanged.

## Local review

- Fresh form: [http://localhost:8082/create?wizard=v2](http://localhost:8082/create?wizard=v2)
- One-unit example: [http://localhost:8082/create?wizard=v2&demo=one](http://localhost:8082/create?wizard=v2&demo=one)
- Copy example: [http://localhost:8082/create?wizard=v2&demo=three](http://localhost:8082/create?wizard=v2&demo=three)
- Existing-place example: [http://localhost:8082/create?wizard=v2&demo=existing](http://localhost:8082/create?wizard=v2&demo=existing)

Examples use clearly labeled sample data and sample credit quotes. The copy example starts after the first unit so Copy this unit can be tried immediately. The existing-place example starts at layout. Example photos come from existing local housing demo media, copied into the frontend's public assets.

Every URL resumes its own browser draft. Append `&new=1` to restart that example; it replaces that example's v2 draft. A real owned place can be loaded with `&placeId=<id>` and the existing authenticated API.

## Behavior and boundaries

Place screens run once, followed by four unit screens and Add another unit. Copies are independent, have no photos and append ` (copy)` to the title. At the 60-character title limit the source portion is shortened to keep the suffix visible. Start blank resets all unit fields. A maximum of 20 units is supported.

The summary after every unit shows every unit's cover, title and rent. Review supports edits/removal, shared contact, per-unit credit costs, and a total. Publish all validates and displays a simulated success; this prototype never calls `POST /api/listings/publish-units`.

Drafts live under `studently.wizard-units-v2.v1:<owner>:<place>:<example>` in browser storage. Shared place data, contact and independently identified units are saved together with navigation. Field saves debounce for 700ms; navigation, Save & exit, page hiding and visibility changes flush the checkpoint. Upload callbacks target stable unit IDs, including after navigation; deleted IDs ignore late callbacks. Interrupted uploads restore with an error and recovery controls. Saving failure is visible and prevents Save & exit or simulated publishing from discarding the in-memory draft.

Normal photo intake uses the existing crop/upload pipeline and media API. The examples also offer Use 3 example photos. No backend schema, migrations or draft API changes are required. Account-wide synchronization and real publishing are outside this prototype.

## Verification

From the repository root:

```powershell
node --test frontend/tests/wizard-units-v2.test.mjs frontend/tests/unit-wizard.test.mjs
node frontend/tests/wizard-units-v2-ui.mjs
```

The UI suite expects the development server at port 8082; override `STUDENTLY_TEST_URL` if needed. It mocks API responses, exercises browser photo decoding/cropping, records six videos and captures desktop/mobile/tablet screenshots under `artifacts/wizard-units-v2`.

Production gate verification after a SPA export:

```powershell
node frontend/tests/wizard-units-v2-production.mjs
```

The production test serves `.expo/wizard-v2-production-spa` temporarily, requests the v2 flag, and verifies the original wizard is rendered.
