import { Navigate, Outlet, useParams } from "react-router-dom";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import { useServers } from "./hooks/useServers";
import { useEffect } from "react";
import { useSystemStore } from "./store/system";
import NodConnectionError from "./components/NodConnectionError";

export default function Layout() {
  const { serverId } = useParams();
  const { data, isLoading } = useServers();
  const systemData = useSystemStore((state) => state.systemData);
  const setServerData = useSystemStore((state) => state.setServerData);

  async function getServerCreds(serverId) {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_API_URL}/api/servers/${serverId}/credentials`,
        {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!res.ok) {
        const err = await res.json();
        console.error(err.message || "Server creds get failed");
        return;
      }

      const serverData = await res.json();
      // success
      console.log("serverData", serverData);
      if (serverData) {
        setServerData(serverData);
      } else {
        console.error("Docker command not found from server data!");
      }
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    if (serverId) {
      getServerCreds(serverId);
    }
  }, [serverId]);

  if (isLoading) {
    return <p>Loading...</p>;
  }

  const servers = data?.servers || [];
  const selectedServer = servers.find((server) => server.id === serverId);

  if (!selectedServer && servers.length > 0) {
    return <Navigate to={`/${servers[0].id}`} replace />;
  }

  return (
    <>
      <Sidebar selectedServer={selectedServer} />
      <Header servers={servers} selectedServer={selectedServer} />
      <main className="ml-sidebar-width pt-14 min-h-screen">
        {systemData?.agentState === "online" ? (
          <Outlet />
        ) : (
          <div className="max-w-container-max mx-auto p-space-md">
            <NodConnectionError />
          </div>
        )}
      </main>
    </>
  );
}
