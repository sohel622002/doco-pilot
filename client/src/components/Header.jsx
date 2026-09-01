import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, UserRound, Bell, Server, ChevronDown, Check } from "lucide-react";
import { useSystemStore } from "../store/system";
import { computeServerStatus } from "../lib/utils";

export default function Header({ servers, selectedServer, activeLabel }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const systemData = useSystemStore((state) => state.systemData);
  const { dot } = computeServerStatus(systemData, selectedServer);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <header className="flex items-center justify-between gap-space-md px-6 py-3.5 border-b border-outline-variant shrink-0">
      <span className="font-h2 text-h2 text-on-surface">{activeLabel}</span>

      <div className="flex items-center gap-space-sm shrink-0">
        {/* SERVER DROPDOWN */}
        {servers && selectedServer && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setOpen(!open)}
              className={`flex items-center gap-space-xs h-9 px-space-xs rounded-md cursor-pointer transition-colors ${
                open ? "bg-surface-container" : "hover:bg-surface-container"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dot}`}></span>

              <span className="text-[13px] font-medium text-on-surface hidden sm:inline">
                {selectedServer.name}
              </span>

              <ChevronDown
                size={14}
                className={`text-on-surface-variant transition-transform duration-300 ${
                  open ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>

            {/* DROPDOWN MENU */}
            <div
              className={`absolute right-0 mt-2 w-64 origin-top-right bg-surface-container-high border border-outline rounded-lg z-50 transition-all duration-150 ease-out ${
                open
                  ? "opacity-100 scale-100 pointer-events-auto shadow-pill"
                  : "opacity-0 scale-95 pointer-events-none"
              }`}
            >
              <span className="block px-space-sm pt-space-sm pb-space-xs font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                Servers
              </span>
              <div className="px-1.5 pb-1.5 max-h-56 overflow-y-auto">
                {servers.map((server) => {
                  const isSelected = selectedServer.id === server.id;
                  return (
                    <div
                      key={server.id}
                      onClick={() => {
                        navigate(`/${server.id}`);
                        setOpen(false);
                      }}
                      className={`flex items-center gap-space-sm px-space-xs py-2 rounded-md cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-surface-container-highest"
                          : "hover:bg-surface-container-highest"
                      }`}
                    >
                      <div className="h-7 w-7 rounded-md bg-surface-container-highest flex items-center justify-center shrink-0">
                        <Server size={14} className="text-on-surface-variant" />
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span className="text-[13px] font-medium text-on-surface truncate">
                          {server.name}
                        </span>

                        <span className="text-[11px] text-on-surface-variant font-code">
                          {server.ip}
                        </span>
                      </div>

                      {isSelected && (
                        <Check size={15} className="text-primary ml-auto shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
              <div
                onClick={() => {
                  navigate("/servers");
                  setOpen(false);
                }}
                className="flex items-center gap-space-sm px-space-sm py-2.5 cursor-pointer hover:bg-surface-container-highest transition-colors border-t border-outline-variant text-primary"
              >
                <Plus size={15} />
                <span className="text-[13px] font-medium">Manage Servers</span>
              </div>
            </div>
          </div>
        )}

        <span className="h-6 w-px bg-outline-variant mx-space-xs"></span>

        {/* ICONS */}
        <button className="h-9 w-9 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer rounded-md hover:bg-surface-container">
          <Bell size={16} />
        </button>

        {/* PROFILE */}
        <button
          onClick={() => navigate(`/${selectedServer?.id ?? ""}/profile`)}
          className="h-9 w-9 rounded-full bg-surface-container-high flex items-center justify-center overflow-hidden cursor-pointer hover:bg-surface-container-highest transition-colors"
        >
          <UserRound size={15} className="text-on-surface-variant" />
        </button>
      </div>
    </header>
  );
}
