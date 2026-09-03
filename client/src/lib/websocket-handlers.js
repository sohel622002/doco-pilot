import { useContainerStore } from "../store/container";
import { useSystemStore } from "../store/system";
import { useImageStore } from "../store/image";
import { useLogsStore } from "../store/logs";
import { useInspectStore } from "../store/inspect";
import { useDiskUsageStore } from "../store/diskUsage";
import { useVolumeStore } from "../store/volume";
import { useNetworkStore } from "../store/network";
import { useExecStore } from "../store/exec";
import { useImageBuildStore } from "../store/imageBuild";
import { useStackStore } from "../store/stack";
import { useEngineStore } from "../store/engine";
import { WS_ACTIONS } from "./actions";

const handleDockerEvent = (message) => {
  // const { kind, actor, status } = message;
  switch (message?.kind) {
    case "container":
      if (message?.event === "kill") {
        // killing container
        useContainerStore
          .getState()
          .updateContainer("id", message?.actor, { process: true });
      } else if (message?.event === "stop") {
        useContainerStore.getState().updateContainer("id", message?.actor, {
          process: false,
          state: "exited",
        });
      } else if (message?.event === "start") {
        useContainerStore.getState().updateContainer("id", message?.actor, {
          process: false,
          state: "running",
        });
      } else if (message?.event === "pause") {
        useContainerStore.getState().updateContainer("id", message?.actor, {
          process: false,
          state: "paused",
        });
      } else if (message?.event === "unpause") {
        useContainerStore.getState().updateContainer("id", message?.actor, {
          process: false,
          state: "running",
        });
      } else if (message?.event === "die") {
        useContainerStore.getState().updateContainer("id", message?.actor, {
          process: false,
          state: "exited",
        });
      }
      break;
  }
};

export const handleSocketMessages = (rawData) => {
  try {
    const message = JSON.parse(rawData);
    console.log("handleSocketMessages:", message);

    if (message?.type) {
      switch (message?.type) {
        case WS_ACTIONS.AGENT_ONLINE:
          useSystemStore.getState().setAgentState("online");
          break;
        case WS_ACTIONS.AGENT_OFFLINE:
          useSystemStore.getState().setAgentState("offline");
          break;
        case WS_ACTIONS.CONTAINER_LIST_RESULT:
          useContainerStore.getState().setContainers(message?.data);
          break;
        case WS_ACTIONS.DOCKER_EVENT:
          handleDockerEvent(message);
          break;
        case WS_ACTIONS.SYSTEM_STATS_RESULT:
          useSystemStore.getState().setSystemData(message?.data);
          break;
        case WS_ACTIONS.IMAGES_LIST_RESULT:
          console.log(message);
          useImageStore.getState().setImages(message?.data);
          break;
        case WS_ACTIONS.CONTAINER_LOGS_RESULT:
          useLogsStore
            .getState()
            .setLines(message?.data?.containerId, message?.data?.logs ?? []);
          break;
        case WS_ACTIONS.CONTAINER_REMOVE_RESULT:
          useContainerStore
            .getState()
            .removeContainer("shortId", message?.data?.containerId);
          break;
        case WS_ACTIONS.CONTAINER_INSPECT_RESULT:
          useInspectStore.getState().setData(message?.data);
          break;
        case WS_ACTIONS.NETWORKS_LIST_RESULT:
          useNetworkStore.getState().setNetworks(message?.data);
          break;
        case WS_ACTIONS.NETWORKS_REMOVE_RESULT:
          useNetworkStore.getState().removeNetwork(message?.data?.id);
          break;
        case WS_ACTIONS.NETWORKS_CREATE_RESULT:
          window.dispatchEvent(new CustomEvent("networks:created"));
          break;
        case WS_ACTIONS.VOLUMES_LIST_RESULT:
          useVolumeStore.getState().setVolumes(message?.data);
          break;
        case WS_ACTIONS.VOLUMES_REMOVE_RESULT:
          useVolumeStore.getState().removeVolume(message?.data?.name);
          break;
        case WS_ACTIONS.SYSTEM_DISK_USAGE_RESULT:
          useDiskUsageStore.getState().setDiskUsage(message?.data);
          break;
        case WS_ACTIONS.IMAGES_DANGLING_RESULT:
          useDiskUsageStore.getState().setDanglingImages(message?.data);
          break;
        case WS_ACTIONS.IMAGES_PRUNE_RESULT:
          window.dispatchEvent(new CustomEvent("images:pruned", { detail: message?.data }));
          break;
        case WS_ACTIONS.CONTAINERS_STATS_RESULT:
          useContainerStore.getState().setStats(message?.data);
          break;
        case WS_ACTIONS.CONTAINER_CREATE_RESULT:
          // No serverId carried on the client message we sent; the agent
          // replies over the same connection, so just ask for a fresh list.
          if (message?.serverId) {
            window.dispatchEvent(
              new CustomEvent("containers:refresh", { detail: message.serverId }),
            );
          }
          break;
        case WS_ACTIONS.CONTAINER_EXEC_READY:
          useExecStore.getState().setStatus(message?.sessionId, "ready");
          break;
        case WS_ACTIONS.CONTAINER_EXEC_DATA:
          useExecStore.getState().emitData(message?.sessionId, message?.data ?? "");
          break;
        case WS_ACTIONS.CONTAINER_EXEC_EXIT:
          useExecStore.getState().setStatus(message?.sessionId, "exited", message?.error ?? null);
          break;
        case WS_ACTIONS.CONTAINER_EXEC_ERROR:
          useExecStore.getState().setStatus(message?.sessionId, "error", message?.error ?? "Exec failed");
          break;
        case WS_ACTIONS.IMAGES_BUILD_LOG:
          useImageBuildStore.getState().appendLine(message?.sessionId, message?.line ?? "");
          break;
        case WS_ACTIONS.IMAGES_BUILD_DONE:
          useImageBuildStore
            .getState()
            .finishBuild(message?.sessionId, !!message?.ok, message?.error ?? null);
          if (message?.ok) {
            window.dispatchEvent(new CustomEvent("images:built"));
          }
          break;
        case WS_ACTIONS.STACKS_LIST_RESULT:
          useStackStore.getState().setRunningStacks(message?.data);
          break;
        case WS_ACTIONS.STACKS_DEPLOY_LOG:
        case WS_ACTIONS.STACKS_DOWN_LOG:
          useStackStore.getState().appendLine(message?.sessionId, message?.line ?? "");
          break;
        case WS_ACTIONS.STACKS_DEPLOY_DONE:
        case WS_ACTIONS.STACKS_DOWN_DONE:
          useStackStore.getState().finishOp(message?.sessionId, !!message?.ok, message?.error ?? null);
          if (message?.ok) window.dispatchEvent(new CustomEvent("stacks:changed"));
          break;
        case WS_ACTIONS.SYSTEM_ENGINE_INFO_RESULT:
          useEngineStore.getState().setInfo(message?.data);
          break;
        case WS_ACTIONS.SYSTEM_LOGS_TAIL_RESULT:
          useEngineStore.getState().setLogs(message?.data);
          break;
      }
    }
  } catch (error) {
    console.error(error);
  }
};
