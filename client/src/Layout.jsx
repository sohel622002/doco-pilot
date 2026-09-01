import { Navigate, Outlet, useParams, useLocation } from "react-router-dom";
import { NavLink } from "react-router-dom";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Box,
  Layers,
  HardDrive,
  Waypoints,
  BellRing,
  ServerCog,
  Settings as SettingsIcon,
} from "lucide-react";
import Header from "./components/Header";
import { useServers } from "./hooks/useServers";
import { useSystemStore } from "./store/system";
import NodConnectionError from "./components/NodConnectionError";

const NAV_ITEMS = [
  { name: "Dashboard", path: "", icon: LayoutDashboard },
  { name: "Containers", path: "/containers", icon: Box },
  { name: "Images", path: "/images", icon: Layers },
  { name: "Volumes", path: "/volumes", icon: HardDrive },
  { name: "Networks", path: "/networks", icon: Waypoints },
  { name: "Alerts", path: "/alerts", icon: BellRing },
  { name: "Infrastructure", path: "/infrastructure", icon: ServerCog },
  { name: "Settings", path: "/settings", icon: SettingsIcon },
];

export default function Layout() {
  const { serverId } = useParams();
  const location = useLocation();
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
    return (
      <div className="h-screen flex items-center justify-center bg-background text-on-surface-variant font-body-main text-body-main">
        Loading…
      </div>
    );
  }

  const servers = data?.servers || [];
  const selectedServer = servers.find((server) => server.id === serverId);

  if (!selectedServer && servers.length > 0) {
    return <Navigate to={`/${servers[0].id}`} replace />;
  }

  const activeItem = [...NAV_ITEMS]
    .sort((a, b) => b.path.length - a.path.length)
    .find((item) =>
      item.path === ""
        ? location.pathname === `/${serverId}` || location.pathname === `/${serverId}/`
        : location.pathname.startsWith(`/${serverId}${item.path}`),
    );

  return (
    <div className="h-screen flex bg-background text-on-surface overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-60 shrink-0 border-r border-outline-variant flex flex-col p-4">
        <NavLink
          to="/servers"
          className="flex items-center gap-space-xs px-space-xs mb-space-lg hover:opacity-80 transition-opacity"
        >
          <span className="logo text-3xl">DocoPilot</span>
        </NavLink>

        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider px-space-xs mb-space-sm">
          Main
        </span>
        <nav>
          <ul className="flex flex-col gap-0.5">
            {NAV_ITEMS.map((item) => (
              <CustomNavLink
                key={item.name}
                item={item}
                selectedServer={selectedServer}
              />
            ))}
          </ul>
        </nav>
      </aside>

      {/* MAIN COLUMN */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          servers={servers}
          selectedServer={selectedServer}
          activeLabel={activeItem?.name ?? "Dashboard"}
        />
        <main className="flex-1 overflow-auto p-6">
          {systemData?.agentState === "online" ? (
            <Outlet />
          ) : (
            <div className="max-w-container-max mx-auto p-space-md">
              <NodConnectionError />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function CustomNavLink({ item, selectedServer }) {
  const Icon = item.icon;
  return (
    <li>
      <NavLink
        to={`/${selectedServer?.id ?? ""}${item.path}`}
        end={item.path === ""}
        className={({ isActive }) =>
          `flex items-center gap-space-sm px-space-sm py-2 rounded-md font-body-main text-body-main transition-colors ${
            isActive
              ? "bg-primary-container text-on-primary-container font-medium"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
          }`
        }
      >
        <Icon size={17} strokeWidth={2} className="shrink-0" />
        <span>{item.name}</span>
      </NavLink>
    </li>
  );
}
