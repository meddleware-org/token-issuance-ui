// Builds the deploy Executor from the wallet-adapter's shared executor, executing through this
// app's gRPC client (`getReadClient`, which E2E builds stub) and asking for the effects and
// object types `extractPublishResult` needs. Signing, the chain check and the account binding
// are the wallet-adapter's.

import { buildExecutor } from '@meddleware/wallet-adapter'
import type { Transaction } from '@mysten/sui/transactions'
import { toSuiTxResult, type Executor, type SuiTxResult } from '@meddleware/token-issuance-client/deploy'
import type { TokenNetwork as Network } from '@meddleware/token-issuance-client'
import { getReadClient } from '../wallet.js'
import { RPC_URLS } from '../config.js'

/**
 * Build a deploy Executor bound to the currently connected wallet and `network`.
 *
 * `signAndExecute` requests `effects + objectTypes` and maps the result with
 * {@link toSuiTxResult}, so the caller can extract the published package id, coin type,
 * TreasuryCap, MetadataCap and the Currency ref. A failed transaction is returned (not thrown);
 * `deploy.ts` checks its status.
 *
 * @throws {Error} if no wallet is connected, it cannot sign transactions, or its account does not
 *   list `sui:<network>`.
 */
export async function buildDeployExecutor(network: Network): Promise<Executor> {
  // The shared executor, bound to the connected wallet, the network and this app's read client.
  const executor = await buildExecutor(network, RPC_URLS[network], { client: getReadClient(network) })
  return {
    // Sign and execute, asking for the effects and object types the result extraction needs.
    async signAndExecute(tx: Transaction): Promise<SuiTxResult> {
      // A failed transaction is returned, not thrown: the deploy code checks its status.
      const { result } = await executor.signAndExecute(tx, { include: { effects: true, objectTypes: true } })
      return toSuiTxResult(result)
    },
    async waitForTransaction(digest: string): Promise<void> {
      await executor.waitForTransaction(digest)
    },
  }
}
