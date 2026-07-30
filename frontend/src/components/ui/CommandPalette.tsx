import React, { useState, useEffect, useRef } from 'react';
import { Search, Command, Laptop, Users, Building2, Calendar, Wrench, ClipboardCheck, FileBarChart, Bell, ArrowRight } from 'lucide-react';

interface SearchResultItem {
  id: string;
  category: 'Assets' | 'Employees' | 'Departments' | 'Categories' | 'Bookings' | 'Maintenance' | 'Audit' | 'Reports' | 'Navigation';
  title: string;
  subtitle?: string;
  icon: any;
  action: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onNavigateTab,
  userRole = 'ADMIN'
}: {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tabId: string) => void;
  userRole?: string;
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Command palette options filtered by user role
  const commands: SearchResultItem[] = [
    { id: 'cmd_dash', category: 'Navigation', title: 'Go to Dashboard', subtitle: 'View main metrics and stats', icon: Search, action: () => { onNavigateTab('dashboard'); onClose(); } },
    { id: 'cmd_assets', category: 'Navigation', title: 'Asset Registry', subtitle: 'View and manage all registered assets', icon: Laptop, action: () => { onNavigateTab('assets'); onClose(); } },
    { id: 'cmd_booking', category: 'Navigation', title: 'Resource Bookings', subtitle: 'Reserve laptops, rooms, and tools', icon: Calendar, action: () => { onNavigateTab('booking'); onClose(); } },
    { id: 'cmd_maint', category: 'Navigation', title: 'Maintenance Tickets', subtitle: 'Track asset service & repair logs', icon: Wrench, action: () => { onNavigateTab('maintenance'); onClose(); } },
    { id: 'cmd_notif', category: 'Navigation', title: 'Notifications', subtitle: 'View system alerts & messages', icon: Bell, action: () => { onNavigateTab('notifications'); onClose(); } },
  ];

  if (userRole === 'ADMIN' || userRole === 'ADMINISTRATOR') {
    commands.push(
      { id: 'cmd_org', category: 'Navigation', title: 'Organization Setup', subtitle: 'Manage company, departments & employees', icon: Building2, action: () => { onNavigateTab('org_setup'); onClose(); } },
      { id: 'cmd_alloc', category: 'Navigation', title: 'Asset Allocations', subtitle: 'Assign and transfer asset custody', icon: Users, action: () => { onNavigateTab('allocation'); onClose(); } },
      { id: 'cmd_audit', category: 'Navigation', title: 'Asset Audits', subtitle: 'Conduct physical inventory checks', icon: ClipboardCheck, action: () => { onNavigateTab('audit'); onClose(); } },
      { id: 'cmd_reports', category: 'Navigation', title: 'Reports & Analytics', subtitle: 'Generate PDF, Excel & CSV reports', icon: FileBarChart, action: () => { onNavigateTab('reports'); onClose(); } }
    );
  }

  const filteredCommands = commands.filter(cmd => 
    cmd.title.toLowerCase().includes(query.toLowerCase()) || 
    (cmd.subtitle && cmd.subtitle.toLowerCase().includes(query.toLowerCase()))
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(filteredCommands.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % Math.max(filteredCommands.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-zinc-900/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-xl bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-4 border-b border-surface-200 dark:border-zinc-800">
          <Command className="w-5 h-5 text-brand-900 dark:text-brand-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search (e.g. Assets, Register, Maintenance)..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            className="w-full py-4 text-sm font-semibold bg-transparent border-none outline-none text-surface-900 dark:text-white placeholder:text-surface-400 dark:placeholder:text-zinc-500"
          />
          <span className="text-[10px] font-mono font-bold bg-surface-100 dark:bg-zinc-800 text-surface-500 dark:text-zinc-400 px-2 py-1 rounded border border-surface-200 dark:border-zinc-700">
            ESC
          </span>
        </div>

        <div className="max-h-80 overflow-y-auto py-2 px-2">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-xs font-semibold text-surface-400 dark:text-zinc-500">
              No matching commands found for "{query}"
            </div>
          ) : (
            filteredCommands.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-xs transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-brand-900 text-white shadow-sm' 
                      : 'hover:bg-surface-100 dark:hover:bg-zinc-800 text-surface-800 dark:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-surface-400 dark:text-zinc-400'}`} />
                    <div className="truncate">
                      <div className="font-bold truncate">{item.title}</div>
                      {item.subtitle && <div className={`text-[10px] truncate ${isSelected ? 'text-brand-200' : 'text-surface-450 dark:text-zinc-500'}`}>{item.subtitle}</div>}
                    </div>
                  </div>
                  <ArrowRight className={`w-3.5 h-3.5 shrink-0 ml-2 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 bg-surface-50 dark:bg-zinc-950 border-t border-surface-200 dark:border-zinc-800 flex justify-between items-center text-[10px] text-surface-400 dark:text-zinc-500 font-mono">
          <span>Use ↑ ↓ to navigate, ENTER to select</span>
          <span>AssetFlow Command Palette</span>
        </div>
      </div>
    </div>
  );
}
