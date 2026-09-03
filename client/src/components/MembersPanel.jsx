import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, UserPlus, Trash2 } from "lucide-react";
import api from "../lib/axios";
import { isOwner } from "../lib/roles";
import { Button } from "./ui";

const ROLE_OPTIONS = ["viewer", "operator", "owner"];

export default function MembersPanel({ role }) {
  const { serverId } = useParams();
  const queryClient = useQueryClient();
  const owner = isOwner(role);

  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["members", serverId],
    queryFn: async () => (await api.get(`/api/servers/${serverId}/members`)).data,
    enabled: !!serverId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["members", serverId] });

  const handleInvite = async (e) => {
    e.preventDefault();
    setError("");
    setInviting(true);
    try {
      await api.post(`/api/servers/${serverId}/members`, { email: email.trim(), role: inviteRole });
      setEmail("");
      invalidate();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add member");
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.patch(`/api/servers/${serverId}/members/${userId}`, { role: newRole });
      invalidate();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update role");
    }
  };

  const handleRemove = async (userId, label) => {
    if (!window.confirm(`Remove ${label} from this server?`)) return;
    try {
      await api.delete(`/api/servers/${serverId}/members/${userId}`);
      invalidate();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to remove member");
    }
  };

  const members = data?.members ?? [];

  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex items-center gap-space-sm">
        <Users size={16} className="text-on-surface-variant" />
        <h3 className="font-h2 text-h2 text-on-surface">Team</h3>
      </div>

      {isLoading ? (
        <p className="text-on-surface-variant text-body-main">Loading members…</p>
      ) : (
        <div className="flex flex-col gap-space-xs">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center justify-between gap-space-sm py-1.5">
              <div className="min-w-0">
                <p className="text-body-main text-on-surface truncate">{m.name ?? m.email}</p>
                <p className="text-[12px] text-on-surface-variant truncate">{m.email}</p>
              </div>
              {owner ? (
                <div className="flex items-center gap-space-xs shrink-0">
                  <select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                    className="h-8 px-space-xs bg-surface-container border border-outline-variant rounded-md text-[12px] text-on-surface"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <button
                    title="Remove"
                    className="p-1.5 rounded-md text-on-surface-variant hover:text-error hover:bg-error-container transition-colors"
                    onClick={() => handleRemove(m.userId, m.name ?? m.email)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ) : (
                <span className="text-[12px] font-label-caps text-on-surface-variant uppercase tracking-wider shrink-0">
                  {m.role}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {owner && (
        <form onSubmit={handleInvite} className="flex items-center gap-space-sm pt-space-sm border-t border-outline-variant">
          <input
            type="email"
            className="flex-1 h-9 px-space-sm bg-surface-container border border-outline-variant rounded-md text-[13px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-outline"
            placeholder="teammate@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="h-9 px-space-sm bg-surface-container border border-outline-variant rounded-md text-[13px] text-on-surface"
          >
            <option value="viewer">viewer</option>
            <option value="operator">operator</option>
          </select>
          <Button type="submit" disabled={inviting}>
            <UserPlus size={15} />
            {inviting ? "Adding…" : "Add"}
          </Button>
        </form>
      )}
      {error && <p className="text-error text-[13px]">{error}</p>}
      {!owner && (
        <p className="text-[12px] text-on-surface-variant">
          Only the owner can invite or remove members.
        </p>
      )}
    </div>
  );
}
