import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Small suite — a single worker avoids flaky multi-process pool spawning
    // in constrained/sandboxed environments (seen locally on Windows) without
    // costing meaningful time at this scale.
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true }
    }
  }
})
