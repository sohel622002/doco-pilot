import Docker from "dockerode";

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
  return containers.map((c) => ({
    id: c.Id,
    shortId: c.Id.slice(0, 12),
    names: c.Names.map((n) => n.replace(/^\//, "")),
    image: c.Image,
    status: c.Status,
    state: c.State, // 'running' | 'exited' | 'paused' etc.
    ports: c.Ports,
    created: c.Created,
  }));
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
