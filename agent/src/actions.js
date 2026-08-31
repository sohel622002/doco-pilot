import {
  listContainers,
  inspectContainer,
  startContainer,
  stopContainer,
  restartContainer,
  createContainer,
  removeContainer,
  getContainerLogs,
  listImages,
  pauseContainer,
  unPauseContainer,
  pullImage,
  removeImage,
  getContainerStats,
  getAllContainerStats,
  getDiskUsage,
  getDanglingImages,
  pruneImages,
  listVolumes,
  inspectVolume,
  removeVolume,
  listNetworks,
  inspectNetwork,
  createNetwork,
  removeNetwork,
} from "./docker.js";
import { systemStats } from "./system.js";

// Map action strings → handler functions
const ACTION_HANDLERS = {
  "containers:list": async () => ({
    type: "containers:list:result",
    data: await listContainers(),
  }),
  "containers:inspect": async ({ containerId }) => ({
    type: "containers:inspect:result",
    data: await inspectContainer(containerId),
  }),
  "containers:start": async ({ containerId }) => ({
    type: "containers:start:result",
    data: await startContainer(containerId),
  }),
  "containers:stop": async ({ containerId }) => ({
    type: "containers:stop:result",
    data: await stopContainer(containerId),
  }),
  "containers:pause": async ({ containerId }) => ({
    type: "containers:pause:result",
    data: await pauseContainer(containerId),
  }),
  "containers:unpause": async ({ containerId }) => ({
    type: "containers:unpause:result",
    data: await unPauseContainer(containerId),
  }),
  "containers:restart": async ({ containerId }) => ({
    type: "containers:restart:result",
    data: await restartContainer(containerId),
  }),
  "containers:logs": async ({ containerId }) => ({
    type: "containers:logs:result",
    data: await getContainerLogs(containerId),
  }),
  "containers:remove": async ({ containerId }) => ({
    type: "containers:remove:result",
    data: await removeContainer(containerId),
  }),
  "containers:create": async ({ image, name, ports, env }) => ({
    type: "containers:create:result",
    data: await createContainer({ image, name, ports, env }),
  }),
  "containers:stats": async ({ containerId }) => ({
    type: "containers:stats:result",
    data: containerId ? await getContainerStats(containerId) : await getAllContainerStats(),
  }),
  "system:stats": async () => ({
    type: "system:stats:result",
    data: await systemStats(),
  }),
  "images:list": async () => ({
    type: "images:list:result",
    data: await listImages(),
  }),
  "images:pull": async ({ imageName }) => ({
    type: "images:pull:result",
    data: await pullImage(imageName),
  }),
  "images:remove": async ({ imageId }) => ({
    type: "images:remove:result",
    data: await removeImage(imageId),
  }),
  "images:prune": async () => ({
    type: "images:prune:result",
    data: await pruneImages(),
  }),
  "images:dangling": async () => ({
    type: "images:dangling:result",
    data: await getDanglingImages(),
  }),
  "system:diskUsage": async () => ({
    type: "system:diskUsage:result",
    data: await getDiskUsage(),
  }),
  "volumes:list": async () => ({
    type: "volumes:list:result",
    data: await listVolumes(),
  }),
  "volumes:inspect": async ({ volumeName }) => ({
    type: "volumes:inspect:result",
    data: await inspectVolume(volumeName),
  }),
  "volumes:remove": async ({ volumeName }) => ({
    type: "volumes:remove:result",
    data: await removeVolume(volumeName),
  }),
  "networks:list": async () => ({
    type: "networks:list:result",
    data: await listNetworks(),
  }),
  "networks:inspect": async ({ networkId }) => ({
    type: "networks:inspect:result",
    data: await inspectNetwork(networkId),
  }),
  "networks:create": async ({ name, networkDriver, subnet, gateway }) => ({
    type: "networks:create:result",
    data: await createNetwork({ name, driver: networkDriver, subnet, gateway }),
  }),
  "networks:remove": async ({ networkId }) => ({
    type: "networks:remove:result",
    data: await removeNetwork(networkId),
  }),
};

// Execute an incoming action and return the result payload
export async function handleAction(msg) {
  const {
    action,
    containerId,
    imageId,
    imageName,
    image,
    name,
    ports,
    env,
    volumeName,
    networkId,
    networkDriver,
    subnet,
    gateway,
  } = msg;

  const handler = ACTION_HANDLERS[action];
  if (!handler) {
    throw new Error(`Unknown action: ${action}`);
  }

  return await handler({
    containerId,
    imageId,
    imageName,
    image,
    name,
    ports,
    env,
    volumeName,
    networkId,
    networkDriver,
    subnet,
    gateway,
  });
}
