# Open standards and interoperability: token-issuance-ui

Create a Sui coin from the browser.

Served at `sui-token-issuance.meddleware.co.uk`.

This page lists what the project speaks today, what is planned, what was considered and does not apply, where someone else can extend it, and what proves each claim. The platform-wide list is [Standards we use](https://meddleware.dev/platform/standards). A row appears there in the same change that turns a standard on.

## Spoken today

- Content Security Policy (W3C), sent as a header
- HTTP Strict Transport Security (RFC 6797)
- Web App Manifest (W3C)
- Robots Exclusion Protocol (RFC 9309) at /robots.txt
- llms.txt (a community convention, not a formal standard)
- WCAG 2.2 level AA with AAA contrast (W3C), tested on every change
- No cookie and no browser storage before an action, tested on every change
- RFC 3339 timestamps
- Wallet Standard (connects any compatible wallet, through @meddleware/wallet-adapter)
- A sitemap (sitemaps.org) at /sitemap.xml
- Open Graph tags and an image
- The source package of every coin is downloadable (.zip, the Move package that matches the deployment)

## Planned

- /.well-known/security.txt (RFC 9116) and one source for robots.txt and llms.txt
- A machine-readable export of a deployment's result (JSON: coin type, package, capabilities)

## Considered, not applicable

- Sign-in with a platform account: wallet tools have no accounts; if a tool ever needs one, the browser uses a session held by a backend, with a __Host- cookie, and never holds tokens in script
- Atom, JSON Feed, WebSub, ActivityPub: a tool, not a publishing surface; the content hub and Link in Bio publish feeds and profiles

## Extension points

- Move template and client: @meddleware/token-issuance-template-sui, @meddleware/token-issuance-client

## What proves it

- e2e/a11y.spec.ts
- e2e/smoke.spec.ts
- tests/wording.test.ts

_Maintained centrally with the platform's interoperability map; changes go through it so every repository says the same thing._
