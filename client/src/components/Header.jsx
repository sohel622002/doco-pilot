import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

export default function Header({ servers, selectedServer }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <header className="h-16 fixed top-0 right-0 left-sidebar-width z-10 bg-surface-container-low border-b border-outline-variant flex items-center justify-between px-md w-auto">
      <div className="flex items-center flex-1 max-w-2xl">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant">
            search
          </span>

          <input
            className="w-full pl-lg pr-md py-xs bg-surface-container-low border border-outline-variant rounded-lg font-body-main focus:outline-none focus:ring-1 focus:ring-primary text-on-surface"
            placeholder="Search containers, images, or networks..."
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-md">
        {/* SERVER DROPDOWN */}
        {servers && (
          <div className="relative">
            <div
              onClick={() => setOpen(!open)}
              className="flex items-center gap-sm bg-surface-container-low border border-outline-variant px-sm py-1.5 rounded-lg cursor-pointer hover:bg-surface-container transition-colors"
            >
              <div className="flex items-center gap-xs">
                <span className="material-symbols-outlined text-[20px] text-primary">
                  dns
                </span>

                <div className="flex flex-col leading-tight">
                  <span className="text-[13px] font-semibold text-on-surface">
                    {selectedServer.name}
                  </span>

                  <span className="text-[11px] text-on-surface-variant font-code">
                    {selectedServer.ip}
                  </span>
                </div>
              </div>

              <span
                className={`material-symbols-outlined text-[18px] text-on-surface-variant ml-xs transition-transform duration-300 ${
                  open ? "rotate-180" : "rotate-0"
                }`}
              >
                keyboard_arrow_down
              </span>
            </div>

            {/* DROPDOWN MENU */}

            <div
              className={`absolute right-0 mt-2 w-52.5 bg-surface-container border border-outline-variant rounded-lg shadow-lg overflow-hidden z-50 transition-all duration-300 ease-in-out ${
                open
                  ? "max-h-64 opacity-100"
                  : "max-h-0 opacity-0 border-transparent"
              }`}
            >
              {servers.map((server) => (
                <div
                  key={server.id}
                  onClick={() => {
                    navigate(`/${server.id}`)
                    setOpen(false);
                  }}
                  className={`px-sm py-1.5 cursor-pointer hover:bg-surface-container-high transition-colors ${
                    selectedServer.id === server.id
                      ? "bg-surface-container-high"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-sm">
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
                className="px-sm py-1.5 cursor-pointer hover:bg-surface-container-high transition-colors border-t border-outline-variant flex items-center gap-sm text-primary"
              >
                <Plus size={16} />
                <span className="text-sm font-medium">Manage Servers</span>
              </div>
            </div>
          </div>
        )}

        {/* ICONS */}
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
            notifications
          </span>

          <span className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
            cloud_done
          </span>
        </div>

        {/* PROFILE */}
        <div className="h-8 w-8 rounded-full bg-surface-container-highest flex items-center justify-center overflow-hidden border border-outline-variant cursor-pointer">
          <span className="material-symbols-outlined">account_circle</span>
        </div>
      </div>
    </header>
  );
}
