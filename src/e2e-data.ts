// What the end-to-end build's stub chain returns, apart from the code that installs it (`e2e.ts` pulls in the mock wallet, which a
// Playwright spec, running in Node, cannot load): the specs import these to look for the right things.
export const E2E_PACKAGE_ID = `0x${'bb'.repeat(32)}`
/** The fabricated publish digest (`npm run check:bundle` fails a production build that contains it). */
export const E2E_PUBLISH_DIGEST = 'E2E' + 'a'.repeat(41)
