import React from "react";
import { Inbox, Laptop, Users, Calendar, Wrench, ClipboardCheck, FileBarChart, Bell } from "lucide-react";

export interface EmptyStateProps {
  type?: 'assets' | 'maintenance' | 'employees' | 'bookings' | 'audit' | 'reports' | 'notifications' | 'generic';
  title?: string;
  subtitle?: string;
  message?: string;
  buttonText?: string;
  onAction?: () => void;
  icon?: React.ComponentType<{ className?: string }> | string;
  className?: string;
}

const PRESETS: Record<string, { title: string; subtitle: string; buttonText?: string; icon: any }> = {
  assets: {
    title: "No assets registered yet.",
    subtitle: "Register your first asset to begin tracking organizational resources.",
    buttonText: "➕ Register Asset",
    icon: Laptop
  },
  maintenance: {
    title: "No maintenance requests.",
    subtitle: "Maintenance tickets submitted by employees will appear here.",
    buttonText: "➕ Submit Maintenance Request",
    icon: Wrench
  },
  employees: {
    title: "No employees found.",
    subtitle: "Create your first employee from Organization Setup.",
    buttonText: "➕ Add Employee",
    icon: Users
  },
  reports: {
    title: "No reports generated.",
    subtitle: "Generate reports to analyze organizational assets.",
    buttonText: "Generate Asset Report",
    icon: FileBarChart
  },
  bookings: {
    title: "No resource bookings.",
    subtitle: "Reserve laptops, rooms, and lab equipment for your upcoming work.",
    buttonText: "➕ Reserve Resource",
    icon: Calendar
  },
  audit: {
    title: "No active audit cycles.",
    subtitle: "Launch a physical inventory audit cycle to verify asset presence.",
    buttonText: "➕ Start Audit Cycle",
    icon: ClipboardCheck
  },
  notifications: {
    title: "No notifications.",
    subtitle: "You're all caught up! System alerts and logs will appear here.",
    icon: Bell
  },
  generic: {
    title: "No records found.",
    subtitle: "There are no records matching your current filter criteria.",
    icon: Inbox
  }
};

export default function EmptyState({
  type = 'generic',
  title,
  subtitle,
  message,
  buttonText,
  onAction,
  icon,
  className = "",
}: EmptyStateProps) {
  const preset = PRESETS[type] || PRESETS.generic;
  const displayTitle = title || preset.title;
  const displaySubtitle = subtitle || message || preset.subtitle;
  const displayButtonText = buttonText || (onAction ? preset.buttonText : undefined);
  const IconComponent = icon ? (typeof icon === "string" ? Inbox : icon) : preset.icon;

  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-zinc-800/80 border border-brand-100 dark:border-zinc-700 flex items-center justify-center mb-4 text-brand-900 dark:text-brand-400 shadow-sm">
        <IconComponent className="w-8 h-8" />
      </div>
      <h3 className="text-base font-extrabold text-surface-900 dark:text-white mb-1">{displayTitle}</h3>
      <p className="text-xs font-semibold text-surface-500 dark:text-zinc-400 max-w-sm leading-relaxed mb-5">{displaySubtitle}</p>
      {displayButtonText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="px-5 py-2.5 rounded-xl bg-brand-900 hover:bg-brand-800 text-white text-xs font-bold shadow-md shadow-brand-900/20 transition-all cursor-pointer flex items-center space-x-1.5"
        >
          <span>{displayButtonText}</span>
        </button>
      )}
    </div>
  );
}
