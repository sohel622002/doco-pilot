import { describe, it, expect, beforeEach } from "vitest";
import { useInspectStore } from "./inspect";

beforeEach(() => {
  useInspectStore.setState({ containerId: null, data: null, loading: false });
});

describe("useInspectStore", () => {
  it("openFor starts loading for the given container and clears prior data", () => {
    useInspectStore.setState({ data: { stale: true } });
    useInspectStore.getState().openFor("c1");

    expect(useInspectStore.getState()).toMatchObject({ containerId: "c1", data: null, loading: true });
  });

  it("setData is a no-op when the modal isn't open (no containerId)", () => {
    useInspectStore.getState().setData({ id: "c1" });
    expect(useInspectStore.getState().data).toBeNull();
  });

  it("setData applies once a container is open, regardless of which one", () => {
    useInspectStore.getState().openFor("c1");
    useInspectStore.getState().setData({ id: "c1", image: "nginx" });

    expect(useInspectStore.getState()).toMatchObject({ data: { id: "c1", image: "nginx" }, loading: false });
  });

  it("close resets to the idle state", () => {
    useInspectStore.getState().openFor("c1");
    useInspectStore.getState().setData({ id: "c1" });
    useInspectStore.getState().close();

    expect(useInspectStore.getState()).toMatchObject({ containerId: null, data: null, loading: false });
  });
});
