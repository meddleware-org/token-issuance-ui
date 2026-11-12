# Changelog

All notable changes to `@meddleware/token-issuance-ui` are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.0.47] - 2026-11-12

### Changed

- The company mark and the favicon set come from the shared brand plugin (`@meddleware/frontend-config` 0.0.8, `name: 'Token Issuance'`; `@meddleware/ui` 0.1.42 shows the mark beside the title in the shell header). The blue "S" stand-in icons (`public/favicon.svg`, `public/favicon.ico`) and the icon links in `index.html` are removed; the build now emits the favicon, Apple touch icon, 192/512 icons and a web manifest.
- The social card (`public/og-image.png`) is redrawn in the design tokens' dark palette with the system font stack and the company mark beside the headline (the old card used an off-palette blue); `npm run gen:og-image` reads the colours from `@meddleware/design-tokens`.
- The licence picker and the downloaded or pushed source package no longer fetch licence text from `raw.githubusercontent.com`: the texts of the 27 licences offered (the previous list had every non-deprecated SPDX licence) are vendored in `src/lib/license-texts.json`, generated from the CC0 `spdx-license-list` package by `npm run gen:licenses` and checked against the generator by a test. The page now calls no origin for a licence; `api.github.com` is called only when the user explicitly pushes the package to their own GitHub. `fetchLicenseList` / `fetchLicenseText` are replaced by `loadLicenseCatalogue` / `getLicenseText` (internal module).
- `tests/third-party.test.ts` (run on the built `dist/` in CI) fails if the sources or the build name a web font, CDN, tracker or any host other than the Sui RPC, the Walrus relay, aggregator and publisher and, for the explicit push, `api.github.com`; `DO_NOT_TRACK=1` is set in every workflow.
- Takes `@meddleware/ui` ^0.1.42, `@meddleware/frontend-config` ^0.0.8 and `@meddleware/web-utils` ^0.0.4; adds the dev dependency `spdx-license-list` ^6.12.0.

## [0.0.46] - 2026-11-07

### Fixed

- The page now says exactly what the chain allows for each policy. The metadata hint said the name, symbol, description or icon could be changed later; the symbol and decimals can never change, while whoever holds the MetadataCap can change the name, description and icon unless the metadata is frozen. The form's policy selects show the statement for the chosen option, and the review and result panels list the same statements (TreasuryCap, MetadataCap, UpgradeCap), the review naming the permanent values for the chosen policies. The footer disclaimer no longer says the name is always permanent.
- The review states the exact fee in SUI (from the build's fee), that it goes to the Meddleware platform treasury (with the address), that it is not refundable, and the gas set aside for the publish transaction.
- The icon upload said an icon is stored "~2 years" on every network; it is about 2 years on mainnet and 53 days on testnet (a testnet epoch is one day, and testnet can be reset). The "permanent blob" text no longer suggests the blob is kept indefinitely.
- The end-to-end build gives the testnet a stand-in fee treasury, so the wizard is open in the mocked browser tests (a network without a treasury is closed).

### Changed

- Wording for the reader: "operator" is gone from the review, the terms and the relay text (Meddleware, the platform treasury); the terms are rewritten for accuracy (what runs in the browser and what talks to the network, fees and gas are irreversible too) and lose the joke line; the page title reads "Meddleware"; `<b>` is `<strong>`, `<code>` or `<dfn>` by meaning and the `<br>`-laid-out hints are plain sentences with a visible per-option statement.
- The standalone shell is the shared `AppToolShell` (page heading, footer documentation links, copyright), with the network select in its actions and a visible "Network" label. The developer link points at the coin template's developer pages.
- Shared tooling from `@meddleware/frontend-config` 0.0.7: `mw-audit-gate`, `mw-third-party-licenses`, `mw-check-csp-inline` (new `check:csp` in CI and the image build), `mw-sync --check` in CI, `meddlewareApp` and `vueTestConfig`. The local audit-gate and licence scripts are removed. Takes `@meddleware/ui` ^0.1.40, `@meddleware/web-utils` ^0.0.3, `@meddleware/walrus-storage-kit` ^0.1.38 and `@meddleware/wallet-adapter` ^0.0.22; the wallet-adapter peer range is now `>=0.0.22 <0.2.0` (the shell reads `useNetwork().explorerNetwork`).
- Removed the unused Cloudflare Pages files `public/CNAME`, `_headers` and `_redirects` (the image is served by static-server) and the stale scaffold test `src/__tests__/App.spec.js`.

## [0.0.45] - 2026-11-06

### Changed

- Takes `@meddleware/ui` ^0.1.39 (the tab list items use `role="none"`) and the Dependabot merges of 2026-11-06: image bases `static-server` 0.1.12 and a refreshed `node` build image, and newer dev tools.

## [0.0.44] - 2026-11-05

### Security

- The production-bundle scan is the shared `check-prod-bundle` (it replaces this repository's own script and now also runs in the image build); CI and the image build scan the production bundle for the e2e harness (`check-prod-bundle` from `@meddleware/frontend-config`), CI proves a production build with `VITE_E2E=1` is refused, and `src/e2e*.ts` is no longer in the published package.

### Changed

- Dependency alignment: `@meddleware/ui` ^0.1.38 (form-field edge contrast, sticky-offset and focus-not-obscured fixes), `@meddleware/design-tokens` ^0.1.13, `@meddleware/web-utils` ^0.0.2 and `@meddleware/frontend-config` ^0.0.2 (the shared sweep now also checks that focus is not hidden behind fixed content).
