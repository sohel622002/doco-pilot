import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  SlidersHorizontal,
  Terminal,
  Download,
  Trash2,
  CheckCircle2,
  Clock,
  HardDrive,
  BookOpen,
} from "lucide-react";
import api from "../lib/axios";
import { Card, Button } from "../components/ui";
import AgentInstallation from "../components/AgentInstallation";

function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-space-sm mb-space-md pb-space-sm border-b border-outline-variant">
      <Icon size={17} className="text-primary" />
      <h2 className="font-h2 text-h2 text-on-surface">{title}</h2>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div className="space-y-space-xs">
      <label className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider block">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full h-10 px-space-sm bg-surface-container border border-outline-variant rounded-md text-body-main text-on-surface outline-none focus:border-outline disabled:text-on-surface-variant disabled:cursor-not-allowed";

function ServerSetupSection() {
  return (
    <div>
      <Card>
        <AgentInstallation />
      </Card>
      <div className="pt-space-lg flex items-center justify-center">
        <a
          className="flex items-center gap-space-xs text-on-surface-variant hover:text-on-surface transition-colors font-body-main text-body-main"
          href="#"
        >
          <BookOpen size={16} />
          Read the detailed Server Setup Guide
        </a>
      </div>
    </div>
  );
}

function DangerZoneSection() {
  const { serverId } = useParams();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  const handleDeleteServer = async () => {
    if (!window.confirm("Delete this server? The agent will be disconnected and its credentials revoked. This cannot be undone.")) {
      return;
    }
    setDeleting(true);
    try {
      await api.delete(`/api/servers/${serverId}`);
      navigate("/");
    } catch (err) {
      console.error("Failed to delete server:", err);
      setDeleting(false);
    }
  };

  return (
    <div className="p-space-md bg-card border border-error/40 rounded-lg">
      <div className="flex items-center justify-between gap-space-md">
        <div>
          <h3 className="font-h2 text-h2 text-error">Danger Zone</h3>
          <p className="font-body-main text-body-main text-on-surface-variant">
            Deleting this server revokes the agent's credentials and removes it
            from your account. The agent container itself must be removed manually
            from the host.
          </p>
        </div>
        <button
          onClick={handleDeleteServer}
          disabled={deleting}
          className="h-9 px-space-md rounded-md bg-error text-on-error font-body-main text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          {deleting ? "Deleting…" : "Delete Server"}
        </button>
      </div>
    </div>
  );
}

