// Mocked-RPC UI e2e against the `e2e` build (`npm run build:e2e`): src/e2e.ts registers the "Test Wallet" mock wallet and a stub Sui
// client whose publish succeeds with a fixed `mytoken::MYTOKEN` coin type. Real confirmation, downloads and on-chain checks live in the
// real-chain harness (scripts/e2e-deploy.mjs).
import { expect, test } from '@playwright/test'
import { connectMockWallet } from '@meddleware/frontend-config/wallet'
import { E2E_PACKAGE_ID } from '../src/e2e-data.js'
import { disconnected, done, identity, review } from './open.js'

test('mounts with its landmarks and asks for a wallet first, without an uncaught error', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await disconnected(page)
  await expect(page.getByRole('banner')).toBeVisible()
  await expect(page.getByRole('main')).toBeVisible()
  await expect(page.getByRole('contentinfo')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Token Issuance')
  await expect(page.getByText('Connect a Sui wallet to deploy your token.')).toBeVisible()
  expect(errors).toEqual([])
})

test('connects and disconnects the wallet', async ({ page }) => {
  await identity(page)
  await expect(page.getByLabel('Package name')).toBeVisible()
  await page.getByRole('button', { name: 'Disconnect' }).click()
  await expect(page.getByRole('button', { name: 'Connect wallet' }).first()).toBeVisible()
  await expect(page.getByLabel('Package name')).toBeHidden()
})

test('says so when no wallet is registered', async ({ page }) => {
  await disconnected(page)
  await page.evaluate(() => (window as unknown as { __unregisterMockWallet: () => void }).__unregisterMockWallet())
  await page.getByRole('button', { name: 'Connect wallet' }).first().click()
  await expect(page.getByRole('dialog').getByText('No Sui wallet detected.')).toBeVisible()
})

test('uses the network chosen in the header', async ({ page }) => {
  await disconnected(page)
  await page.getByRole('combobox', { name: 'Network' }).selectOption('mainnet')
  await connectMockWallet(page)
  await expect(page.getByText(/Deploy your own Sui coin directly from your browser \(mainnet\)/)).toBeVisible()
})

test('validates the identity step before allowing Next', async ({ page }) => {
  await identity(page)
  const next = page.getByRole('button', { name: 'Next', exact: true })
  const pkg = page.getByLabel('Package name')

  await pkg.fill('Bad Name!')
  await pkg.blur()
  await expect(pkg).toHaveAttribute('aria-invalid', 'true')
  await expect(next).toBeDisabled()

  await pkg.fill('my_token')
  await page.getByLabel('Module name').fill('mytoken')
  await page.getByLabel('Module name').blur()
  await expect(next).toBeEnabled()
})

test('the review says what is permanent, what the policies allow, the exact fee and who receives it', async ({ page }) => {
  await review(page)
  const card = page.getByRole('main')
  await expect(card.getByText('Permanent once published', { exact: true })).toBeVisible()
  await expect(card.getByText('The name, description, icon can still be changed later by whoever holds the MetadataCap.')).toBeVisible()
  await expect(card.getByText(/The MetadataCap goes to the recipient\. Whoever holds it can change the name, description and icon/)).toBeVisible()
  await expect(card.getByText(/The TreasuryCap goes to the recipient/)).toBeVisible()
  await expect(card.getByText(/The UpgradeCap is burned when the package is published/)).toBeVisible()
  await expect(card.getByText(/one-off fee of 2 SUI to the Meddleware platform treasury/)).toBeVisible()
  await expect(card.getByText('0xe2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2')).toBeVisible()
  await expect(card.getByText(/operator/i)).toHaveCount(0)
})

test('walks the wizard to a (mocked) successful deploy', async ({ page }) => {
  await done(page)
  await expect(page.getByText(/::mytoken::MYTOKEN/).first()).toBeVisible()
  await expect(page.getByText(E2E_PACKAGE_ID.slice(0, 12)).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Download source package/ })).toBeEnabled()
})

test('Deploy another starts again from the first step, keeping what was entered', async ({ page }) => {
  await done(page)
  await page.getByRole('button', { name: 'Deploy another' }).click()
  await expect(page.getByLabel('Package name')).toHaveValue('my_token')
})
