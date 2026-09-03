import { describe, it, expect, beforeEach } from "vitest";
import { useSystemStore } from "./system";

beforeEach(() => {
  useSystemStore.setState({ systemData: {}, serverData: {} });
});

describe("useSystemStore", () => {
  it("setSystemData merges into existing systemData rather than replacing it", () => {
    useSystemStore.getState().setSystemData({ cpu: { usagePercent: 10 } });
    useSystemStore.getState().setSystemData({ memory: { usagePercent: 20 } });

    expect(useSystemStore.getState().systemData).toEqual({
      cpu: { usagePercent: 10 },
      memory: { usagePercent: 20 },
    });
  });

  it("setAgentState sets agentState without disturbing other systemData fields", () => {
    useSystemStore.getState().setSystemData({ cpu: { usagePercent: 10 } });
    useSystemStore.getState().setAgentState("online");

    expect(useSystemStore.getState().systemData).toEqual({
      cpu: { usagePercent: 10 },
      agentState: "online",
    });
  });

  it("setServerData merges into existing serverData", () => {
    useSystemStore.getState().setServerData({ dockerCommand: "docker run ..." });
    useSystemStore.getState().setServerData({ agentKey: "key-1" });

    expect(useSystemStore.getState().serverData).toEqual({
      dockerCommand: "docker run ...",
      agentKey: "key-1",
    });
  });
});