function Toggle({ checked }) {
  return (
    <div
      className={`relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer transition-colors shrink-0 ${
        checked ? "bg-primary" : "bg-surface-container-highest"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      ></span>
    </div>
  );
}

const LOG_LEVEL_COLOR = {
  INFO: "text-on-surface-variant",
  DEBUG: "text-primary",
  ERROR: "text-error",
};

const MOCK_LOGS = [
  { ts: "14:22:01", level: "INFO", msg: "Docker Engine v24.0.5 starting..." },
  { ts: "14:22:02", level: "INFO", msg: "Loading storage driver: overlay2" },
  { ts: "14:22:04", level: "DEBUG", msg: "Initializing graphdriver: overlay2" },
  { ts: "14:22:05", level: "INFO", msg: "Firewalld running: false" },
  { ts: "14:22:07", level: "ERROR", msg: "Failed to register layer: sha256:0a3..." },
  { ts: "14:22:08", level: "INFO", msg: "Retrying layer pull..." },
  { ts: "14:23:12", level: "INFO", msg: "API listen on /var/run/docker.sock" },
  { ts: "14:23:15", level: "INFO", msg: 'Container "nginx-proxy" started (id: d5e8...)' },
  { ts: "14:23:16", level: "INFO", msg: 'Container "redis-main" started (id: a1f2...)' },
  { ts: "14:24:01", level: "DEBUG", msg: "Collecting system metrics..." },
  { ts: "14:24:05", level: "INFO", msg: "Garbage collection successful (0.5ms)" },
  { ts: "14:24:10", level: "INFO", msg: "Waiting for next health check..." },
  { ts: "14:25:00", level: "INFO", msg: "New configuration detected. Reloading daemon..." },
];

function EngineSection() {
  return (
    <div>
      <SectionHeader icon={SlidersHorizontal} title="Engine &amp; Logs" />

      {/* <!-- Status Strip --> */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <Card className="flex items-center justify-between">
          <div>
            <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-space-xs">
              Engine Status
            </p>
            <h3 className="text-h2 font-h2 text-on-surface">Operational</h3>
          </div>
          <div className="h-10 w-10 rounded-md bg-[#173626] flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} className="text-[#5fd696]" />
          </div>
        </Card>
        <Card className="flex items-center justify-between">
          <div>
            <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-space-xs">
              Uptime
            </p>
            <h3 className="text-h2 font-h2 text-on-surface">14d 2h 44m</h3>
          </div>
          <div className="h-10 w-10 rounded-md bg-surface-container-high flex items-center justify-center shrink-0">
            <Clock size={18} className="text-on-surface-variant" />
          </div>
        </Card>
        <Card className="flex items-center justify-between">
          <div>
            <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-space-xs">
              Disk Usage
            </p>
            <h3 className="text-h2 font-h2 text-on-surface">42.8 GB</h3>
          </div>
          <div className="h-10 w-10 rounded-md bg-surface-container-high flex items-center justify-center shrink-0">
            <HardDrive size={18} className="text-on-surface-variant" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 items-start">
        {/* <!-- Engine Configuration --> */}
        <Card>
          <SectionHeader icon={SlidersHorizontal} title="Engine Configuration" />
          <div className="space-y-space-lg">
            <div className="space-y-space-sm">
              <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                General Parameters
              </p>
              <div className="flex items-center justify-between py-space-sm border-b border-outline-variant">
                <div>
                  <p className="font-body-main text-body-main font-medium text-on-surface">
                    Debug Mode
                  </p>
                  <p className="font-label-caps text-label-caps text-on-surface-variant">
                    Enable verbose logging for engine troubleshooting.
                  </p>
                </div>
                <Toggle checked={false} />
              </div>
              <div className="flex items-center justify-between py-space-sm border-b border-outline-variant">
                <div>
                  <p className="font-body-main text-body-main font-medium text-on-surface">
                    Experimental Features
                  </p>
                  <p className="font-label-caps text-label-caps text-on-surface-variant">
                    Access preview features and alpha plugins.
                  </p>
                </div>
                <Toggle checked={true} />
              </div>
            </div>

            <div className="space-y-space-sm">
              <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                Resource Allocation
              </p>
              <FormField label="Maximum CPU Usage (%)">
                <input className={inputClass} type="text" value="80" readOnly />
                <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden mt-space-xs">
                  <div className="bg-primary h-full rounded-full w-[80%]"></div>
                </div>
              </FormField>
              <FormField label="Memory Limit (GB)">
                <input className={inputClass} type="text" value="4" readOnly />
              </FormField>
            </div>

            <div className="space-y-space-sm">
              <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                Daemon JSON
              </p>
              <div className="bg-surface-container border border-outline-variant rounded-md p-space-sm font-code text-code text-on-surface-variant overflow-x-auto">
                <pre>{`{
  "exec-opts": ["native.cgroupdriver=systemd"],
  "log-driver": "json-file",
  "log-opts": {
      "max-size": "100m"
  },
  "storage-driver": "overlay2"
}`}</pre>
              </div>
            </div>

            <div className="flex justify-end gap-space-sm">
              <button className="h-9 px-space-md rounded-md border border-outline-variant text-on-surface text-[13px] font-medium hover:bg-surface-container transition-colors">
                Discard
              </button>
              <Button>Apply Changes</Button>
            </div>
          </div>
        </Card>

        {/* <!-- System Logs --> */}
        <Card className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-space-md pb-space-sm border-b border-outline-variant">
            <div className="flex items-center gap-space-sm">
              <Terminal size={17} className="text-primary" />
              <h2 className="font-h2 text-h2 text-on-surface">Real-time Log Stream</h2>
            </div>
            <div className="flex items-center gap-space-xs">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#5fd696] animate-pulse"></span>
              <p className="font-label-caps text-label-caps text-on-surface-variant">
                Streaming Live
              </p>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto font-code text-code space-y-space-xs pr-space-xs">
            {MOCK_LOGS.map((line, i) => (
              <div
                className={`flex gap-space-sm ${
                  i === MOCK_LOGS.length - 1
                    ? "border-l-2 border-primary pl-space-xs py-space-xs bg-surface-container"
                    : ""
                }`}
                key={i}
              >
                <span className="text-on-surface-variant opacity-60 shrink-0">{line.ts}</span>
                <span className={`shrink-0 ${LOG_LEVEL_COLOR[line.level]}`}>[{line.level}]</span>
                <span className={line.level === "ERROR" ? "text-error" : "text-on-surface"}>
                  {line.msg}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-space-md pt-space-sm border-t border-outline-variant flex items-center justify-between">
            <div className="flex items-center gap-space-md">
              <button className="flex items-center gap-space-xs text-on-surface-variant hover:text-on-surface transition-colors">
                <Download size={15} />
                <span className="font-label-caps text-label-caps">Download Bundle</span>
              </button>
              <button className="flex items-center gap-space-xs text-on-surface-variant hover:text-on-surface transition-colors">
                <Trash2 size={15} />
                <span className="font-label-caps text-label-caps">Clear Screen</span>
              </button>
            </div>
            <div className="flex items-center gap-space-xs bg-surface-container px-space-sm py-1 rounded-md border border-outline-variant">
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                Lines: {MOCK_LOGS.length}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function Settings() {
  return (
    <div className="max-w-container-max mx-auto space-y-3">
      <div>
        <h1 className="font-h1 text-h1 text-on-surface mb-space-xs">Settings</h1>
        <p className="font-body-main text-body-main text-on-surface-variant">
          Manage your server configuration.
        </p>
      </div>

      <ServerSetupSection />
      {/* <EngineSection /> */}
      <DangerZoneSection />
    </div>
  );
}
