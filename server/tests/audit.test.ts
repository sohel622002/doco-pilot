import { describe, it, expect, beforeAll } from 'vitest'

// Pure input validators — no supabase dependency, nothing to mock.
let v: any
beforeAll(async () => {
  v = await import('../validators/dockerValidators.js')
})

describe('validateContainerId', () => {
  it('accepts a 12-64 char hex id', () => {
    expect(v.validateContainerId('a'.repeat(12))).toBe('a'.repeat(12))
    expect(v.validateContainerId('a'.repeat(64))).toBe('a'.repeat(64))
  })
  it('rejects too-short, non-hex, or empty input', () => {
    expect(() => v.validateContainerId('abc')).toThrow()
    expect(() => v.validateContainerId('g'.repeat(12))).toThrow()
    expect(() => v.validateContainerId('')).toThrow()
    expect(() => v.validateContainerId('a; rm -rf /'.repeat(1))).toThrow()
  })
})

describe('validateImageId', () => {
  it('accepts a name:tag or hex id', () => {
    expect(v.validateImageId('nginx:latest')).toBe('nginx:latest')
    expect(v.validateImageId('ghcr.io/org/app:v1.2.3')).toBe('ghcr.io/org/app:v1.2.3')
  })
  it('rejects shell metacharacters and empty input', () => {
    expect(() => v.validateImageId('')).toThrow()
    expect(() => v.validateImageId('nginx; rm -rf /')).toThrow()
    expect(() => v.validateImageId('nginx && echo pwned')).toThrow()
  })
})

describe('validateContainerName / validateVolumeName / validateNetworkId', () => {
  it('accept Docker-legal names', () => {
    expect(v.validateContainerName('my-app_1')).toBe('my-app_1')
    expect(v.validateVolumeName('data-vol.1')).toBe('data-vol.1')
    expect(v.validateNetworkId('my-net')).toBe('my-net')
  })
  it('reject names starting with a symbol or containing spaces', () => {
    expect(() => v.validateContainerName('-bad')).toThrow()
    expect(() => v.validateContainerName('bad name')).toThrow()
    expect(() => v.validateVolumeName('.bad')).toThrow()
  })
})

describe('validatePortMapping', () => {
  it('accepts host:container[/proto]', () => {
    expect(v.validatePortMapping('8080:80')).toBe('8080:80')
    expect(v.validatePortMapping('53:53/udp')).toBe('53:53/udp')
  })
  it('rejects malformed mappings', () => {
    expect(() => v.validatePortMapping('8080')).toThrow()
    expect(() => v.validatePortMapping('8080:80/ftp')).toThrow()
    expect(() => v.validatePortMapping('8080:80; rm -rf /')).toThrow()
  })
})

describe('validateNetworkDriver', () => {
  it('accepts common driver names', () => {
    expect(v.validateNetworkDriver('bridge')).toBe('bridge')
    expect(v.validateNetworkDriver('macvlan')).toBe('macvlan')
  })
  it('rejects non-alpha-leading or symbol-laden input', () => {
    expect(() => v.validateNetworkDriver('1bridge')).toThrow()
    expect(() => v.validateNetworkDriver('bridge; ls')).toThrow()
  })
})

describe('validateCidrOrIp', () => {
  it('accepts IPv4, IPv4 CIDR, and IPv6', () => {
    expect(v.validateCidrOrIp('172.20.0.1')).toBe('172.20.0.1')
    expect(v.validateCidrOrIp('172.20.0.0/16')).toBe('172.20.0.0/16')
    expect(v.validateCidrOrIp('::1')).toBe('::1')
  })
  it('rejects garbage input', () => {
    expect(() => v.validateCidrOrIp('not-an-ip; rm -rf /')).toThrow()
  })
})

describe('validateSessionId', () => {
  it('accepts a crypto.randomUUID()-shaped id', () => {
    const id = 'a1b2c3d4-e5f6-4789-a012-b3c4d5e6f789'
    expect(v.validateSessionId(id)).toBe(id)
  })
  it('rejects short ids and ids with special characters', () => {
    expect(() => v.validateSessionId('short')).toThrow()
    expect(() => v.validateSessionId('has spaces here')).toThrow()
    expect(() => v.validateSessionId('')).toThrow()
  })
})

