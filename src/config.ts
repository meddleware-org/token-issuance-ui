// Deployment-wide configuration. Operator values (fee + treasury) are read from
// Vite env vars so they can be set at build/deploy time without code changes.
// See .env.example.
import type { TokenNetwork as Network } from '@meddleware/token-issuance-client'
import { PUBLIC_WALRUS_RELAY_HOSTS, relayGateConfig, requireHttpsHost, type RelayGateConfig, type WalrusNetwork } from '@meddleware/walrus-storage-kit'
import { withRuntimeEnv } from '@meddleware/ui'
import { errorMessage, type SuiNetwork } from '@meddleware/web-utils'

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {}

/**
 * Public gRPC fullnode URLs per network (overridable via `VITE_RPC_*`).
 *
 * These are **gRPC(-web)** endpoints for `SuiGrpcClient` — public fullnodes have
 * deprecated JSON-RPC, so a JSON-RPC-only URL will not work here. Operators should
 * set `VITE_RPC_*` to their preferred (often paid) gRPC endpoint for production to
 * avoid public rate limits.
 */
export const RPC_URLS: Record<Network, string> = {
  mainnet: env.VITE_RPC_MAINNET || 'https://fullnode.mainnet.sui.io:443',
  testnet: env.VITE_RPC_TESTNET || 'https://fullnode.testnet.sui.io:443',
  localnet: env.VITE_RPC_LOCALNET || 'http://127.0.0.1:9000',
}

/** The network as the explorer links know it, or `null` where there is no explorer (localnet). */
export function explorerNetworkOf(network: Network): SuiNetwork | null {
  return network === 'localnet' ? null : network
}

/**
 * The one-off deployment fee (MIST), split from the user's gas coin into the platform
 * treasury inside the publish PTB. Override with VITE_FEE_MIST. Default 2 SUI,
 * sized by the workspace cost model (decision D57).
 */
export const FEE_MIST: bigint = BigInt(env.VITE_FEE_MIST || '2000000000') // 2 SUI default

/** The all-zero address: what an unset treasury reads as, and never a place a fee is sent. */
export const ZERO_ADDR = '0x0000000000000000000000000000000000000000000000000000000000000000'

/** Platform treasury per network, the recipient of the fee (set VITE_FEE_TREASURY_* before launch). */
export const FEE_TREASURY: Record<Network, string> = {
  mainnet: env.VITE_FEE_TREASURY_MAINNET || ZERO_ADDR,
  testnet: env.VITE_FEE_TREASURY_TESTNET || ZERO_ADDR,
  localnet: env.VITE_FEE_TREASURY_LOCALNET || ZERO_ADDR,
}

/**
 * True when a real treasury has been configured for the network. Mainnet stays closed (see `isNetworkOpen`) until the build carries the
 * entity's treasury address in `VITE_FEE_TREASURY_MAINNET`: no personal address is committed as a default.
 */
export function isFeeConfigured(network: Network): boolean {
  return FEE_TREASURY[network] !== ZERO_ADDR
}

/**
 * Whether tokens can be deployed on `network` with this build. A real network (testnet, mainnet) is open only with a fee treasury, so a missing
 * value can never turn into a free deployment; localnet is a developer network and is always open.
 */
export function isNetworkOpen(network: Network, treasuries: Record<Network, string> = FEE_TREASURY): boolean {
  return network === 'localnet' || treasuries[network] !== ZERO_ADDR
}

/** Gas budget for the publish transaction (MIST). */
export const PUBLISH_GAS_BUDGET: bigint = BigInt(env.VITE_PUBLISH_GAS_BUDGET || '500000000')

/** Networks selectable in the UI. Ship testnet first. */
export const SELECTABLE_NETWORKS: Network[] = ['testnet', 'mainnet']

// ---------------------------------------------------------------------------
// Walrus icon-upload configuration
// ---------------------------------------------------------------------------
// Walrus is a separate protocol from Sui; only testnet/mainnet exist (no
// localnet). Icon uploads go through an upload relay (direct-to-storage-node
// writes fail from browsers). The upload is `@meddleware/walrus-storage-client/flow`; see the relay runbook in
// README.md / CLAUDE.md for the operator side.

export type { WalrusNetwork }

/**
 * The operator relay host from `VITE_WALRUS_RELAY_*`, or the public relay when it is unset. walrus-storage-kit
 * accepts only https hosts (plain http on loopback, for a local testbed) and throws for any other, which
 * would blank the icon picker; a build-time value that fails the check is ignored with a warning instead,
 * so the picker falls back to the public relay rather than failing.
 */
export function operatorRelayHost(network: WalrusNetwork, value: string | undefined): string {
  const fallback = PUBLIC_WALRUS_RELAY_HOSTS[network]
  if (!value) return fallback
  try {
    requireHttpsHost(value, `VITE_WALRUS_RELAY_${network.toUpperCase()}`)
    return value
  } catch (e) {
    console.warn(`[token-issuance-ui] operator relay ignored: ${errorMessage(e)}`)
    return fallback
  }
}

/**
 * Upload relay host per Walrus network.
 *
 * Fallback order: `VITE_WALRUS_RELAY_*` (the operator's own relay — the only way
 * to *collect* the native tip as revenue) → the public Mysten relay. Uploads
 * through the public relay still work but tip Mysten, not the operator, so they
 * earn nothing. A user may also override this at runtime by entering a relay URL.
 */
