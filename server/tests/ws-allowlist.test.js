import { describe, it, expect, vi, beforeAll } from 'vitest'

// ws/index.js pulls in utils/audit.js and utils/membership.js, both of
// which import the supabase client — mock it so this suite can import the
// module (and its action-allowlist Sets) without real credentials.
vi.mock('../config/supabase.js', () => ({
  default: { from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }) }) }
}))

// Actions that grant effective code execution or otherwise mutate state —
// a 'viewer' must never be allowed to send these.
const DANGEROUS_ACTIONS = [
  'containers:start',
  'containers:stop',
  'containers:restart',
  'containers:pause',
  'containers:unpause',
  'containers:remove',
  'containers:create',
  'images:pull',
  'images:remove',
  'images:prune',
  'volumes:remove',
  'networks:create',
  'networks:remove',
  'containers:exec:start',
  'containers:exec:input',
  'containers:exec:resize',
  'containers:exec:stop',
  'images:build:start',
  'stacks:deploy:start',
  'stacks:down:start',
]

let ALLOWED_ACTIONS, VIEWER_ALLOWED_ACTIONS, EXEC_STREAM_ACTIONS

beforeAll(async () => {
  ;({ ALLOWED_ACTIONS, VIEWER_ALLOWED_ACTIONS, EXEC_STREAM_ACTIONS } = await import('../ws/index.js'))
})

describe('WS action allowlist', () => {
  it('every viewer-allowed action is a real, known action', () => {
    for (const action of VIEWER_ALLOWED_ACTIONS) {
      expect(ALLOWED_ACTIONS.has(action)).toBe(true)
    }
  })

  it('every exec-stream action is a real, known action', () => {
    for (const action of EXEC_STREAM_ACTIONS) {
      expect(ALLOWED_ACTIONS.has(action)).toBe(true)
    }
  })

  it('never grants a viewer any mutating/code-execution action', () => {
    for (const action of DANGEROUS_ACTIONS) {
      expect(VIEWER_ALLOWED_ACTIONS.has(action)).toBe(false)
    }
  })

  it('still allows a viewer the expected read-only actions', () => {
    for (const action of [
      'containers:list',
      'containers:inspect',
      'containers:logs',
      'containers:stats',
      'system:stats',
      'images:list',
      'volumes:list',
      'networks:list',
      'stacks:list',
      'system:engineInfo',
      'system:logsTail',
    ]) {
      expect(VIEWER_ALLOWED_ACTIONS.has(action)).toBe(true)
    }
  })

  it('rejects an unrecognized action name outright', () => {
    expect(ALLOWED_ACTIONS.has('containers:teleport')).toBe(false)
    expect(VIEWER_ALLOWED_ACTIONS.has('containers:teleport')).toBe(false)
  })
})
