import { Navigate, Outlet, useParams } from "react-router-dom";
import Header from "./components/Header";
import { useServers } from "./hooks/useServers";
import { useEffect } from "react";
import { useSystemStore } from "./store/system";
import NodConnectionError from "./components/NodConnectionError";
import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { name: "Dashboard", path: "" },
  { name: "Containers", path: "/containers" },
  { name: "Images", path: "/images" },
  { name: "Volumes", path: "/volumes" },
  { name: "Networks", path: "/networks" },
  { name: "Alerts", path: "/alerts" },
  { name: "Infrastructure", path: "/infrastructure" },
  { name: "Settings", path: "/settings" },
];

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
      <section className="flex flex-col gap-3 max-w-5xl mx-auto h-screen p-4 overflow-hidden">
        <Header servers={servers} selectedServer={selectedServer} />
        <main className="flex flex-1 h-full gap-3 overflow-hidden">
          <aside className="min-w-60 bg-card rounded-md p-3">
            <ul>
              {NAV_ITEMS.map((item) => (
                <CustomNavLink
                  key={item.name}
                  item={item}
                  selectedServer={selectedServer}
                />
              ))}
              {/* <NavLink>Containers</NavLink>
              <NavLink>Images</NavLink>
              <NavLink>Volumes</NavLink> */}
            </ul>
          </aside>
          <div className="bg-card rounded-md flex-1 p-4 overflow-auto">
            {systemData?.agentState === "online" ? (
              <Outlet />
            ) : (
              <div className="max-w-container-max mx-auto p-space-md">
                <NodConnectionError />
              </div>
            )}
          </div>
        </main>
      </section>
    </>
  );
}

function CustomNavLink({ item, selectedServer }) {
  return (
    <li>
      <NavLink
        to={`/${selectedServer?.id ?? ""}${item.path}`}
        end={item.path === ""}
        className={({ isActive }) =>
          `relative block py-2 px-2 rounded-sm ${
            isActive
              ? "bg-primary before:absolute before:content-none before:left-0 before:h-full before:bg-primary"
              : "text-on-surface-variant hover:text-on-surface"
          }`
        }
      >
        <span className="material-symbols-outlined text-[18px]">
          {item.icon}
        </span>
        <span className="hidden md:inline">{item.name}</span>
      </NavLink>
    </li>
  );
}
