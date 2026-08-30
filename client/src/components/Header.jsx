import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Plus, UserRound } from "lucide-react";

const NAV_ITEMS = [
  { name: "Dashboard", icon: "dashboard", path: "" },
  { name: "Containers", icon: "view_quilt", path: "/containers" },
  { name: "Images", icon: "layers", path: "/images" },
  { name: "Infrastructure", icon: "account_tree", path: "/infrastructure" },
  { name: "Settings", icon: "settings", path: "/settings" },
];

export default function Header({ servers, selectedServer }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <header className="grid grid-cols-3 items-center justify-between p-3 px-4 bg-card rounded-md">
      {/* BRAND */}
      <NavLink
        to="/servers"
        className="flex items-center gap-space-xs shrink-0 hover:opacity-80 transition-opacity"
      >
        <span className="logo text-3xl">DocoPilot</span>
      </NavLink>

      {/* TOP NAV PILLS */}
      {/* <nav className="flex items-center gap-1 bg-surface-container rounded-full p-1 mx-auto shadow-pill">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.name}
            to={`/${selectedServer?.id ?? ""}${item.path}`}
            end={item.path === ""}
            className={({ isActive }) =>
              `flex items-center gap-space-xs px-space-sm py-1.5 rounded-full transition-colors whitespace-nowrap font-body-main text-body-main ${
                isActive
                  ? "bg-surface-container-lowest text-primary font-semibold shadow-pill"
                  : "text-on-surface-variant hover:text-on-surface"
              }`
            }
          >
            <span className="material-symbols-outlined text-[18px]">
              {item.icon}
            </span>
            <span className="hidden md:inline">{item.name}</span>
          </NavLink>
        ))}
      </nav> */}
      <div></div>

      <div className="flex items-center justify-end gap-space-sm shrink-0">
        {/* SERVER DROPDOWN */}
        {servers && selectedServer && (
          <div className="relative">
            <div
              onClick={() => setOpen(!open)}
              className="flex items-center gap-space-sm bg-surface-container px-space-sm py-1.5 rounded-full cursor-pointer hover:bg-surface-container-high transition-colors"
            >
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-[20px] text-primary">
                  dns
                </span>

                <div className="flex-col leading-tight hidden lg:flex">
                  <span className="text-[13px] font-semibold text-on-surface">
                    {selectedServer.name}
                  </span>

                  <span className="text-[11px] text-on-surface-variant font-code">
                    {selectedServer.ip}
                  </span>
                </div>
              </div>

              <span
                className={`material-symbols-outlined text-[18px] text-on-surface-variant transition-transform duration-300 ${
                  open ? "rotate-180" : "rotate-0"
                }`}
              >
                keyboard_arrow_down
              </span>
            </div>

            {/* DROPDOWN MENU */}
            <div
              className={`absolute right-0 mt-2 w-52.5 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-card overflow-hidden z-50 transition-all duration-300 ease-in-out ${
                open
                  ? "max-h-64 opacity-100"
                  : "max-h-0 opacity-0 border-transparent"
              }`}
            >
              {servers.map((server) => (
                <div
                  key={server.id}
                  onClick={() => {
                    navigate(`/${server.id}`);
                    setOpen(false);
                  }}
                  className={`px-space-sm py-1.5 cursor-pointer hover:bg-surface-container-high transition-colors ${
                    selectedServer.id === server.id
                      ? "bg-surface-container-high"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-space-sm">
                    <span className="material-symbols-outlined text-primary text-[18px]">
                      dns
                    </span>

                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-on-surface">
                        {server.name}
                      </span>

                      <span className="text-xs text-on-surface-variant font-code">
                        {server.ip}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              <div
                onClick={() => {
                  navigate("/servers");
                  setOpen(false);
                }}
                className="px-space-sm py-1.5 cursor-pointer hover:bg-surface-container-high transition-colors border-t border-outline-variant flex items-center gap-space-sm text-primary"
              >
                <Plus size={16} />
                <span className="text-sm font-medium">Manage Servers</span>
              </div>
            </div>
          </div>
        )}

        {/* ICONS */}
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors cursor-pointer p-1.5 rounded-full hover:bg-surface-container">
            notifications
          </span>
          <span className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors cursor-pointer p-1.5 rounded-full hover:bg-surface-container">
            cloud_done
          </span>
        </div>

        {/* PROFILE */}
        <div className="h-8 w-8 rounded-full bg-primary-container flex items-center justify-center overflow-hidden cursor-pointer">
          <UserRound size={18}/>
          {/* <span className="material-symbols-outlined text-on-primary-container text-[18px]">
            account_circle
          </span> */}
        </div>
      </div>
    </header>
  );
}
