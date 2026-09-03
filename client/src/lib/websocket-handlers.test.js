import { describe, it, expect, beforeEach, vi } from "vitest";
import { handleSocketMessages } from "./websocket-handlers";
import { WS_ACTIONS } from "./actions";
import { useContainerStore } from "../store/container";
import { useSystemStore } from "../store/system";
import { useLogsStore } from "../store/logs";
import { useInspectStore } from "../store/inspect";
import { useExecStore } from "../store/exec";
import { useImageBuildStore } from "../store/imageBuild";
import { useStackStore } from "../store/stack";
import { useEngineStore } from "../store/engine";

function send(message) {
  handleSocketMessages(JSON.stringify(message));
}

beforeEach(() => {
  useContainerStore.setState({ containers: [] });
  useSystemStore.setState({ systemData: {}, serverData: {} });
  useLogsStore.setState({ containerId: null, lines: [], loading: false });
  useInspectStore.setState({ containerId: null, data: null, loading: false });
  useExecStore.setState({ open: false, containerId: null, sessionId: null, status: "idle", error: null });
  useImageBuildStore.setState({ open: false, sessionId: null, tag: null, lines: [], status: "idle", error: null });
  useStackStore.setState({ runningStacks: [], opType: null, sessionId: null, targetName: null, lines: [], status: "idle", error: null });
  useEngineStore.setState({ info: null, logs: [] });
});

describe("handleSocketMessages — routing to stores", () => {
  it("routes agent:online/offline to the system store", () => {
    send({ type: WS_ACTIONS.AGENT_ONLINE });
    expect(useSystemStore.getState().systemData.agentState).toBe("online");

    send({ type: WS_ACTIONS.AGENT_OFFLINE });
    expect(useSystemStore.getState().systemData.agentState).toBe("offline");
  });

  it("routes containers:list:result to the container store", () => {
    send({ type: WS_ACTIONS.CONTAINER_LIST_RESULT, data: [{ shortId: "a1" }] });
    expect(useContainerStore.getState().containers).toEqual([{ shortId: "a1" }]);
  });

  it("routes system:stats:result to the system store, merging fields", () => {
    send({ type: WS_ACTIONS.SYSTEM_STATS_RESULT, data: { cpu: { usagePercent: 42 } } });
    expect(useSystemStore.getState().systemData.cpu).toEqual({ usagePercent: 42 });
  });

  it("routes containers:logs:result to the logs store for the open container", () => {
    useLogsStore.getState().openFor("c1");
    send({ type: WS_ACTIONS.CONTAINER_LOGS_RESULT, data: { containerId: "c1", logs: ["line 1"] } });
    expect(useLogsStore.getState().lines).toEqual(["line 1"]);
  });

  it("routes containers:inspect:result to the inspect store", () => {
    useInspectStore.getState().openFor("c1");
    send({ type: WS_ACTIONS.CONTAINER_INSPECT_RESULT, data: { id: "c1", image: "nginx" } });
    expect(useInspectStore.getState().data).toEqual({ id: "c1", image: "nginx" });
  });

  it("routes containers:remove:result to remove the container from the list", () => {
    useContainerStore.getState().setContainers([{ shortId: "a1" }, { shortId: "b2" }]);
    send({ type: WS_ACTIONS.CONTAINER_REMOVE_RESULT, data: { containerId: "a1" } });
    expect(useContainerStore.getState().containers).toEqual([{ shortId: "b2" }]);
  });
});

describe("handleSocketMessages — docker:event fan-out", () => {
  it("marks a container running on a 'start' event", () => {
    useContainerStore.getState().setContainers([{ id: "abc", state: "exited" }]);
    send({ type: WS_ACTIONS.DOCKER_EVENT, kind: "container", event: "start", actor: "abc" });

    const container = useContainerStore.getState().containers.find((c) => c.id === "abc");
    expect(container).toMatchObject({ state: "running", process: false });
  });

  it("marks a container exited on a 'die' event", () => {
    useContainerStore.getState().setContainers([{ id: "abc", state: "running" }]);
    send({ type: WS_ACTIONS.DOCKER_EVENT, kind: "container", event: "die", actor: "abc" });

    const container = useContainerStore.getState().containers.find((c) => c.id === "abc");
    expect(container).toMatchObject({ state: "exited", process: false });
  });

  it("marks a container mid-action (process:true) on a 'kill' event", () => {
    useContainerStore.getState().setContainers([{ id: "abc", state: "running" }]);
    send({ type: WS_ACTIONS.DOCKER_EVENT, kind: "container", event: "kill", actor: "abc" });

    expect(useContainerStore.getState().containers[0].process).toBe(true);
  });

  it("ignores docker events for kinds other than 'container' (e.g. image events)", () => {
    useContainerStore.getState().setContainers([{ id: "abc", state: "running" }]);
    send({ type: WS_ACTIONS.DOCKER_EVENT, kind: "image", event: "pull" });

    expect(useContainerStore.getState().containers[0].state).toBe("running");
  });
});

