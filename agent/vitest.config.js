import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Small suite — a single worker avoids flaky multi-process pool spawning
    // in constrained/sandboxed environments, without costing meaningful time.
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true }
    }
  }
})
