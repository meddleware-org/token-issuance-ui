// End-to-end build only (`vite build --mode e2e`; main.ts loads this when MODE is `e2e` and VITE_E2E is `1`, both static, so every other
// build drops it). A mock wallet is registered like an extension, and the chain client is a stub: gRPC-web responses are binary and cannot
// be faked at the fetch layer. The stub returns a successful publish whose effects carry the created TreasuryCap, MetadataCap and Currency,
// and no owned objects.
import { createStubClient, installE2eWallet } from '@meddleware/wallet-adapter/testing'
import { E2E_PACKAGE_ID, E2E_PUBLISH_DIGEST } from './e2e-data.js'

/** Register the mock wallet with a stub chain whose publish succeeds and whose effects carry a TreasuryCap, a MetadataCap and a Currency. */
export function installE2e(): void {
  // id(byte): a 32-byte object id made of one repeated byte.
  const id = (byte: string) => `0x${byte.repeat(32)}`
  const treasuryCapId = id('cc')
  const metadataCapId = id('dd')
  const currencyId = id('ee')
  // created(id): the effects entry for an object the transaction created.
  const created = (objectId: string) => ({ objectId, outputState: 'ObjectWrite', idOperation: 'Created', outputVersion: '1', outputDigest: E2E_PUBLISH_DIGEST })
  // The stub's answer to the publish transaction: success, the changed objects and their types.
  const executed = {
    $kind: 'Transaction',
    Transaction: {
      digest: E2E_PUBLISH_DIGEST,
      status: { success: true, error: null },
      effects: {
        changedObjects: [
          { objectId: E2E_PACKAGE_ID, outputState: 'PackageWrite', idOperation: 'Created' },
          created(treasuryCapId),
          created(metadataCapId),
          created(currencyId),
        ],
      },
      objectTypes: {
        [treasuryCapId]: `0x2::coin::TreasuryCap<${E2E_PACKAGE_ID}::mytoken::MYTOKEN>`,
        [metadataCapId]: `0x2::coin_registry::MetadataCap<${E2E_PACKAGE_ID}::mytoken::MYTOKEN>`,
        [currencyId]: `0x2::coin_registry::Currency<${E2E_PACKAGE_ID}::mytoken::MYTOKEN>`,
      },
    },
  }
  installE2eWallet({ client: createStubClient({ executed }) })
}
