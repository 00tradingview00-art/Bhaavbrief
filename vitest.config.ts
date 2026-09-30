import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // Agent worktrees under .claude/worktrees are full repo copies — without
    // this, `npm test` ran 7 stale copies too (415 files, spurious failures).
    exclude: ['**/node_modules/**', '.claude/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
