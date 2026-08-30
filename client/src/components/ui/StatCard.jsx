import Card from "./Card";

export default function StatCard({ label, icon, value, unit, footer, progress }) {
  return (
    <Card className="flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-space-sm">
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
            {label}
          </span>
          {icon && (
            <span className="material-symbols-outlined">{icon}</span>
          )}
        </div>
        <div className="flex items-baseline gap-space-xs mb-space-xs">
          <span className="text-3xl text-stat">{value}</span>
          {unit && (
            <span className="font-body-main text-body-main text-on-surface-variant">
              {unit}
            </span>
          )}
        </div>
      </div>
      {typeof progress === "number" ? (
        <div className="w-full bg-secondary-container h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-primary h-full rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : (
        footer
      )}
    </Card>
  );
}
