import Card from "./Card";

const PROGRESS_TONE = {
  normal: "bg-primary",
  warning: "bg-[#e8b458]",
  critical: "bg-[#ef5f66]",
};

export default function StatCard({
  label,
  icon: Icon,
  value,
  unit,
  footer,
  progress,
  progressTone = "normal",
}) {
  return (
    <Card className="flex flex-col justify-between gap-space-lg">
      <div className="flex justify-between items-start">
        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
          {label}
        </span>
        {Icon && (
          <div className="h-7 w-7 rounded-md bg-surface-container-high flex items-center justify-center">
            <Icon size={14} className="text-on-surface-variant" />
          </div>
        )}
      </div>
      <div>
        <div className="flex items-baseline gap-space-xs mb-space-sm">
          <span className="text-stat text-on-surface">{value}</span>
          {unit && (
            <span className="font-body-main text-body-main text-on-surface-variant">
              {unit}
            </span>
          )}
        </div>
        {typeof progress === "number" ? (
          <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-[width] ${PROGRESS_TONE[progressTone]}`}
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        ) : (
          footer
        )}
      </div>
    </Card>
  );
}
