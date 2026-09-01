import { X } from "lucide-react";

export default function Modal({ open, onClose, title, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-space-md">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-outline-variant rounded-lg p-space-md w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-space-md pb-space-sm border-b border-outline-variant">
          <h2 className="font-h2 text-h2 text-on-surface">{title}</h2>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
