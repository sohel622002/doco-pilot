import { NavLink } from "react-router-dom";

export default function Sidebar(props) {
  const navItems = [
    {
      name: "Dashboard",
      icon: "dashboard",
      path: `/${props.selectedServer?.id}`,
    },
    {
      name: "Containers",
      icon: "view_quilt",
      path: `/${props.selectedServer?.id}/containers`,
    },
    {
      name: "Images",
      icon: "layers",
      path: `/${props.selectedServer?.id}/images`,
    },
    {
      name: "Infrastructure",
      icon: "account_tree",
      path: `/${props.selectedServer?.id}/infrastructure`,
    },
    {
      name: "Settings",
      icon: "settings",
      path: `/${props.selectedServer?.id}/settings`,
    },
  ];

  return (
    <aside className="bg-surface-container-low w-sidebar-width fixed left-0 top-0 border-r border-outline-variant flex flex-col h-full py-md px-sm">
      <NavLink to="/servers" className="mb-lg px-xs block hover:opacity-80 transition-opacity">
        <h1 className="font-h1 text-h1 text-on-surface">
          {props.selectedServer?.name || "doco-pilot"}
        </h1>
        <p className="text-on-surface-variant text-label-caps opacity-70">
          Management Console
        </p>
      </NavLink>
      <nav className="grow space-y-base">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.name === "Dashboard"}
            className={({ isActive }) =>
              `flex items-center gap-sm px-sm py-xs rounded-lg transition-colors cursor-pointer ${
                isActive
                  ? "text-primary font-bold bg-surface-container"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              }`
            }
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="font-body-main">{item.name}</span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto space-y-base pt-md border-t border-outline-variant">
        <div className="flex items-center gap-sm px-sm py-xs rounded-lg text-on-surface-variant  hover:bg-surface-container-high  transition-colors cursor-pointer">
          <span className="material-symbols-outlined">terminal</span>
          <span className="font-body-main">System Logs</span>
        </div>
        <div className="flex items-center gap-sm px-sm py-xs rounded-lg text-on-surface-variant  hover:bg-surface-container-high  transition-colors cursor-pointer">
          <span className="material-symbols-outlined">help_outline</span>
          <span className="font-body-main">Support</span>
        </div>
      </div>
    </aside>
  );
}
