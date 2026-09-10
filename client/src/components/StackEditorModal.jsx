import { useState } from "react";
import { X, Save } from "lucide-react";
import api from "../lib/axios";
import { Button } from "./ui";

const DEFAULT_COMPOSE = `services:
  app:
    image: nginx:latest
    ports:
      - "8080:80"
`;

// The modal fully unmounts when closed (see the `if (!open) return null`
// below), so lazy-initializing state from props here is enough to reset
// the form on every open — no effect/sync needed.
export default function StackEditorModal({ open, stack, serverId, onSaved, onClose }) {
  const [name, setName] = useState(() => stack?.name ?? "");
  const [composeYaml, setComposeYaml] = useState(() => stack?.compose_yaml ?? DEFAULT_COMPOSE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEdit = !!stack;

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      let saved;
      if (isEdit) {
        saved = (
          await api.patch(`/api/servers/${serverId}/stacks/${stack.id}`, { composeYaml })
        ).data.stack;
      } else {
        saved = (
          await api.post(`/api/servers/${serverId}/stacks`, { name: name.trim(), composeYaml })
        ).data.stack;
      }
      onSaved(saved);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save stack");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-space-md">
      <div className="w-full max-w-2xl max-h-[85vh] bg-card border border-outline-variant rounded-lg flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-space-md py-space-sm border-b border-outline-variant">
          <h3 className="font-h2 text-h2 text-on-surface">
            {isEdit ? `Edit Stack — ${stack.name}` : "New Stack"}
          </h3>
          <button
            className="p-1.5 hover:bg-surface-container-high rounded-md text-on-surface-variant transition-colors"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-space-md flex flex-col gap-space-md">
          <div>
            <label className="block text-[12px] font-label-caps text-on-surface-variant uppercase tracking-wider mb-space-xs">
              Stack name
            </label>
            <input
              className="w-full h-9 px-space-sm bg-surface-container border border-outline-variant rounded-md font-code text-code text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-outline disabled:opacity-60"
              placeholder="e.g. my-app"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isEdit}
              pattern="[a-z0-9][a-z0-9_-]{0,62}"
              title="Lowercase letters, digits, - and _ only"
              required
            />
          </div>
          <div>
            <label className="block text-[12px] font-label-caps text-on-surface-variant uppercase tracking-wider mb-space-xs">
              docker-compose.yml
            </label>
            <textarea
              className="w-full h-72 px-space-sm py-space-xs bg-surface-container border border-outline-variant rounded-md font-code text-code text-on-surface focus:outline-none focus:border-outline resize-y"
              value={composeYaml}
              onChange={(e) => setComposeYaml(e.target.value)}
              spellCheck={false}
              required
            />
          </div>
          {error && <p className="text-error text-[13px]">{error}</p>}
          <Button type="submit" disabled={saving}>
            <Save size={16} />
            {saving ? "Saving…" : "Save Stack"}
          </Button>
        </form>
      </div>
    </div>
  );
}