describe("handleSocketMessages — interactive exec", () => {
  it("moves the exec session to ready on containers:exec:ready", () => {
    useExecStore.setState({ sessionId: "s1", status: "connecting" });
    send({ type: WS_ACTIONS.CONTAINER_EXEC_READY, sessionId: "s1" });
    expect(useExecStore.getState().status).toBe("ready");
  });

  it("forwards containers:exec:data to the registered terminal listener", () => {
    const listener = vi.fn();
    useExecStore.setState({ sessionId: "s1" });
    useExecStore.getState().setDataListener(listener);

    send({ type: WS_ACTIONS.CONTAINER_EXEC_DATA, sessionId: "s1", data: "hello\r\n" });

    expect(listener).toHaveBeenCalledWith("s1", "hello\r\n");
  });

  it("marks the session errored on containers:exec:error, carrying the message", () => {
    useExecStore.setState({ sessionId: "s1", status: "ready" });
    send({ type: WS_ACTIONS.CONTAINER_EXEC_ERROR, sessionId: "s1", error: "container not running" });

    expect(useExecStore.getState()).toMatchObject({ status: "error", error: "container not running" });
  });
});

describe("handleSocketMessages — window events for fire-and-forget refreshes", () => {
  it("dispatches images:built only when the build succeeded", () => {
    const handler = vi.fn();
    window.addEventListener("images:built", handler);

    send({ type: WS_ACTIONS.IMAGES_BUILD_DONE, sessionId: "b1", ok: false, error: "boom" });
    expect(handler).not.toHaveBeenCalled();

    send({ type: WS_ACTIONS.IMAGES_BUILD_DONE, sessionId: "b1", ok: true });
    expect(handler).toHaveBeenCalledTimes(1);

    window.removeEventListener("images:built", handler);
  });

  it("dispatches stacks:changed only when a deploy/down succeeded", () => {
    const handler = vi.fn();
    window.addEventListener("stacks:changed", handler);

    send({ type: WS_ACTIONS.STACKS_DEPLOY_DONE, sessionId: "d1", ok: false, error: "boom" });
    expect(handler).not.toHaveBeenCalled();

    send({ type: WS_ACTIONS.STACKS_DOWN_DONE, sessionId: "d2", ok: true });
    expect(handler).toHaveBeenCalledTimes(1);

    window.removeEventListener("stacks:changed", handler);
  });

  it("also finishes the corresponding stack store operation", () => {
    useStackStore.setState({ sessionId: "d1", status: "running" });
    send({ type: WS_ACTIONS.STACKS_DEPLOY_DONE, sessionId: "d1", ok: true });
    expect(useStackStore.getState().status).toBe("done");
  });
});

describe("handleSocketMessages — engine info & logs", () => {
  it("routes system:engineInfo:result and system:logsTail:result to the engine store", () => {
    send({ type: WS_ACTIONS.SYSTEM_ENGINE_INFO_RESULT, data: { version: "27.0.0" } });
    send({ type: WS_ACTIONS.SYSTEM_LOGS_TAIL_RESULT, data: [{ container: "web", line: "hi" }] });

    expect(useEngineStore.getState().info).toEqual({ version: "27.0.0" });
    expect(useEngineStore.getState().logs).toEqual([{ container: "web", line: "hi" }]);
  });
});

describe("handleSocketMessages — resilience", () => {
  it("does not throw on malformed JSON", () => {
    expect(() => handleSocketMessages("{not json")).not.toThrow();
  });

  it("does not throw on a message with an unrecognized type", () => {
    expect(() => send({ type: "totally:unknown:action", data: {} })).not.toThrow();
  });

  it("does nothing when the message has no type field", () => {
    useContainerStore.getState().setContainers([{ shortId: "a1" }]);
    send({ data: [{ shortId: "z9" }] });
    expect(useContainerStore.getState().containers).toEqual([{ shortId: "a1" }]);
  });
});
