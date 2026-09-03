import { describe, it, expect, beforeEach } from "vitest";
import { useLogsStore } from "./logs";

beforeEach(() => {
  useLogsStore.setState({ containerId: null, lines: [], loading: false });
});

describe("useLogsStore", () => {
  it("openFor starts a loading state for the given container", () => {
    useLogsStore.getState().openFor("c1");
    expect(useLogsStore.getState()).toMatchObject({ containerId: "c1", lines: [], loading: true });
  });

  it("setLines only applies when the result matches the currently-open container", () => {
    useLogsStore.getState().openFor("c1");
    useLogsStore.getState().setLines("c2", ["stale response for a different container"]);

    // A late response for a container the user has since navigated away
    // from must not overwrite the modal — this is the guard against that.
    expect(useLogsStore.getState().lines).toEqual([]);
    expect(useLogsStore.getState().loading).toBe(true);
  });

  it("setLines applies and clears loading when it matches the open container", () => {
    useLogsStore.getState().openFor("c1");
    useLogsStore.getState().setLines("c1", ["line one", "line two"]);

    expect(useLogsStore.getState()).toMatchObject({ lines: ["line one", "line two"], loading: false });
  });

  it("close resets to the idle state", () => {
    useLogsStore.getState().openFor("c1");
    useLogsStore.getState().setLines("c1", ["a"]);
    useLogsStore.getState().close();

    expect(useLogsStore.getState()).toMatchObject({ containerId: null, lines: [], loading: false });
  });
});
