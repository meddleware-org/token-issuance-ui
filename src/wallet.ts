// The app's wallet and Sui read client. The wallet is the shared @meddleware/wallet-adapter singleton bound to the selected network
// (deploying signs transactions, so only wallets that can are listed); the read client is the adapter's shared, memoised gRPC client for the
// configured RPC URL (public fullnodes have dropped JSON-RPC). E2E builds stub the client through the adapter's testing module.
import { createToolWallet, getSuiClient } from '@meddleware/wallet-adapter'
import type { SuiGrpcClient } from '@mysten/sui/grpc'
import type { TokenNetwork } from '@meddleware/token-issuance-client'
import { RPC_URLS } from './config.js'

export const { useWallet, signPersonalMessage } = createToolWallet({ requiredFeatures: ['sui:signTransaction'] })

/** The read client for `network` (an E2E stub when the adapter has one set). */
export function getReadClient(network: TokenNetwork): SuiGrpcClient {
  return getSuiClient(network, RPC_URLS[network])
}
