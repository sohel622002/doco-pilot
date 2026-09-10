import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'

// docker.js wraps dockerode 1:1 — mock the dockerode client itself so
// these tests verify docker.js's *transformation* of raw Docker API
// responses into our own shapes, without a real Docker socket.
const dockerInstance = {
  listContainers: vi.fn(),
  getContainer: vi.fn(),
  listImages: vi.fn(),
  getImage: vi.fn(),
  df: vi.fn(),
  version: vi.fn(),
  info: vi.fn(),
  listNetworks: vi.fn(),
  getEvents: vi.fn(),
  ping: vi.fn(),
}

vi.mock('dockerode', () => ({
  default: vi.fn(() => dockerInstance),
}))

let docker

beforeAll(async () => {
  docker = await import('../src/docker.js')
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('listContainers', () => {
  it('maps raw dockerode fields to our shape and enriches with restart/health via inspect()', async () => {
    dockerInstance.listContainers.mockResolvedValue([
      {
        Id: 'abcdef1234567890',
        Names: ['/web-1'],
        Image: 'nginx:latest',
        Status: 'Up 2 minutes',
        State: 'running',
        Ports: [{ PrivatePort: 80 }],
        Created: 1700000000,
      },
    ])
    dockerInstance.getContainer.mockReturnValue({
      inspect: vi.fn().mockResolvedValue({ RestartCount: 2, State: { Health: { Status: 'healthy' } } }),
    })

    const result = await docker.listContainers()

    expect(result).toEqual([
      {
        id: 'abcdef1234567890',
        shortId: 'abcdef123456',
        names: ['web-1'],
        image: 'nginx:latest',
        status: 'Up 2 minutes',
        state: 'running',
        ports: [{ PrivatePort: 80 }],
        created: 1700000000,
        restartCount: 2,
        healthStatus: 'healthy',
      },
    ])
  })

  it('falls back to zero/null enrichment if inspect() fails (container removed mid-list)', async () => {
    dockerInstance.listContainers.mockResolvedValue([
      { Id: 'zzz', Names: ['/gone'], Image: 'x', Status: 'x', State: 'exited', Ports: [], Created: 1 },
    ])
    dockerInstance.getContainer.mockReturnValue({
      inspect: vi.fn().mockRejectedValue(new Error('no such container')),
    })

    const result = await docker.listContainers()
    expect(result[0]).toMatchObject({ restartCount: 0, healthStatus: null })
  })
})

describe('getDiskUsage', () => {
  it('sums size/reclaimable per category from docker.df()', async () => {
    dockerInstance.df.mockResolvedValue({
      Images: [
        { Size: 100, Containers: 1 }, // in use, not reclaimable
        { Size: 50, Containers: 0 }, // unused, reclaimable
      ],
      Containers: [
        { SizeRw: 10, State: 'running' },
        { SizeRw: 20, State: 'exited' },
      ],
      Volumes: [{ UsageData: { Size: 5, RefCount: 0 } }],
      BuildCache: [{ Size: 1, InUse: false }],
    })

    const usage = await docker.getDiskUsage()

    expect(usage.images).toEqual({ count: 2, totalBytes: 150, reclaimableBytes: 50 })
    expect(usage.containers).toEqual({ count: 2, totalBytes: 30, reclaimableBytes: 20 })
    expect(usage.volumes).toEqual({ count: 1, totalBytes: 5, reclaimableBytes: 5 })
    expect(usage.buildCache).toEqual({ count: 1, totalBytes: 1, reclaimableBytes: 1 })
    expect(usage.totalBytes).toBe(150 + 30 + 5 + 1)
    expect(usage.reclaimableBytes).toBe(50 + 20 + 5 + 1)
  })

  it('tolerates a category being entirely absent from the response', async () => {
    dockerInstance.df.mockResolvedValue({})
    const usage = await docker.getDiskUsage()
    expect(usage).toMatchObject({ totalBytes: 0, reclaimableBytes: 0 })
  })
})

describe('getEngineInfo', () => {
  it('maps docker.version() + docker.info() into a flat summary', async () => {
    dockerInstance.version.mockResolvedValue({ Version: '27.0.0', ApiVersion: '1.46' })
    dockerInstance.info.mockResolvedValue({
      OperatingSystem: 'Ubuntu 24.04',
      Architecture: 'x86_64',
      KernelVersion: '6.8.0',
      Driver: 'overlay2',
      Containers: 5,
      ContainersRunning: 3,
      ContainersPaused: 0,
      ContainersStopped: 2,
      Images: 10,
      NCPU: 4,
      MemTotal: 8_000_000_000,
    })

    const info = await docker.getEngineInfo()

    expect(info).toEqual({
      version: '27.0.0',
      apiVersion: '1.46',
      os: 'Ubuntu 24.04',
      arch: 'x86_64',
      kernelVersion: '6.8.0',
      storageDriver: 'overlay2',
      containers: 5,
      containersRunning: 3,
      containersPaused: 0,
      containersStopped: 2,
      images: 10,
      cpus: 4,
      memTotalBytes: 8_000_000_000,
    })
  })
})

describe('getAggregatedLogs', () => {
  it('fans out logs() across every running container and merges by timestamp', async () => {
    dockerInstance.listContainers.mockResolvedValue([
      { Id: 'c1', Names: ['/web'] },
      { Id: 'c2', Names: ['/db'] },
    ])
    dockerInstance.getContainer.mockImplementation((id) => ({
      logs: vi.fn().mockResolvedValue(
        // First 8 bytes are the multiplex header docker.js strips off —
        // filler underscores here stand in for those raw header bytes.
        Buffer.from(
          id === 'c1'
            ? '________2026-01-01T00:00:02.000000000Z web line\n'
            : '________2026-01-01T00:00:01.000000000Z db line\n',
        ),
      ),
    }))

    const merged = await docker.getAggregatedLogs({ tailPerContainer: 5 })

    // db's line has the earlier timestamp, so it sorts first despite
    // being the second container queried.
    expect(merged).toEqual([
      { container: 'db', line: '2026-01-01T00:00:01.000000000Z db line' },
      { container: 'web', line: '2026-01-01T00:00:02.000000000Z web line' },
    ])
  })

  it('skips a container whose logs() call fails, without failing the whole batch', async () => {
    dockerInstance.listContainers.mockResolvedValue([{ Id: 'c1', Names: ['/broken'] }])
    dockerInstance.getContainer.mockReturnValue({ logs: vi.fn().mockRejectedValue(new Error('gone')) })

    await expect(docker.getAggregatedLogs()).resolves.toEqual([])
  })
})

describe('listNetworks', () => {
  it('extracts subnet/gateway from the first IPAM config entry', async () => {
    dockerInstance.listNetworks.mockResolvedValue([
      {
        Id: 'abcdef123456789',
        Name: 'my-net',
        Driver: 'bridge',
        Scope: 'local',
        IPAM: { Config: [{ Subnet: '172.20.0.0/16', Gateway: '172.20.0.1' }] },
        Internal: false,
        Attachable: true,
        Containers: { c1: { Name: 'web' } },
        Created: '2026-01-01T00:00:00Z',
      },
    ])

    const [net] = await docker.listNetworks()
    expect(net).toMatchObject({
      name: 'my-net',
      driver: 'bridge',
      subnet: '172.20.0.0/16',
      gateway: '172.20.0.1',
      connectedContainers: ['web'],
    })
  })

  it('returns null subnet/gateway when a network has no IPAM config (e.g. host/none)', async () => {
    dockerInstance.listNetworks.mockResolvedValue([
      { Id: 'x', Name: 'host', Driver: 'host', Scope: 'local', IPAM: {}, Containers: {}, Created: '' },
    ])
    const [net] = await docker.listNetworks()
    expect(net.subnet).toBeNull()
    expect(net.gateway).toBeNull()
  })
})
