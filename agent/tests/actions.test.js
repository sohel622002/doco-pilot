import { describe, it, expect, vi, beforeAll } from 'vitest'

// actions.js is a thin dispatch table over docker.js/system.js/stacks.js —
// mock all three so this suite verifies *routing* (right handler, right
// args, right result `type`) without touching a real Docker socket.
vi.mock('../src/docker.js', () => ({
  listContainers: vi.fn(async () => [{ id: 'c1' }]),
  inspectContainer: vi.fn(async (id) => ({ id })),
  startContainer: vi.fn(async (id) => ({ ok: true, action: 'start', containerId: id })),
  stopContainer: vi.fn(async (id) => ({ ok: true, action: 'stop', containerId: id })),
  restartContainer: vi.fn(async (id) => ({ ok: true, action: 'restart', containerId: id })),
  createContainer: vi.fn(async (opts) => ({ ok: true, action: 'create', ...opts })),
  removeContainer: vi.fn(async (id) => ({ ok: true, action: 'remove', containerId: id })),
  getContainerLogs: vi.fn(async (id) => ({ containerId: id, logs: ['line'] })),
  listImages: vi.fn(async () => [{ id: 'img1' }]),
  pauseContainer: vi.fn(async (id) => ({ ok: true, action: 'pause', containerId: id })),
  unPauseContainer: vi.fn(async (id) => ({ ok: true, action: 'unpause', containerId: id })),
  pullImage: vi.fn(async (name) => ({ ok: true, action: 'pull', imageName: name })),
  removeImage: vi.fn(async (id) => ({ ok: true, action: 'remove', imageId: id })),
  getContainerStats: vi.fn(async (id) => ({ id, cpuPercent: 1 })),
  getAllContainerStats: vi.fn(async () => [{ id: 'c1', cpuPercent: 1 }]),
  getDiskUsage: vi.fn(async () => ({ totalBytes: 100 })),
  getDanglingImages: vi.fn(async () => [{ id: 'img2' }]),
  pruneImages: vi.fn(async () => ({ ok: true, action: 'prune' })),
  listVolumes: vi.fn(async () => [{ name: 'v1' }]),
  inspectVolume: vi.fn(async (name) => ({ name })),
  removeVolume: vi.fn(async (name) => ({ ok: true, action: 'remove', name })),
  listNetworks: vi.fn(async () => [{ id: 'n1' }]),
  inspectNetwork: vi.fn(async (id) => ({ id })),
  createNetwork: vi.fn(async (opts) => ({ ok: true, action: 'create', ...opts })),
  removeNetwork: vi.fn(async (id) => ({ ok: true, action: 'remove', id })),
  getEngineInfo: vi.fn(async () => ({ version: '27.0.0' })),
  getAggregatedLogs: vi.fn(async () => [{ container: 'web', line: 'hi' }]),
}))

vi.mock('../src/system.js', () => ({
  systemStats: vi.fn(async () => ({ cpu: { usagePercent: 5 } })),
}))

vi.mock('../src/stacks.js', () => ({
  listStacks: vi.fn(async () => [{ name: 'stack1', status: 'running(1)' }]),
}))

let handleAction, docker, system, stacks

beforeAll(async () => {
  ;({ handleAction } = await import('../src/actions.js'))
  docker = await import('../src/docker.js')
  system = await import('../src/system.js')
  stacks = await import('../src/stacks.js')
})

describe('handleAction — request/response dispatch', () => {
  it('routes containers:list with no args to docker.listContainers', async () => {
    const result = await handleAction({ action: 'containers:list' })
    expect(docker.listContainers).toHaveBeenCalled()
    expect(result).toEqual({ type: 'containers:list:result', data: [{ id: 'c1' }] })
  })

  it('routes containers:inspect, passing containerId through', async () => {
    const result = await handleAction({ action: 'containers:inspect', containerId: 'c1' })
    expect(docker.inspectContainer).toHaveBeenCalledWith('c1')
    expect(result).toEqual({ type: 'containers:inspect:result', data: { id: 'c1' } })
  })

  it('routes containers:stats to getContainerStats when a containerId is given', async () => {
    await handleAction({ action: 'containers:stats', containerId: 'c1' })
    expect(docker.getContainerStats).toHaveBeenCalledWith('c1')
    expect(docker.getAllContainerStats).not.toHaveBeenCalled()
  })

  it('routes containers:stats to getAllContainerStats when no containerId is given', async () => {
    await handleAction({ action: 'containers:stats' })
    expect(docker.getAllContainerStats).toHaveBeenCalled()
  })

  it('routes containers:create with the full opts object', async () => {
    const result = await handleAction({
      action: 'containers:create',
      image: 'nginx:latest',
      name: 'web-1',
      ports: ['8080:80'],
      env: ['KEY=value'],
    })
    expect(docker.createContainer).toHaveBeenCalledWith({
      image: 'nginx:latest',
      name: 'web-1',
      ports: ['8080:80'],
      env: ['KEY=value'],
    })
    expect(result.type).toBe('containers:create:result')
  })

  it('routes images:pull, passing imageName through', async () => {
    const result = await handleAction({ action: 'images:pull', imageName: 'redis:7' })
    expect(docker.pullImage).toHaveBeenCalledWith('redis:7')
    expect(result.type).toBe('images:pull:result')
  })

  it('routes networks:create with driver/subnet/gateway mapped correctly', async () => {
    await handleAction({
      action: 'networks:create',
      name: 'my-net',
      networkDriver: 'bridge',
      subnet: '172.20.0.0/16',
      gateway: '172.20.0.1',
    })
    expect(docker.createNetwork).toHaveBeenCalledWith({
      name: 'my-net',
      driver: 'bridge',
      subnet: '172.20.0.0/16',
      gateway: '172.20.0.1',
    })
  })

  it('routes system:stats to system.systemStats', async () => {
    const result = await handleAction({ action: 'system:stats' })
    expect(system.systemStats).toHaveBeenCalled()
    expect(result).toEqual({ type: 'system:stats:result', data: { cpu: { usagePercent: 5 } } })
  })

  it('routes system:engineInfo and system:logsTail to their docker.js wrappers', async () => {
    const engineResult = await handleAction({ action: 'system:engineInfo' })
    expect(engineResult).toEqual({ type: 'system:engineInfo:result', data: { version: '27.0.0' } })

    const logsResult = await handleAction({ action: 'system:logsTail' })
    expect(docker.getAggregatedLogs).toHaveBeenCalled()
    expect(logsResult.type).toBe('system:logsTail:result')
  })

  it('routes stacks:list to stacks.listStacks', async () => {
    const result = await handleAction({ action: 'stacks:list' })
    expect(stacks.listStacks).toHaveBeenCalled()
    expect(result).toEqual({ type: 'stacks:list:result', data: [{ name: 'stack1', status: 'running(1)' }] })
  })

  it('throws on an unrecognized action instead of silently no-oping', async () => {
    await expect(handleAction({ action: 'containers:teleport' })).rejects.toThrow('Unknown action: containers:teleport')
  })

  it('propagates a handler rejection to the caller (ws.js turns this into a docker:error message)', async () => {
    docker.startContainer.mockRejectedValueOnce(new Error('no such container'))
    await expect(handleAction({ action: 'containers:start', containerId: 'ghost' })).rejects.toThrow('no such container')
  })
})
