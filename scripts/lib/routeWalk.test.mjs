import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { fileToRoute } from './routeWalk.mjs'

const APP_DIR = '/repo/app'

describe('fileToRoute', () => {
  it('maps the root page to /', () => {
    expect(fileToRoute(APP_DIR, path.join(APP_DIR, 'page.tsx'))).toBe('/')
  })

  it('maps a nested page to its URL path', () => {
    expect(fileToRoute(APP_DIR, path.join(APP_DIR, 'briefs', 'page.tsx'))).toBe('/briefs')
  })

  it('preserves dynamic segments', () => {
    expect(fileToRoute(APP_DIR, path.join(APP_DIR, 'briefs', '[slug]', 'page.tsx'))).toBe('/briefs/[slug]')
  })

  it('maps a route.ts handler the same way as page.tsx', () => {
    expect(fileToRoute(APP_DIR, path.join(APP_DIR, 'api', 'prices', 'route.ts'))).toBe('/api/prices')
  })

  it('handles deeply nested dynamic segments', () => {
    expect(fileToRoute(APP_DIR, path.join(APP_DIR, 'api', 'chart', '[commodity]', 'route.ts'))).toBe('/api/chart/[commodity]')
  })
})
