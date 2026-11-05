# Changelog

All notable changes to `@meddleware/token-issuance-ui` are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.0.44] - 2026-11-05

### Security

- The production-bundle scan is the shared `check-prod-bundle` (it replaces this repository's own script and now also runs in the image build); CI and the image build scan the production bundle for the e2e harness (`check-prod-bundle` from `@meddleware/frontend-config`), CI proves a production build with `VITE_E2E=1` is refused, and `src/e2e*.ts` is no longer in the published package.

### Changed

- Dependency alignment: `@meddleware/ui` ^0.1.38 (form-field edge contrast, sticky-offset and focus-not-obscured fixes), `@meddleware/design-tokens` ^0.1.13, `@meddleware/web-utils` ^0.0.2 and `@meddleware/frontend-config` ^0.0.2 (the shared sweep now also checks that focus is not hidden behind fixed content).
