import type { Page } from '@playwright/test'
import { offline } from '@meddleware/frontend-config/look'
import { connectMockWallet } from '@meddleware/frontend-config/wallet'

/** The built app (the e2e build: a mock wallet and a stub chain whose publish succeeds), every request that leaves localhost refused. */
export async function disconnected(page: Page): Promise<void> {
  await offline(page)
  await page.goto('/')
  await page.getByRole('heading', { level: 2, name: 'Token issuance' }).waitFor()
}

/** Connected: the wizard's first step. */
export async function identity(page: Page): Promise<void> {
  await disconnected(page)
  await connectMockWallet(page)
  await page.getByLabel('Package name').waitFor()
}

async function fillIdentity(page: Page): Promise<void> {
  await page.getByLabel('Package name').fill('my_token')
  await page.getByLabel('Module name').fill('mytoken')
  await page.getByRole('button', { name: 'Next', exact: true }).click()
}

/** The token details. */
export async function token(page: Page): Promise<void> {
  await identity(page)
  await fillIdentity(page)
  await page.getByLabel('Token name').waitFor()
}

/** The token details with the icon's upload tab open. */
export async function iconUpload(page: Page): Promise<void> {
  await token(page)
  await page.getByRole('tab', { name: 'Upload to Walrus' }).click()
  await page.getByLabel('Image to upload to Walrus').waitFor()
}

async function fillToken(page: Page): Promise<void> {
  await page.getByLabel('Token name').fill('My Token')
  await page.getByLabel('Symbol').fill('MYT')
  await page.getByLabel('Description').fill('Mocked e2e deploy')
  await page.getByLabel('Decimals').fill('6')
  await page.getByRole('button', { name: 'Next', exact: true }).click()
}

/** Supply and policies. */
export async function settings(page: Page): Promise<void> {
  await token(page)
  await fillToken(page)
  await page.getByLabel('Initial supply').waitFor()
}

/** The terms dialog that stands between the settings and the review. */
export async function terms(page: Page): Promise<void> {
  await settings(page)
  await page.getByRole('button', { name: /Review & deploy/ }).click()
  await page.getByRole('dialog', { name: 'Before you deploy' }).waitFor()
}

/** The review. */
export async function review(page: Page): Promise<void> {
  await terms(page)
  await page.getByRole('button', { name: /I understand — continue/ }).click()
  await page.getByRole('heading', { name: /Review — deploying to testnet/ }).waitFor()
}

/** A deployed coin. */
export async function done(page: Page): Promise<void> {
  await review(page)
  await page.getByRole('button', { name: /Confirm & deploy/ }).click()
  await page.getByRole('heading', { name: /MYT is live on testnet/ }).waitFor()
}

/** The My Tokens tab. */
export async function myTokens(page: Page): Promise<void> {
  await identity(page)
  await page.getByRole('tab', { name: 'My Tokens', exact: true }).click()
  await page.getByText(/No deployed tokens found/).waitFor()
}