export const WALRUS_RELAY_HOSTS: Readonly<Record<WalrusNetwork, string>> = Object.freeze({
  // Getters: the relay is a machine-zone endpoint that /runtime-config.json may override (ADR-0005),
  // and this module is imported before main.ts has loaded that file.
  get testnet() {
    return operatorRelayHost('testnet', withRuntimeEnv(env).VITE_WALRUS_RELAY_TESTNET)
  },
  get mainnet() {
    return operatorRelayHost('mainnet', withRuntimeEnv(env).VITE_WALRUS_RELAY_MAINNET)
  },
})

/** True when an operator-owned relay (not the public fallback) is configured. */
export function isOperatorRelayConfigured(network: WalrusNetwork): boolean {
  return WALRUS_RELAY_HOSTS[network] !== PUBLIC_WALRUS_RELAY_HOSTS[network]
}

/**
 * gRPC fullnode URL for the Walrus icon-upload client (a `SuiGrpcClient`).
 *
 * Defaults to {@link RPC_URLS} (also gRPC); `VITE_WALRUS_RPC_*` overrides it only when
 * Walrus traffic should use a different fullnode from the deploy path.
 */
export const WALRUS_RPC_URLS: Record<WalrusNetwork, string> = {
  testnet: env.VITE_WALRUS_RPC_TESTNET || RPC_URLS.testnet,
  mainnet: env.VITE_WALRUS_RPC_MAINNET || RPC_URLS.mainnet,
}

/**
 * Maximum relay tip the client will pay, in MIST.
 *
 * COUPLING CONSTRAINT: the Walrus SDK **hard-fails** an upload (throws) if the
 * relay's configured tip exceeds this value. It must therefore be set with
 * generous headroom *above* whatever tip the operator's relay charges — raising
 * the relay tip past this ceiling breaks uploads until the frontend is
 * redeployed with a higher value. Default 0.005 SUI: about 8× the operator
 * relay's worst-case tip (`100_000` MIST + 1 MIST per encoded KiB at 100 MiB).
 */
export const WALRUS_MAX_TIP_MIST: bigint = BigInt(env.VITE_WALRUS_MAX_TIP_MIST || '5000000')

// ---------------------------------------------------------------------------
// NFT-gated relay access (optional)
// ---------------------------------------------------------------------------
// When the operator relay runs behind an access-gate gateway, using it requires
// holding the gate's access NFT. The operator sets the gate id and soulbound flag (default true) per
// network via env; `relayGateConfig` (walrus-storage-kit) fixes the package and PlatformConfig to the
// published access_gate deployment, and `useAccessGate` refuses any other. The price and payees are
// read from the chain, never configured. When no gate id is set the relay is ungated.

/** The gate config for a network, or `null` (ungated) without a gate id or a recorded deployment. */
export function parseAccessGate(network: WalrusNetwork, envSource: Record<string, string | undefined> = env): RelayGateConfig | null {
  const NET = network.toUpperCase()
  const gateId = envSource[`VITE_ACCESS_GATE_ID_${NET}`]
  if (!gateId) return null
  try {
    return relayGateConfig(network, {
      gateId,
      soulbound: (envSource[`VITE_ACCESS_GATE_SOULBOUND_${NET}`] ?? 'true') !== 'false',
    })
  } catch (e) {
    console.warn(`[token-issuance-ui] access gate for ${network} disabled: ${errorMessage(e)}`)
    return null
  }
}

const gates = new Map<WalrusNetwork, RelayGateConfig | null>()

/** The access gate for a Walrus network, or `null` when gating is not configured. Parsed on first use, not at import. */
export function accessGateFor(network: WalrusNetwork): RelayGateConfig | null {
  if (!gates.has(network)) gates.set(network, parseAccessGate(network))
  return gates.get(network) ?? null
}

/** True when an NFT gate is configured for the network's operator relay. */
export function isAccessGateConfigured(network: WalrusNetwork): boolean {
  return accessGateFor(network) !== null
}

/**
 * Maximum icon file size, in bytes (default 100 KiB).
 *
 * This is a UX / predictable-cost guard only — NOT a security control. The
 * authoritative cap is a hard request-body limit at the edge (Cloudflare /
 * reverse proxy in front of the relay); a malicious client bypasses this one.
 */
export const ICON_MAX_BYTES: number = Number(env.VITE_ICON_MAX_BYTES || String(100 * 1024))

/** Accepted icon MIME types (override via `VITE_ICON_ALLOWED_TYPES`, comma-separated). */
export const ICON_ALLOWED_TYPES: string[] = (
  env.VITE_ICON_ALLOWED_TYPES || 'image/png,image/jpeg,image/webp,image/svg+xml'
)
  .split(',')
  .map((t) => t.trim())
  .filter(Boolean)

/**
 * Validate a chosen icon file against the {@link ICON_ALLOWED_TYPES} /
 * {@link ICON_MAX_BYTES} gate. Returns a user-facing error message, or `null`
 * when the file is acceptable.
 *
 * UX / predictable-cost guard only — NOT a security control (a malicious client
 * bypasses it; the authoritative cap is the edge request-body limit).
 */
export function validateIconFile(file: { type: string; size: number }): string | null {
  if (ICON_ALLOWED_TYPES.length && !ICON_ALLOWED_TYPES.includes(file.type)) {
    const allowed = ICON_ALLOWED_TYPES.map((t) => t.replace('image/', '')).join(', ')
    return `Unsupported image type${file.type ? ` (${file.type})` : ''}. Allowed: ${allowed}.`
  }
  if (file.size > ICON_MAX_BYTES) {
    return `Image is too large (${Math.round(file.size / 1024)} KB). Maximum is ${Math.round(
      ICON_MAX_BYTES / 1024,
    )} KB.`
  }
  return null
}
