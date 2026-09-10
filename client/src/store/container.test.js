import { describe, it, expect, beforeEach } from "vitest";
import { useContainerStore } from "./container";

beforeEach(() => {
  useContainerStore.setState({ containers: [] });
});

describe("useContainerStore", () => {
  it("setContainers replaces the full list", () => {
    useContainerStore.getState().setContainers([{ shortId: "a1", state: "running" }]);
    expect(useContainerStore.getState().containers).toHaveLength(1);
  });

  it("updateContainer patches only the matching container by key", () => {
    useContainerStore.getState().setContainers([
      { shortId: "a1", state: "running" },
      { shortId: "b2", state: "running" },
    ]);
    useContainerStore.getState().updateContainer("shortId", "a1", { state: "exited" });

    const { containers } = useContainerStore.getState();
    expect(containers.find((c) => c.shortId === "a1").state).toBe("exited");
    expect(containers.find((c) => c.shortId === "b2").state).toBe("running");
  });

  it("removeContainer drops only the matching container", () => {
    useContainerStore.getState().setContainers([
      { shortId: "a1" },
      { shortId: "b2" },
    ]);
    useContainerStore.getState().removeContainer("shortId", "a1");

    expect(useContainerStore.getState().containers).toEqual([{ shortId: "b2" }]);
  });

  it("setStats merges per-container stats by shortId, leaving others untouched", () => {
    useContainerStore.getState().setContainers([
      { shortId: "a1" },
      { shortId: "b2" },
    ]);
    useContainerStore.getState().setStats([{ shortId: "a1", cpuPercent: 12.3 }]);

    const { containers } = useContainerStore.getState();
    expect(containers.find((c) => c.shortId === "a1").stats).toEqual({ shortId: "a1", cpuPercent: 12.3 });
    expect(containers.find((c) => c.shortId === "b2").stats).toBeUndefined();
  });

  it("setStats accepts a single object as well as an array (single-container poll)", () => {
    useContainerStore.getState().setContainers([{ shortId: "a1" }]);
    useContainerStore.getState().setStats({ shortId: "a1", cpuPercent: 5 });

    expect(useContainerStore.getState().containers[0].stats.cpuPercent).toBe(5);
  });

  it("setStats ignores null/falsy entries in the array without throwing", () => {
    useContainerStore.getState().setContainers([{ shortId: "a1" }]);
    expect(() => useContainerStore.getState().setStats([null, undefined])).not.toThrow();
  });
});
