// Input validators for user-supplied Docker identifiers/content. Every value
// that gets forwarded to an agent (which runs real `docker` commands) passes
// through one of these first — this is the injection-prevention boundary.

// Validate container IDs — always 12-64 hex chars
export function validateContainerId(id: string) {
  if (!id || !/^[a-f0-9]{12,64}$/i.test(id)) {
    throw new Error('Invalid container ID format')
  }
  return id
}

// Validate image IDs — hex or name:tag format
export function validateImageId(id: string) {
  if (!id || !/^[a-zA-Z0-9_\-.:/@]{1,256}$/.test(id)) {
    throw new Error('Invalid image ID format')
  }
  return id
}

// Validate a user-supplied container name (Docker's own naming rules)
export function validateContainerName(name: string) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/.test(name)) {
    throw new Error('Invalid container name format')
  }
  return name
}

// Validate a user-supplied volume name (Docker's own naming rules)
export function validateVolumeName(name: string) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,254}$/.test(name)) {
    throw new Error('Invalid volume name format')
  }
  return name
}

// Validate a "hostPort:containerPort[/proto]" mapping
export function validatePortMapping(mapping: string) {
  if (!/^\d{1,5}:\d{1,5}(\/(tcp|udp))?$/.test(mapping)) {
    throw new Error(`Invalid port mapping: ${mapping}`)
  }
  return mapping
}

// Validate a Docker network ID (hex) or name
export function validateNetworkId(id: string) {
  if (!id || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,254}$/.test(id)) {
    throw new Error('Invalid network ID format')
  }
  return id
}

// Validate a network driver name (bridge, overlay, macvlan, ...)
export function validateNetworkDriver(driver: string) {
  if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,31}$/.test(driver)) {
    throw new Error('Invalid network driver format')
  }
  return driver
}

// Validate an IPv4/IPv6 CIDR (subnet or gateway address)
export function validateCidrOrIp(value: string) {
  if (!/^[0-9a-fA-F:.]{2,43}(\/\d{1,3})?$/.test(value)) {
    throw new Error('Invalid subnet/gateway format')
  }
  return value
}

// Validate a client-generated exec session ID
export function validateSessionId(id: string) {
  if (!id || !/^[a-zA-Z0-9_-]{8,64}$/.test(id)) {
    throw new Error('Invalid session ID format')
  }
  return id
}

// Validate a terminal dimension (cols/rows)
export function validateExecDimension(value: unknown) {
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1 || n > 1000) {
    throw new Error('Invalid terminal dimension')
  }
  return n
}

// Validate raw exec stdin — can't restrict content (it's keystrokes/paste),
// only cap size to prevent an abusive single message.
export function validateExecInput(data: unknown) {
  if (typeof data !== 'string' || data.length > 65536) {
    throw new Error('Invalid exec input')
  }
  return data
}

// Validate Dockerfile text submitted for an image build — content itself
// can't be meaningfully restricted (it's arbitrary build instructions the
// user chose to run on their own VPS), only capped in size.
export function validateDockerfileText(text: unknown) {
  if (typeof text !== 'string' || text.length === 0 || text.length > 65536) {
    throw new Error('Invalid Dockerfile content')
  }
  return text
}

// Validate a build-args object ({ KEY: "value", ... })
export function validateBuildArgs(args: unknown): Record<string, string> {
  if (args === undefined || args === null) return {}
  if (typeof args !== 'object' || Array.isArray(args)) {
    throw new Error('Invalid build args')
  }
  const entries = Object.entries(args as Record<string, unknown>)
  if (entries.length > 50) throw new Error('Too many build args')
  const result: Record<string, string> = {}
  for (const [key, value] of entries) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) throw new Error(`Invalid build arg name: ${key}`)
    if (typeof value !== 'string' || value.length > 4096) throw new Error(`Invalid build arg value: ${key}`)
    result[key] = value
  }
  return result
}

// Validate a Compose stack/project name (Docker Compose project naming rules)
export function validateStackName(name: string) {
  if (!/^[a-z0-9][a-z0-9_-]{0,62}$/.test(name)) {
    throw new Error('Invalid stack name — use lowercase letters, digits, - and _ only')
  }
  return name
}

// Validate compose YAML text — content is the user's own deploy spec for
// their own VPS, only capped in size.
export function validateComposeYaml(text: unknown) {
  if (typeof text !== 'string' || text.length === 0 || text.length > 262144) {
    throw new Error('Invalid compose file')
  }
  return text
}

// Validate a "KEY=VALUE" environment variable entry
export function validateEnvVar(entry: string) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*=.{0,4096}$/.test(entry)) {
    throw new Error(`Invalid environment variable: ${entry}`)
  }
  return entry
}
