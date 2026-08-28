import { useContainerStore } from "../store/container";
import { useSystemStore } from "../store/system";
import { useImageStore } from "../store/image";
import { useLogsStore } from "../store/logs";
import { useInspectStore } from "../store/inspect";
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
        case WS_ACTIONS.CONTAINER_CREATE_RESULT:
          // No serverId carried on the client message we sent; the agent
          // replies over the same connection, so just ask for a fresh list.
          if (message?.serverId) {
            window.dispatchEvent(
              new CustomEvent("containers:refresh", { detail: message.serverId }),
            );
          }
          break;
      }
    }
  } catch (error) {
    console.error(error);
  }
};
