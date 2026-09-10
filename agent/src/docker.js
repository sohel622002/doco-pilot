import Docker from "dockerode";
import tar from "tar-stream";

// {
//   socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock'
// }
const docker = new Docker();

// Verify Docker is reachable on startup
export async function pingDocker() {
  await docker.ping();
  console.log("Docker socket connected");
}

// ── Containers ───────────────────────────────────────────────

export async function listContainers() {
  const containers = await docker.listContainers({ all: true });
  return Promise.all(
    containers.map(async (c) => {
      let restartCount = 0;
      let healthStatus = null;
      try {
        const info = await docker.getContainer(c.Id).inspect();
        restartCount = info.RestartCount ?? 0;
        healthStatus = info.State?.Health?.Status ?? null;
      } catch {
        // container may have been removed between list and inspect; ignore
      }
      return {
        id: c.Id,
        shortId: c.Id.slice(0, 12),
        names: c.Names.map((n) => n.replace(/^\//, "")),
        image: c.Image,
        status: c.Status,
        state: c.State, // 'running' | 'exited' | 'paused' etc.
        ports: c.Ports,
        created: c.Created,
        restartCount,
        healthStatus,
      };
    }),
  );
}

// Compute CPU % the same way `docker stats` does
function calcCpuPercent(stats) {
  const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
  const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
  const onlineCpus =
    stats.cpu_stats.online_cpus || stats.cpu_stats.cpu_usage.percpu_usage?.length || 1;
  if (systemDelta > 0 && cpuDelta > 0) {
    return (cpuDelta / systemDelta) * onlineCpus * 100;
  }
  return 0;
}

function formatContainerStats(id, stats) {
  const memUsed = stats.memory_stats.usage ?? 0;
  const memLimit = stats.memory_stats.limit ?? 0;
  const networks = stats.networks ?? {};
  const { rx, tx } = Object.values(networks).reduce(
    (acc, n) => ({ rx: acc.rx + (n.rx_bytes ?? 0), tx: acc.tx + (n.tx_bytes ?? 0) }),
    { rx: 0, tx: 0 },
  );

  return {
    id,
    shortId: id.slice(0, 12),
    cpuPercent: Number(calcCpuPercent(stats).toFixed(1)),
    memory: {
      usedBytes: memUsed,
      limitBytes: memLimit,
      usagePercent: memLimit > 0 ? Number(((memUsed / memLimit) * 100).toFixed(1)) : 0,
    },
    network: {
      rxBytes: rx,
      txBytes: tx,
    },
  };
}

export async function getContainerStats(containerId) {
  const container = docker.getContainer(containerId);
  const stats = await container.stats({ stream: false });
  return formatContainerStats(containerId, stats);
}

export async function getAllContainerStats() {
  const containers = await docker.listContainers({ all: false }); // only running containers have stats
  const results = await Promise.all(
    containers.map(async (c) => {
      try {
        return await getContainerStats(c.Id);
      } catch {
        return null;
      }
    }),
  );
  return results.filter(Boolean);
}

export async function inspectContainer(containerId) {
  const container = docker.getContainer(containerId);
  const info = await container.inspect();
  return {
    id: info.Id,
    name: info.Name.replace(/^\//, ""),
    image: info.Config.Image,
    state: info.State,
    networkMode: info.HostConfig.NetworkMode,
    ports: info.NetworkSettings.Ports,
    mounts: info.Mounts,
    env: info.Config.Env,
    created: info.Created,
    restartPolicy: info.HostConfig.RestartPolicy,
  };
}

export async function startContainer(containerId) {
  const container = docker.getContainer(containerId);
  await container.start();
  return { ok: true, action: "start", containerId };
}

export async function stopContainer(containerId) {
  const container = docker.getContainer(containerId);
  await container.stop({ t: 10 }); // 10 sec graceful timeout
  return { ok: true, action: "stop", containerId };
}

export async function pauseContainer(containerId) {
  const container = docker.getContainer(containerId);
  await container.pause({ t: 10 }); // 10 sec graceful timeout
  return { ok: true, action: "pause", containerId };
}

export async function unPauseContainer(containerId) {
  const container = docker.getContainer(containerId);
  await container.unpause({ t: 10 }); // 10 sec graceful timeout
  return { ok: true, action: "pause", containerId };
}

export async function restartContainer(containerId) {
  const container = docker.getContainer(containerId);
  await container.restart({ t: 10 });
  return { ok: true, action: "restart", containerId };
}

// opts: { image, name, ports: ["8080:80", ...], env: ["KEY=value", ...] }
export async function createContainer(opts) {
  const { image, name, ports = [], env = [] } = opts;

  const ExposedPorts = {};
  const PortBindings = {};

  for (const mapping of ports) {
    const [hostPort, containerPortProto] = mapping.split(":");
    if (!hostPort || !containerPortProto) continue;
    const containerPortKey = containerPortProto.includes("/")
      ? containerPortProto
      : `${containerPortProto}/tcp`;
    ExposedPorts[containerPortKey] = {};
    PortBindings[containerPortKey] = [{ HostPort: hostPort }];
  }

  const container = await docker.createContainer({
    Image: image,
    name: name || undefined,
    Env: env,
    ExposedPorts,
    HostConfig: { PortBindings, RestartPolicy: { Name: "unless-stopped" } },
  });

  await container.start();

  return { ok: true, action: "create", containerId: container.id, image, name };
}

export async function removeContainer(containerId) {
  const container = docker.getContainer(containerId);
  await container.remove({ force: true });
  return { ok: true, action: "remove", containerId };
}

export async function getContainerLogs(containerId) {
  const container = docker.getContainer(containerId);
  const logBuffer = await container.logs({
    stdout: true,
    stderr: true,
    tail: 200, // last 200 lines
    timestamps: true,
  });
  // Dockerode returns a Buffer with multiplexed stdout/stderr
  // Strip the 8-byte stream header from each line
  const raw = logBuffer.toString("utf8");
  const lines = raw
    .split("\n")
    .filter(Boolean)
    .map((line) => (line.length > 8 ? line.slice(8) : line));
  return { containerId, logs: lines };
}

// ── Images ───────────────────────────────────────────────────

export async function listImages() {
  const images = await docker.listImages({ all: false });
  return images.map((img) => ({
    id: img.Id.replace("sha256:", "").slice(0, 12),
    fullId: img.Id,
    tags: img.RepoTags ?? [],
    size: img.Size,
    created: new Date(img.Created * 1000).toISOString(),
  }));
}

export async function pullImage(imageName) {
  await new Promise((resolve, reject) => {
    docker.pull(imageName, (err, stream) => {
      if (err) return reject(err);
      docker.modem.followProgress(stream, (err) => (err ? reject(err) : resolve()));
    });
  });
  return { ok: true, action: "pull", imageName };
}

export async function removeImage(imageId) {
  const image = docker.getImage(imageId);
  await image.remove({ force: true });
  return { ok: true, action: "remove", imageId };
}

export async function getDanglingImages() {
  const images = await docker.listImages({ filters: { dangling: ["true"] } });
  return images.map((img) => ({
    id: img.Id.replace("sha256:", "").slice(0, 12),
    fullId: img.Id,
    size: img.Size,
    created: new Date(img.Created * 1000).toISOString(),
  }));
}

export async function pruneImages() {
  const result = await docker.pruneImages({ filters: { dangling: { true: true } } });
  return {
    ok: true,
    action: "prune",
    imagesDeleted: result.ImagesDeleted?.length ?? 0,
    spaceReclaimed: result.SpaceReclaimed ?? 0,
  };
}

// Builds an image from Dockerfile text (single-file build context — no
// COPY/ADD of extra files, since the only input we accept over the WS
// protocol is the Dockerfile itself). Streams each build log line to
// `onLog` as it arrives; resolves once the build completes.
export async function buildImageFromDockerfile(dockerfileText, { tag, buildArgs = {} } = {}, onLog) {
  const pack = tar.pack();
  pack.entry({ name: "Dockerfile" }, dockerfileText);
  pack.finalize();

  const stream = await docker.buildImage(pack, { t: tag, buildargs: buildArgs });

  return new Promise((resolve, reject) => {
    docker.modem.followProgress(
      stream,
      (err, res) => {
        if (err) return reject(err);
        const failure = res?.find((r) => r.errorDetail || r.error);
        if (failure) return reject(new Error(failure.errorDetail?.message || failure.error));
        resolve({ ok: true, tag });
      },
      (event) => {
        const line = event.stream ?? event.status ?? (event.error ? `ERROR: ${event.error}` : null);
        if (line && line.trim()) onLog(line.replace(/\n$/, ""));
      },
    );
  });
}

// ── Disk usage ───────────────────────────────────────────────

export async function getDiskUsage() {
  const data = await docker.df();

  const imagesSize = data.Images?.reduce((sum, i) => sum + (i.Size ?? 0), 0) ?? 0;
  const imagesReclaimable =
    data.Images?.reduce((sum, i) => sum + (i.Containers === 0 ? (i.Size ?? 0) : 0), 0) ?? 0;

  const containersSize = data.Containers?.reduce((sum, c) => sum + (c.SizeRw ?? 0), 0) ?? 0;
  const containersReclaimable =
    data.Containers?.reduce(
      (sum, c) => sum + (c.State !== "running" ? (c.SizeRw ?? 0) : 0),
      0,
    ) ?? 0;

  const volumesSize = data.Volumes?.reduce((sum, v) => sum + (v.UsageData?.Size ?? 0), 0) ?? 0;
  const volumesReclaimable =
    data.Volumes?.reduce(
      (sum, v) => sum + ((v.UsageData?.RefCount ?? 0) === 0 ? (v.UsageData?.Size ?? 0) : 0),
      0,
    ) ?? 0;

  const buildCacheSize = data.BuildCache?.reduce((sum, b) => sum + (b.Size ?? 0), 0) ?? 0;
  const buildCacheReclaimable =
    data.BuildCache?.reduce((sum, b) => sum + (b.InUse ? 0 : (b.Size ?? 0)), 0) ?? 0;

  return {
    images: {
      count: data.Images?.length ?? 0,
      totalBytes: imagesSize,
      reclaimableBytes: imagesReclaimable,
    },
    containers: {
      count: data.Containers?.length ?? 0,
      totalBytes: containersSize,
      reclaimableBytes: containersReclaimable,
    },
    volumes: {
      count: data.Volumes?.length ?? 0,
      totalBytes: volumesSize,
      reclaimableBytes: volumesReclaimable,
    },
    buildCache: {
      count: data.BuildCache?.length ?? 0,
      totalBytes: buildCacheSize,
      reclaimableBytes: buildCacheReclaimable,
    },
    totalBytes: imagesSize + containersSize + volumesSize + buildCacheSize,
    reclaimableBytes:
      imagesReclaimable + containersReclaimable + volumesReclaimable + buildCacheReclaimable,
  };
}

// ── Volumes ──────────────────────────────────────────────────

export async function listVolumes() {
  const [{ Volumes: volumes }, containers] = await Promise.all([
    docker.listVolumes(),
    docker.listContainers({ all: true }),
  ]);

  const usageByVolume = new Map();
  for (const c of containers) {
    for (const mount of c.Mounts ?? []) {
      if (mount.Type !== "volume" || !mount.Name) continue;
      const names = usageByVolume.get(mount.Name) ?? [];
      names.push(c.Names?.[0]?.replace(/^\//, "") ?? c.Id.slice(0, 12));
      usageByVolume.set(mount.Name, names);
    }
  }

  return (volumes ?? []).map((v) => {
    const usedBy = usageByVolume.get(v.Name) ?? [];
    return {
      name: v.Name,
      driver: v.Driver,
      mountpoint: v.Mountpoint,
      created: v.CreatedAt,
      labels: v.Labels ?? {},
      usedBy,
      orphaned: usedBy.length === 0,
    };
  });
}

export async function inspectVolume(name) {
  const volume = docker.getVolume(name);
  return await volume.inspect();
}

export async function removeVolume(name) {
  const volume = docker.getVolume(name);
  await volume.remove({ force: true });
  return { ok: true, action: "remove", name };
}

// ── Networks ─────────────────────────────────────────────────

export async function listNetworks() {
  const networks = await docker.listNetworks();
  return networks.map((n) => {
    const config = n.IPAM?.Config?.[0] ?? {};
    return {
      id: n.Id.slice(0, 12),
      fullId: n.Id,
      name: n.Name,
      driver: n.Driver,
      scope: n.Scope,
      subnet: config.Subnet ?? null,
      gateway: config.Gateway ?? null,
      internal: !!n.Internal,
      attachable: !!n.Attachable,
      connectedContainers: Object.values(n.Containers ?? {}).map((c) => c.Name),
      created: n.Created,
    };
  });
}

export async function inspectNetwork(id) {
  const network = docker.getNetwork(id);
  return await network.inspect();
}

// opts: { name, driver, subnet, gateway, internal, attachable }
export async function createNetwork(opts) {
  const { name, driver = "bridge", subnet, gateway, internal = false, attachable = true } = opts;

  const IPAM =
    subnet || gateway
      ? { Config: [{ Subnet: subnet, Gateway: gateway }] }
      : undefined;

  const network = await docker.createNetwork({
    Name: name,
    Driver: driver,
    Internal: internal,
    Attachable: attachable,
    IPAM,
  });

  return { ok: true, action: "create", id: network.id, name };
}

export async function removeNetwork(id) {
  const network = docker.getNetwork(id);
  await network.remove();
  return { ok: true, action: "remove", id };
}

// ── Engine info & aggregated logs ───────────────────────────────

export async function getEngineInfo() {
  const [version, info] = await Promise.all([docker.version(), docker.info()]);
  return {
    version: version.Version,
    apiVersion: version.ApiVersion,
    os: info.OperatingSystem,
    arch: info.Architecture,
    kernelVersion: info.KernelVersion,
    storageDriver: info.Driver,
    containers: info.Containers,
    containersRunning: info.ContainersRunning,
    containersPaused: info.ContainersPaused,
    containersStopped: info.ContainersStopped,
    images: info.Images,
    cpus: info.NCPU,
    memTotalBytes: info.MemTotal,
  };
}

// Live container log tail aggregated across every running container —
// there's no generic way to tail the dockerd daemon log from inside a
// container, so this is the real substitute: each log line is already
// timestamped (from `docker logs --timestamps`), so a lexical sort on
// the ISO-8601 prefix is also a chronological sort.
export async function getAggregatedLogs({ tailPerContainer = 20 } = {}) {
  const containers = await docker.listContainers({ all: false });
  const results = await Promise.all(
    containers.map(async (c) => {
      const name = c.Names?.[0]?.replace(/^\//, "") ?? c.Id.slice(0, 12);
      try {
        const logBuffer = await docker.getContainer(c.Id).logs({
          stdout: true,
          stderr: true,
          tail: tailPerContainer,
          timestamps: true,
        });
        return logBuffer
          .toString("utf8")
          .split("\n")
          .filter(Boolean)
          .map((line) => ({ container: name, line: line.length > 8 ? line.slice(8) : line }));
      } catch {
        return [];
      }
    }),
  );
  return results.flat().sort((a, b) => a.line.localeCompare(b.line));
}

// ── Interactive exec (shell-in-container) ─────────────────────

// Starts an interactive TTY exec session inside a running container.
// Returns the dockerode exec instance (for resize) and its hijacked
// duplex stream (for stdin write / stdout read).
export async function startExecSession(containerId, { cols, rows } = {}) {
  const container = docker.getContainer(containerId);
  const exec = await container.exec({
    Cmd: ["/bin/sh", "-c", "exec bash 2>/dev/null || exec sh"],
    AttachStdin: true,
    AttachStdout: true,
    AttachStderr: true,
    Tty: true,
  });

  const stream = await exec.start({ hijack: true, stdin: true, Tty: true });

  if (cols > 0 && rows > 0) {
    await exec.resize({ w: cols, h: rows }).catch(() => {});
  }

  return { exec, stream };
}

export async function resizeExecSession(exec, cols, rows) {
  await exec.resize({ w: cols, h: rows });
}

// ── Real-time Docker events (streamed to backend) ────────────
// Returns an abort function to stop listening
export function watchDockerEvents(onEvent) {
  let stream = null;

  docker.getEvents({}, (err, eventStream) => {
    if (err) {
      console.error("Docker events error:", err.message);
      return;
    }

    stream = eventStream;

    eventStream.on("data", (chunk) => {
      try {
        const event = JSON.parse(chunk.toString());
        // Only forward container and image events
        if (["container", "image"].includes(event.Type)) {
          onEvent({
            type: "docker:event",
            event: event.Action,
            kind: event.Type,
            actor: event.Actor?.ID ?? event.Actor?.Attributes?.name,
            actorName: event.Actor?.Attributes?.name,
            exitCode: event.Actor?.Attributes?.exitCode,
            status: event.status,
            ts: event.time,
          });
        }
      } catch {
        // ignore malformed event chunks
      }
    });

    eventStream.on("error", (err) => {
      console.error("Docker event stream error:", err.message);
    });
  });

  // Return cleanup function
  return () => {
    if (stream) stream.destroy();
  };
}
