import { describe, it, expect, vi } from 'vitest'
import { DEFAULT_LICENSE_ID, getLicenseText, loadLicenseCatalogue, NO_LICENSE, POPULAR_LICENSE_IDS } from '../src/lib/licenses.js'

// The licences are vendored (src/lib/license-texts.json): no request leaves the page for a licence list or text.
describe('loadLicenseCatalogue', () => {
  it('offers NONE first, then the vendored licences alphabetically, and surfaces the popular ones in order', async () => {
    const cat = await loadLicenseCatalogue()
    expect(cat.all[0]).toBe(NO_LICENSE)
    const ids = cat.all.slice(1).map((l) => l.id)
    expect(ids).toEqual([...ids].sort((a, b) => a.localeCompare(b)))
    expect(ids).toContain('MIT')
    expect(ids).toContain('CC0-1.0')
    expect(cat.popular.map((l) => l.id)).toEqual([...POPULAR_LICENSE_IDS])
    expect(cat.popular[0]!.id).toBe(DEFAULT_LICENSE_ID)
    expect(cat.all.every((l) => !l.deprecated)).toBe(true)
  })

  it('names each licence and marks the OSI-approved ones', async () => {
    const { all } = await loadLicenseCatalogue()
    expect(all.find((l) => l.id === 'MIT')).toMatchObject({ name: 'MIT License', osiApproved: true })
    expect(all.find((l) => l.id === '0BSD')?.name).toBe('BSD Zero Clause License')
    expect(all.find((l) => l.id === 'CC0-1.0')?.osiApproved).toBe(false)
  })
})

describe('getLicenseText', () => {
  it('returns the vendored full text without any network request', async () => {
    const f = vi.spyOn(globalThis, 'fetch')
    try {
      const mit = await getLicenseText('MIT')
      expect(mit).toMatch(/^MIT License/)
      expect(mit).toMatch(/Permission is hereby granted, free of charge/)
      expect(await getLicenseText('0BSD')).toMatch(/Permission to use, copy, modify, and\/or distribute this software for any purpose/)
      expect(f).not.toHaveBeenCalled()
    } finally {
      f.mockRestore()
    }
  })

  it('has a text for every offered licence, ending in one newline', async () => {
    const { all } = await loadLicenseCatalogue()
    for (const l of all.slice(1)) {
      const text = await getLicenseText(l.id)
      expect(text, l.id).toMatch(/\S[\s\S]*[^\n]\n$/)
    }
  })

  it('returns null for the proprietary choice', async () => {
    expect(await getLicenseText('NONE')).toBeNull()
    expect(await getLicenseText('')).toBeNull()
    expect(await getLicenseText('unlicensed')).toBeNull()
  })

  it('rejects a malformed id and an id the app does not carry', async () => {
    await expect(getLicenseText('../MIT')).rejects.toThrow(/invalid license id/)
    await expect(getLicenseText('BOGUS-1.0')).rejects.toThrow(/BOGUS-1.0/)
    await expect(getLicenseText('constructor')).rejects.toThrow(/constructor/)
  })
})
