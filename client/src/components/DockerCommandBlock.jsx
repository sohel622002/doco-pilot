import { useState } from "react";
import { Copy, Check } from "lucide-react";

const TABS = [
  { key: "bash", label: "bash / zsh" },
  { key: "powershell", label: "PowerShell" },
  { key: "cmd", label: "cmd.exe" },
];

export default function DockerCommandBlock({ commands }) {
  const [tab, setTab] = useState("bash");
  const [copied, setCopied] = useState(false);

  if (!commands) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(commands[tab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <div className="flex gap-1 mb-space-xs">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-1 rounded-md text-[13px] font-medium transition-colors ${
              tab === key
                ? "bg-surface-container-high text-on-surface"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="relative">
        <div className="p-space-md pr-14 font-code text-code text-on-surface-variant overflow-x-auto rounded-md bg-surface-container border border-outline-variant">
          <pre>{commands[tab]}</pre>
        </div>
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
        >
          {copied ? <Check size={16} className="text-[#5fd696]" /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  );
}
