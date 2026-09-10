import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Server, Users, Database, Check } from "lucide-react";
import api from "../lib/axios";
import { Card, Badge, Button, StatCard } from "../components/ui";

function useBilling() {
  return useQuery({
    queryKey: ["billing"],
    queryFn: async () => (await api.get("/api/billing")).data,
    staleTime: 1000 * 60,
  });
}

const FREE_FEATURES = [
  "Up to 2 servers",
  "Solo use (no team sharing)",
  "7 days of metrics, events & audit history",
];

const PRO_FEATURES = [
  "Unlimited servers",
  "Unlimited team members with RBAC",
  "30 days of metrics, events & audit history",
];

function PlanCard({ name, price, features, current, onUpgrade, upgrading }) {
  return (
    <Card className={`flex flex-col gap-space-md ${current ? "border-primary" : ""}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-h2 text-h2 text-on-surface">{name}</h3>
        {current && <Badge tone="primary">Current plan</Badge>}
      </div>
      <div className="flex items-baseline gap-space-xs">
        <span className="text-stat text-on-surface">{price}</span>
        {price !== "Free" && (
          <span className="font-body-main text-body-main text-on-surface-variant">/mo</span>
        )}
      </div>
      <ul className="flex flex-col gap-space-sm">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-space-sm text-body-main text-on-surface">
            <Check size={15} className="text-primary shrink-0" />
            {f}
          </li>
        ))}
      </ul>
      {!current && onUpgrade && (
        <Button onClick={onUpgrade} disabled={upgrading} className="mt-space-sm">
          {upgrading ? "Redirecting…" : "Upgrade to Pro"}
        </Button>
      )}
    </Card>
  );
}

export default function Billing() {
  const { data, isLoading } = useBilling();
  const [upgrading, setUpgrading] = useState(false);
  const [notice, setNotice] = useState("");

  const handleUpgrade = async () => {
    setNotice("");
    setUpgrading(true);
    try {
      await api.post("/api/billing/checkout");
    } catch (err) {
      setNotice(
        err.response?.data?.error ||
          "Checkout isn't live yet — check back soon.",
      );
    } finally {
      setUpgrading(false);
    }
  };

  if (isLoading) {
    return <p className="text-on-surface-variant font-body-main">Loading…</p>;
  }

  const plan = data?.plan ?? "free";
  const limits = data?.limits ?? {};
  const usage = data?.usage ?? {};
  const serversMax = limits.maxServers;
  const serversUsed = usage.servers ?? 0;
  const serversProgress = serversMax ? Math.round((serversUsed / serversMax) * 100) : 0;

  return (
    <div className="max-w-container-max mx-auto space-y-3">
      <div>
        <h1 className="font-h1 text-h1 text-on-surface mb-space-xs">Billing &amp; Plan</h1>
        <p className="font-body-main text-body-main text-on-surface-variant">
          Manage your plan and see how much of it you're using.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard
          label="Servers"
          icon={Server}
          value={serversUsed}
          unit={serversMax ? `/ ${serversMax}` : "/ unlimited"}
          progress={serversMax ? serversProgress : undefined}
          progressTone={serversProgress >= 100 ? "critical" : serversProgress >= 75 ? "warning" : "normal"}
          footer={!serversMax && <span className="text-body-main text-on-surface-variant">Unlimited</span>}
        />
        <StatCard
          label="Team members per server"
          icon={Users}
          value={limits.maxMembersPerServer ?? "Unlimited"}
          unit=""
        />
        <StatCard
          label="History retention"
          icon={Database}
          value={limits.retentionDays}
          unit="days"
        />
      </div>

      {notice && (
        <div className="p-space-md bg-surface-container border border-outline-variant rounded-lg text-body-main text-on-surface-variant">
          {notice}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <PlanCard name="Free" price="Free" features={FREE_FEATURES} current={plan === "free"} />
        <PlanCard
          name="Pro"
          price="$5"
          features={PRO_FEATURES}
          current={plan === "pro"}
          onUpgrade={plan !== "pro" ? handleUpgrade : undefined}
          upgrading={upgrading}
        />
      </div>
    </div>
  );
}