describe('validateExecDimension', () => {
  it('accepts integers within range', () => {
    expect(v.validateExecDimension(80)).toBe(80)
    expect(v.validateExecDimension('24')).toBe(24)
  })
  it('rejects zero, negative, non-integer, and oversized values', () => {
    expect(() => v.validateExecDimension(0)).toThrow()
    expect(() => v.validateExecDimension(-5)).toThrow()
    expect(() => v.validateExecDimension(1.5)).toThrow()
    expect(() => v.validateExecDimension(100000)).toThrow()
    expect(() => v.validateExecDimension('not-a-number')).toThrow()
  })
})

describe('validateExecInput', () => {
  it('accepts a normal keystroke/paste string', () => {
    expect(v.validateExecInput('ls -la\n')).toBe('ls -la\n')
  })
  it('rejects non-strings and oversized payloads', () => {
    expect(() => v.validateExecInput(123)).toThrow()
    expect(() => v.validateExecInput(null)).toThrow()
    expect(() => v.validateExecInput('a'.repeat(65537))).toThrow()
  })
})

describe('validateDockerfileText', () => {
  it('accepts non-empty Dockerfile content within the size cap', () => {
    expect(v.validateDockerfileText('FROM alpine\n')).toBe('FROM alpine\n')
  })
  it('rejects empty, non-string, or oversized content', () => {
    expect(() => v.validateDockerfileText('')).toThrow()
    expect(() => v.validateDockerfileText(null)).toThrow()
    expect(() => v.validateDockerfileText('a'.repeat(65537))).toThrow()
  })
})

describe('validateBuildArgs', () => {
  it('accepts a plain key/value object and passes it through', () => {
    expect(v.validateBuildArgs({ NODE_ENV: 'production' })).toEqual({ NODE_ENV: 'production' })
  })
  it('defaults undefined/null to an empty object', () => {
    expect(v.validateBuildArgs(undefined)).toEqual({})
    expect(v.validateBuildArgs(null)).toEqual({})
  })
  it('rejects arrays, invalid key names, oversized values, and too many entries', () => {
    expect(() => v.validateBuildArgs(['a'])).toThrow()
    expect(() => v.validateBuildArgs({ '1BAD': 'x' })).toThrow()
    expect(() => v.validateBuildArgs({ OK: 'a'.repeat(4097) })).toThrow()
    const tooMany = Object.fromEntries(Array.from({ length: 51 }, (_, i) => [`K${i}`, 'v']))
    expect(() => v.validateBuildArgs(tooMany)).toThrow()
  })
})

describe('validateStackName', () => {
  it('accepts lowercase Compose-project-legal names', () => {
    expect(v.validateStackName('my-app_1')).toBe('my-app_1')
  })
  it('rejects uppercase, symbols, and names starting with - or _', () => {
    expect(() => v.validateStackName('MyApp')).toThrow()
    expect(() => v.validateStackName('-app')).toThrow()
    expect(() => v.validateStackName('app name')).toThrow()
  })
})

describe('validateComposeYaml', () => {
  it('accepts non-empty YAML text within the size cap', () => {
    const yaml = 'services:\n  app:\n    image: nginx\n'
    expect(v.validateComposeYaml(yaml)).toBe(yaml)
  })
  it('rejects empty, non-string, or oversized content', () => {
    expect(() => v.validateComposeYaml('')).toThrow()
    expect(() => v.validateComposeYaml(42)).toThrow()
    expect(() => v.validateComposeYaml('a'.repeat(262145))).toThrow()
  })
})

describe('validateEnvVar', () => {
  it('accepts KEY=VALUE', () => {
    expect(v.validateEnvVar('NODE_ENV=production')).toBe('NODE_ENV=production')
  })
  it('rejects entries without a legal KEY= prefix', () => {
    expect(() => v.validateEnvVar('not-an-env-var')).toThrow()
    expect(() => v.validateEnvVar('1KEY=value')).toThrow()
  })
})
