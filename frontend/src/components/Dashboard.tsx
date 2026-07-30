import { useState, useEffect, useCallback } from "react";
import { 
  LayoutDashboard, Building2, Laptop, Calendar, 
  Wrench, Bell, LogOut, Plus, Sparkles, Menu, X, Command, Search
} from "lucide-react";
import Logo from "./ui/Logo";
import EmptyState from "./ui/EmptyState";
import ErrorState from "./ui/ErrorState";
import { SkeletonCard, SkeletonTable, SkeletonActivityList } from "./ui/SkeletonLoader";
import * as api from "../lib/api";
import { CommandPalette } from "./ui/CommandPalette";


// â”€â”€â”€ Interfaces (kept identical for visual compatibility) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface Activity {
  id: string;
  text: string;
  timestamp: string;
  action?: string;
  details?: string;
  createdAt?: string;
  user?: { name: string };
}



// ─── Status Display Helpers ──────────────────────────────────────────────────

const statusDisplay: Record<string, string> = {
  AVAILABLE: "Available",
  ALLOCATED: "Allocated",
  MAINTENANCE: "Maintenance",
  LOST: "Lost",
  DISPOSED: "Disposed",
  RETIRED: "Retired",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  PENDING: "Pending",
  APPROVED: "Approved",
  TECHNICIAN_ASSIGNED: "Technician assigned",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  VERIFIED: "Verified",
  MISSING: "Missing",
  DAMAGED: "Damaged",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
};

function displayStatus(s: string) {
  return statusDisplay[s] || s;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function Dashboard({ 
  username, 
  onLogout,
  themeMode,
  setThemeMode
}: { 
  username: string | null; 
  onLogout: () => void; 
  themeMode: "light" | "dark";
  setThemeMode: (mode: "light" | "dark") => void;
}) {
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // ─── Data State ────────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState<string[]>([]);


  // ─── Loading & Error State ────────────────────────────────────────────────
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const setLoadingFor = (key: string, v: boolean) => setLoading(prev => ({ ...prev, [key]: v }));
  const setErrorFor = (key: string, v: string | null) => setErrors(prev => ({ ...prev, [key]: v }));

  // Modal / Form States
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showAssetReqModal, setShowAssetReqModal] = useState(false);

  // Form Fields
  const [bookingResourceName, setBookingResourceName] = useState("");
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split("T")[0]);
  const [bookingStartTime, setBookingStartTime] = useState("09:00");
  const [bookingEndTime, setBookingEndTime] = useState("10:00");
  const [requestTitle, setRequestTitle] = useState("");
  const [requestAssetId, setRequestAssetId] = useState("");

  // Asset Request fields
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [assetReqAssetId, setAssetReqAssetId] = useState("");
  const [assetReqReason, setAssetReqReason] = useState("");
  const [myAssetRequests, setMyAssetRequests] = useState<any[]>([]);

  const loadNotificationBanner = useCallback(async () => {
    try {
      const res = await api.fetchUnreadCount();
      const count = res?.count ?? 0;
      setNotifications(count > 0 ? [`${count} unread notifications`] : []);
    } catch { /* silent */ }
  }, []);

  // ─── Employee-scoped data states ──────────────────────────────────────────
  const [myAssets, setMyAssets] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [empNotifications, setEmpNotifications] = useState<any[]>([]);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [empStats, setEmpStats] = useState<any>(null);
  const [empActivity, setEmpActivity] = useState<Activity[]>([]);

  const handleOpenAssetReqModal = async () => {
    try {
      const res = await api.fetchAvailableAssets();
      const items = Array.isArray(res) ? res : res.data || [];
      setAvailableAssets(items);
      setShowAssetReqModal(true);
    } catch (e: any) {
      alert(e.message || "Failed to load available assets");
    }
  };

  const handleAssetRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetReqAssetId) {
      alert("Please select an available asset");
      return;
    }
    try {
      await api.submitAssetRequest({ assetId: assetReqAssetId, reason: assetReqReason });
      alert("Asset request submitted to Admin!");
      setShowAssetReqModal(false);
      setAssetReqAssetId("");
      setAssetReqReason("");
      loadMyAssets();
    } catch (e: any) {
      alert(e.message || "Failed to submit asset request");
    }
  };

  // ─── Employee-scoped data loaders ──────────────────────────────────────────
  const loadEmpDashboard = useCallback(async () => {
    setLoadingFor("dashboard", true);
    setErrorFor("dashboard", null);
    try {
      const [statsData, activityData] = await Promise.all([
        api.fetchEmployeeDashboardStats(),
        api.fetchEmployeeActivity(10),
      ]);
      setEmpStats(statsData);
      const mapped = (Array.isArray(activityData) ? activityData : activityData?.data || []).map((a: any) => ({
        id: a.id,
        text: a.details || a.action || "",
        timestamp: timeAgo(a.createdAt),
      }));
      setEmpActivity(mapped);
    } catch (err: any) {
      setErrorFor("dashboard", err.message);
    } finally {
      setLoadingFor("dashboard", false);
    }
  }, []);

  const loadMyAssets = useCallback(async () => {
    setLoadingFor("my_assets", true);
    setErrorFor("my_assets", null);
    try {
      const [assetsRes, requestsRes] = await Promise.all([
        api.fetchMyAssets(),
        api.fetchMyAssetRequests(),
      ]);
      setMyAssets(Array.isArray(assetsRes) ? assetsRes : assetsRes?.data || []);
      setMyAssetRequests(Array.isArray(requestsRes) ? requestsRes : requestsRes?.data || []);
    } catch (err: any) { setErrorFor("my_assets", err.message); }
    finally { setLoadingFor("my_assets", false); }
  }, []);

  const loadMyBookings = useCallback(async () => {
    setLoadingFor("my_bookings", true);
    setErrorFor("my_bookings", null);
    try {
      const res = await api.fetchMyBookings();
      setMyBookings(Array.isArray(res) ? res : res?.data || []);
    } catch (err: any) { setErrorFor("my_bookings", err.message); }
    finally { setLoadingFor("my_bookings", false); }
  }, []);

  const loadMyTickets = useCallback(async () => {
    setLoadingFor("maintenance", true);
    setErrorFor("maintenance", null);
    try {
      const res = await api.fetchMyMaintenanceTickets();
      setMyTickets(Array.isArray(res) ? res : res?.data || []);
    } catch (err: any) { setErrorFor("maintenance", err.message); }
    finally { setLoadingFor("maintenance", false); }
  }, []);

  const loadEmpNotifications = useCallback(async () => {
    setLoadingFor("notifications", true);
    setErrorFor("notifications", null);
    try {
      const res = await api.fetchNotifications();
      setEmpNotifications(Array.isArray(res) ? res : res?.data || []);
    } catch (err: any) { setErrorFor("notifications", err.message); }
    finally { setLoadingFor("notifications", false); }
  }, []);

  const loadMyProfile = useCallback(async () => {
    setLoadingFor("profile", true);
    setErrorFor("profile", null);
    try {
      const res = await api.fetchMyProfile();
      setMyProfile(res);
    } catch (err: any) { setErrorFor("profile", err.message); }
    finally { setLoadingFor("profile", false); }
  }, []);

  // ─── Initial Load ─────────────────────────────────────────────────────────

  useEffect(() => {
    loadEmpDashboard();
    loadNotificationBanner();
  }, []);


  // Load data when tabs switch
  useEffect(() => {
    if (activeTab === "my_assets") loadMyAssets();
    if (activeTab === "my_bookings") loadMyBookings();
    if (activeTab === "maintenance") loadMyTickets();
    if (activeTab === "notifications") loadEmpNotifications();
    if (activeTab === "profile") loadMyProfile();
  }, [activeTab]);

  const handleBookResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingResourceName) return;
    try {
      await api.createBooking({
        resourceName: bookingResourceName,
        resourceType: "room",
        date: bookingDate,
        startTime: bookingStartTime,
        endTime: bookingEndTime,
      });
      setShowBookingModal(false);
      await loadEmpDashboard();
    } catch { /* silent */ }
  };

  const handleRaiseRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestTitle || !requestAssetId) return;
    try {
      await api.createMaintenance({ assetId: requestAssetId, issue: requestTitle });
      setShowRequestModal(false);
      setRequestTitle("");
      setRequestAssetId("");
      await loadEmpDashboard();
    } catch { /* silent */ }
  };

  const sidebarLinks = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "my_assets", label: "My Assets", icon: Laptop },
    { id: "my_bookings", label: "My Bookings", icon: Calendar },
    { id: "maintenance", label: "Maintenance", icon: Wrench },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "profile", label: "My Profile", icon: Building2 },
  ];


  return (
    <div 
      className={`min-h-screen bg-surface-50 text-surface-900 flex flex-col font-sans select-none transition-colors duration-200 ${themeMode === "dark" ? "dark bg-zinc-950 text-zinc-100" : ""}`}
      style={{
        backgroundImage: themeMode === "light" 
          ? `linear-gradient(rgba(248, 249, 250, 0.94), rgba(248, 249, 250, 0.98)), url('/clean_space_chains_bg.png')`
          : `linear-gradient(rgba(9, 9, 11, 0.96), rgba(9, 9, 11, 0.98)), url('/clean_space_chains_bg.png')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-surface-200 dark:border-zinc-800 px-4 sm:px-6 flex items-center justify-between bg-white/80 dark:bg-zinc-900/85 backdrop-blur-md sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 border border-surface-200 dark:border-zinc-800 rounded-lg text-surface-600 dark:text-zinc-300 hover:bg-surface-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="w-8 h-8 rounded bg-brand-900 flex items-center justify-center p-1 shrink-0">
            <Logo className="w-full h-full text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-surface-900 dark:text-white font-sans">
            Asset<span className="text-brand-900">Flow</span>
          </span>
          <button
            onClick={() => setShowCommandPalette(true)}
            className="flex items-center gap-2 bg-surface-50 dark:bg-zinc-950 border border-surface-200 dark:border-zinc-800 rounded-lg h-9 px-3 text-xs font-semibold text-surface-500 dark:text-zinc-400 hover:border-brand-900 transition cursor-pointer ml-2"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Search...</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 bg-surface-200 dark:bg-zinc-800 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-surface-300 dark:border-zinc-700">
              <Command className="w-2.5 h-2.5" /> K
            </kbd>
          </button>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => setThemeMode(themeMode === "light" ? "dark" : "light")}
            className="p-2 border border-surface-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 text-surface-600 dark:text-zinc-300 hover:bg-surface-50 dark:hover:bg-zinc-800 transition cursor-pointer"
            title="Toggle Theme"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <span className="text-xs sm:text-sm text-surface-600 dark:text-zinc-400 font-medium hidden sm:inline">
            Agent Callsign: <span className="text-brand-900 dark:text-brand-500 font-bold">{username || "Guest"}</span>
          </span>

          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-900 hover:bg-brand-800 text-xs font-bold text-white transition-all cursor-pointer shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex-grow flex relative">
        {/* Desktop Collapsible Auto-Hide Sidebar Navigation */}
        <aside 
          onMouseEnter={() => setIsSidebarHovered(true)}
          onMouseLeave={() => setIsSidebarHovered(false)}
          className={`hidden md:flex border-r border-surface-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md py-6 flex-col justify-between shrink-0 transition-all duration-300 ease-in-out ${
            isSidebarHovered ? "w-64" : "w-16"
          }`}
        >
          <nav className="space-y-1 px-2.5">
            {sidebarLinks.map(link => {
              const Icon = link.icon;
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => setActiveTab(link.id)}
                  title={link.label}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer overflow-hidden ${
                    isActive 
                      ? "bg-brand-900 text-white shadow-md shadow-brand-900/20" 
                      : "text-surface-650 dark:text-zinc-400 hover:bg-surface-100 dark:hover:bg-zinc-800 hover:text-surface-900 dark:hover:text-white"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-surface-400 dark:text-zinc-550"}`} />
                  <span className={`whitespace-nowrap transition-opacity duration-200 ${isSidebarHovered ? "opacity-100" : "opacity-0 w-0 hidden"}`}>
                    {link.label}
                  </span>
                </button>
              );
            })}
          </nav>
          
          <div className={`px-4 py-3 border-t border-surface-200 dark:border-zinc-800 text-[10px] text-surface-400 dark:text-zinc-600 font-mono whitespace-nowrap overflow-hidden transition-opacity duration-200 ${
            isSidebarHovered ? "opacity-100" : "opacity-0 hidden"
          }`}>
            SECURE SYSTEM v2.4
          </div>
        </aside>

        {/* Mobile Drawer Overlay Sidebar */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <aside className="relative w-64 max-w-[80vw] bg-white dark:bg-zinc-900 border-r border-surface-200 dark:border-zinc-800 py-6 flex flex-col justify-between z-10 shadow-2xl">
              <div className="px-4 pb-4 border-b border-surface-200 dark:border-zinc-800 flex justify-between items-center">
                <span className="font-extrabold text-xs uppercase tracking-wider text-surface-900 dark:text-white">Portal Menu</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-surface-400 hover:text-surface-900 dark:hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="space-y-1 px-3 py-4 flex-grow overflow-y-auto">
                {sidebarLinks.map(link => {
                  const Icon = link.icon;
                  const isActive = activeTab === link.id;
                  return (
                    <button
                      key={link.id}
                      type="button"
                      onClick={() => { setActiveTab(link.id); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                        isActive 
                          ? "bg-brand-900 text-white shadow-md shadow-brand-900/20" 
                          : "text-surface-650 dark:text-zinc-400 hover:bg-surface-100 dark:hover:bg-zinc-800 hover:text-surface-900 dark:hover:text-white"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-surface-400 dark:text-zinc-550"}`} />
                      {link.label}
                    </button>
                  );
                })}
              </nav>
              <div className="px-6 py-4 border-t border-surface-200 dark:border-zinc-800 text-[10px] text-surface-400 dark:text-zinc-600 font-mono">
                SECURE SYSTEM v2.4
              </div>
            </aside>
          </div>
        )}

        {/* Content Pane */}
        <main className="flex-grow p-4 sm:p-6 lg:p-8 overflow-y-auto min-w-0">

          {/* ─── Tab 1: Employee Dashboard ──────────────────────────────────── */}
          {activeTab === "dashboard" && (
            <div className="max-w-6xl space-y-8 animate-float">
              <div className="flex justify-between items-center border-b border-surface-200 dark:border-zinc-800 pb-4">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-surface-900 dark:text-white font-sans uppercase">My Dashboard</h2>
                  <p className="text-sm text-surface-600 dark:text-zinc-400 mt-1 font-medium">Your personal asset overview and recent activity.</p>
                </div>
              </div>

              {/* Employee Stats Grid */}
              {loading.dashboard ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : errors.dashboard ? (
                <ErrorState message="Unable to load dashboard." onRetry={loadEmpDashboard} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-zinc-900 border border-surface-200/80 dark:border-zinc-800/80 hover:border-brand-900/30 rounded-xl p-5 shadow-sm hover:shadow transition-all flex flex-col justify-between h-28">
                    <span className="text-xs font-bold text-surface-500 dark:text-zinc-500 uppercase tracking-wider font-sans">My Assets</span>
                    <span className="text-3xl font-extrabold text-surface-900 dark:text-white tracking-tight">{empStats?.myAssetsCount ?? 0}</span>
                  </div>
                  <div className="bg-white dark:bg-zinc-900 border border-surface-200/80 dark:border-zinc-800/80 hover:border-brand-900/30 rounded-xl p-5 shadow-sm hover:shadow transition-all flex flex-col justify-between h-28">
                    <span className="text-xs font-bold text-surface-500 dark:text-zinc-500 uppercase tracking-wider font-sans">My Bookings</span>
                    <span className="text-3xl font-extrabold text-brand-900 tracking-tight">{empStats?.myBookingsCount ?? 0}</span>
                  </div>
                  <div className="bg-white dark:bg-zinc-900 border border-surface-200/80 dark:border-zinc-800/80 hover:border-brand-900/30 rounded-xl p-5 shadow-sm hover:shadow transition-all flex flex-col justify-between h-28">
                    <span className="text-xs font-bold text-surface-500 dark:text-zinc-500 uppercase tracking-wider font-sans">Open Tickets</span>
                    <span className="text-3xl font-extrabold text-surface-900 dark:text-white tracking-tight">{empStats?.myTicketsCount ?? 0}</span>
                  </div>
                  <div className="bg-white dark:bg-zinc-900 border border-surface-200/80 dark:border-zinc-800/80 hover:border-brand-900/30 rounded-xl p-5 shadow-sm hover:shadow transition-all flex flex-col justify-between h-28">
                    <span className="text-xs font-bold text-surface-500 dark:text-zinc-500 uppercase tracking-wider font-sans">Unread Notifications</span>
                    <span className="text-3xl font-extrabold text-surface-900 dark:text-white tracking-tight">{notifications.length > 0 ? notifications[0].split(" ")[0] : "0"}</span>
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl p-6 space-y-4 shadow-sm">
                <h3 className="text-lg font-bold text-surface-900 dark:text-white tracking-wide font-sans uppercase">Recent Activity</h3>
                {empActivity.length === 0 ? (
                  <p className="text-sm text-surface-500 dark:text-zinc-500 font-medium">No recent activity.</p>
                ) : (
                  <div className="space-y-3 font-semibold text-sm text-surface-700 dark:text-zinc-300">
                    {empActivity.map(a => (
                      <div key={a.id} className="flex justify-between items-center py-2.5 border-b border-surface-100 dark:border-zinc-800 last:border-b-0">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-brand-900 dark:bg-brand-500" />
                          <span>{a.text}</span>
                        </div>
                        <span className="text-xs text-surface-400 dark:text-zinc-500 font-mono font-normal shrink-0">{a.timestamp}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── Tab 2: My Assets & Requests ─────────────────────────────────── */}
          {activeTab === "my_assets" && (
            <div className="max-w-6xl space-y-8 animate-float">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-surface-900 dark:text-white font-sans uppercase">My Assets</h2>
                  <p className="text-sm text-surface-600 dark:text-zinc-400 mt-1 font-medium">Assets allocated to you and your pending asset requests.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleOpenAssetReqModal} className="px-4 py-2 rounded-lg text-xs font-bold bg-brand-900 hover:bg-brand-800 text-white cursor-pointer transition shadow flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Request Asset
                  </button>
                  <button onClick={loadMyAssets} className="px-4 py-2 rounded-lg text-xs font-bold bg-surface-200 dark:bg-zinc-800 hover:bg-surface-300 dark:hover:bg-zinc-700 text-surface-800 dark:text-zinc-200 cursor-pointer transition shadow flex items-center gap-2">
                    <Laptop className="w-4 h-4" /> Refresh
                  </button>
                </div>
              </div>

              {/* Section 1: Allocated Assets */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-surface-700 dark:text-zinc-300 uppercase tracking-wider">Allocated Assets</h3>
                {loading.my_assets ? (
                  <SkeletonTable rows={4} cols={5} />
                ) : errors.my_assets ? (
                  <ErrorState message={errors.my_assets} onRetry={loadMyAssets} />
                ) : myAssets.length === 0 ? (
                  <EmptyState icon="laptop" title="No Assets Assigned" subtitle="You don't have any assets allocated to you yet." />
                ) : (
                  <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-surface-200 dark:border-zinc-800 bg-surface-50 dark:bg-zinc-950 text-[10px] text-surface-500 dark:text-zinc-500 font-bold uppercase tracking-wider">
                            <th className="p-3 text-left">Tag</th>
                            <th className="p-3 text-left">Name</th>
                            <th className="p-3 text-left">Category</th>
                            <th className="p-3 text-left">Status</th>
                            <th className="p-3 text-left">Allocated Since</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-150 dark:divide-zinc-800 font-semibold text-surface-850 dark:text-zinc-200">
                          {myAssets.map((a: any) => (
                            <tr key={a.id} className="hover:bg-surface-50/50 dark:hover:bg-zinc-900/50">
                              <td className="p-3 font-mono text-brand-900 dark:text-brand-300 font-bold">{a.asset?.tag || a.tag || "--"}</td>
                              <td className="p-3">{a.asset?.name || a.name || "--"}</td>
                              <td className="p-3 text-surface-600 dark:text-zinc-400">{a.asset?.category?.name || a.category?.name || "--"}</td>
                              <td className="p-3">
                                <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                  Allocated
                                </span>
                              </td>
                              <td className="p-3 text-surface-500 dark:text-zinc-500 text-[10px] font-mono">{a.allocatedAt ? new Date(a.allocatedAt).toLocaleDateString() : "--"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: My Asset Requests */}
              {myAssetRequests.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-surface-200 dark:border-zinc-800">
                  <h3 className="text-xs font-bold text-surface-700 dark:text-zinc-300 uppercase tracking-wider">My Asset Requests</h3>
                  <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-surface-200 dark:border-zinc-800 bg-surface-50 dark:bg-zinc-950 text-[10px] text-surface-500 dark:text-zinc-500 font-bold uppercase tracking-wider">
                            <th className="p-3 text-left">Requested Asset</th>
                            <th className="p-3 text-left">Reason</th>
                            <th className="p-3 text-left">Status</th>
                            <th className="p-3 text-left">Requested Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-150 dark:divide-zinc-800 font-semibold text-surface-850 dark:text-zinc-200">
                          {myAssetRequests.map((r: any) => (
                            <tr key={r.id} className="hover:bg-surface-50/50 dark:hover:bg-zinc-900/50">
                              <td className="p-3 font-bold">
                                <span className="font-mono text-brand-900 dark:text-brand-300 mr-1">[{r.asset?.tag}]</span>
                                {r.asset?.name}
                              </td>
                              <td className="p-3 text-surface-600 dark:text-zinc-400">{r.reason || "Standard Issue"}</td>
                              <td className="p-3">
                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
                                  r.status === "PENDING" ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800" :
                                  r.status === "APPROVED" ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800" :
                                  "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
                                }`}>{r.status}</span>
                              </td>
                              <td className="p-3 text-surface-500 dark:text-zinc-500 text-[10px] font-mono">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "--"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* â”€â”€â”€ Tab 3: My Bookings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {activeTab === "my_bookings" && (
            <div className="max-w-6xl space-y-8 animate-float">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-surface-900 dark:text-white font-sans uppercase">My Bookings</h2>
                  <p className="text-sm text-surface-600 dark:text-zinc-400 mt-1 font-medium">Your resource reservations and upcoming bookings.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowBookingModal(true)} className="px-4 py-2 rounded-lg text-xs font-bold bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 text-surface-700 dark:text-zinc-300 hover:border-brand-900 cursor-pointer transition flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Book Resource
                  </button>
                  <button onClick={loadMyBookings} className="px-4 py-2 rounded-lg text-xs font-bold bg-brand-900 hover:bg-brand-800 text-white cursor-pointer transition shadow flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Refresh
                  </button>
                </div>
              </div>

              {loading.my_bookings ? (
                <SkeletonTable rows={4} cols={5} />
              ) : errors.my_bookings ? (
                <ErrorState message={errors.my_bookings} onRetry={loadMyBookings} />
              ) : myBookings.length === 0 ? (
                <EmptyState icon="calendar" title="No Bookings" subtitle="You haven't booked any resources yet." />
              ) : (
                <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-surface-200 dark:border-zinc-800 bg-surface-50 dark:bg-zinc-950 text-[10px] text-surface-500 dark:text-zinc-500 font-bold uppercase tracking-wider">
                          <th className="p-3 text-left">Resource</th>
                          <th className="p-3 text-left">Date</th>
                          <th className="p-3 text-left">Time</th>
                          <th className="p-3 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-150 dark:divide-zinc-800 font-semibold text-surface-850 dark:text-zinc-200">
                        {myBookings.map((b: any) => (
                          <tr key={b.id} className="hover:bg-surface-50/50 dark:hover:bg-zinc-900/50">
                            <td className="p-3 font-bold">{b.resourceName}</td>
                            <td className="p-3 text-surface-600 dark:text-zinc-400">{b.date ? new Date(b.date).toLocaleDateString() : "--"}</td>
                            <td className="p-3 font-mono text-[10px]">{b.startTime} - {b.endTime}</td>
                            <td className="p-3">
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
                                b.status === "CONFIRMED" ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800" :
                                "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                              }`}>{displayStatus(b.status)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* â”€â”€â”€ Tab 4: Maintenance Requests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {activeTab === "maintenance" && (
            <div className="max-w-6xl space-y-8 animate-float">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-surface-900 dark:text-white font-sans uppercase">Maintenance Requests</h2>
                  <p className="text-sm text-surface-600 dark:text-zinc-400 mt-1 font-medium">Raise maintenance tickets for your assets and track their progress.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowRequestModal(true)} className="px-4 py-2 rounded-lg text-xs font-bold bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 text-surface-700 dark:text-zinc-300 hover:border-brand-900 cursor-pointer transition flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Raise Ticket
                  </button>
                  <button onClick={loadMyTickets} className="px-4 py-2 rounded-lg text-xs font-bold bg-brand-900 hover:bg-brand-800 text-white cursor-pointer transition shadow flex items-center gap-2">
                    <Wrench className="w-4 h-4" /> Refresh
                  </button>
                </div>
              </div>

              {loading.maintenance ? (
                <SkeletonTable rows={4} cols={5} />
              ) : errors.maintenance ? (
                <ErrorState message={errors.maintenance} onRetry={loadMyTickets} />
              ) : myTickets.length === 0 ? (
                <EmptyState icon="wrench" title="No Tickets" subtitle="You haven't raised any maintenance tickets." />
              ) : (
                <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-surface-200 dark:border-zinc-800 bg-surface-50 dark:bg-zinc-950 text-[10px] text-surface-500 dark:text-zinc-500 font-bold uppercase tracking-wider">
                          <th className="p-3 text-left">Asset</th>
                          <th className="p-3 text-left">Issue</th>
                          <th className="p-3 text-left">Status</th>
                          <th className="p-3 text-left">Submitted</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-150 dark:divide-zinc-800 font-semibold text-surface-850 dark:text-zinc-200">
                        {myTickets.map((t: any) => (
                          <tr key={t.id} className="hover:bg-surface-50/50 dark:hover:bg-zinc-900/50">
                            <td className="p-3 font-mono text-brand-900 dark:text-brand-300 font-bold">{t.asset?.tag || "--"}</td>
                            <td className="p-3 text-surface-600 dark:text-zinc-400 max-w-[300px] truncate">{t.issue}</td>
                            <td className="p-3">
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
                                t.status === "PENDING" ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800" :
                                t.status === "RESOLVED" ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800" :
                                "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                              }`}>{displayStatus(t.status)}</span>
                            </td>
                            <td className="p-3 text-surface-500 dark:text-zinc-500 text-[10px] font-mono">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "--"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* â”€â”€â”€ Tab 5: Notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {activeTab === "notifications" && (
            <div className="max-w-6xl space-y-8 animate-float">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-surface-900 dark:text-white font-sans uppercase">Notifications</h2>
                  <p className="text-sm text-surface-600 dark:text-zinc-400 mt-1 font-medium">Your personal notification feed.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={async () => { try { await api.markAllNotificationsRead(); loadEmpNotifications(); } catch {} }} className="px-4 py-2 rounded-lg text-xs font-bold bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 text-surface-700 dark:text-zinc-300 hover:border-brand-900 cursor-pointer transition">
                    Mark All Read
                  </button>
                  <button onClick={loadEmpNotifications} className="px-4 py-2 rounded-lg text-xs font-bold bg-brand-900 hover:bg-brand-800 text-white cursor-pointer transition shadow flex items-center gap-2">
                    <Bell className="w-4 h-4" /> Refresh
                  </button>
                </div>
              </div>

              {loading.notifications ? (
                <SkeletonActivityList rows={6} />
              ) : empNotifications.length === 0 ? (
                <EmptyState icon="bell" title="No Notifications" subtitle="You're all caught up!" />
              ) : (
                <div className="space-y-2">
                  {empNotifications.map((n: any) => (
                    <div key={n.id} className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                      n.isRead
                        ? "bg-white dark:bg-zinc-900 border-surface-200 dark:border-zinc-800"
                        : "bg-brand-50/50 dark:bg-brand-950/20 border-brand-200 dark:border-brand-800 shadow-sm"
                    }`}>
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.isRead ? "bg-surface-300 dark:bg-zinc-700" : "bg-brand-900 dark:bg-brand-400"}`} />
                      <div className="flex-grow">
                        <p className="text-xs font-semibold text-surface-800 dark:text-zinc-200">{n.message}</p>
                        <p className="text-[10px] text-surface-400 dark:text-zinc-600 font-mono mt-1">{n.createdAt ? timeAgo(n.createdAt) : "--"}</p>
                      </div>
                      {!n.isRead && (
                        <button
                          onClick={async () => { try { await api.markNotificationRead(n.id); loadEmpNotifications(); } catch {} }}
                          className="text-[9px] font-bold text-brand-900 dark:text-brand-400 hover:underline cursor-pointer shrink-0"
                        >
                          Mark Read
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* â”€â”€â”€ Tab 6: My Profile â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {activeTab === "profile" && (
            <div className="max-w-3xl space-y-8 animate-float">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-surface-900 dark:text-white font-sans uppercase">My Profile</h2>
                <p className="text-sm text-surface-600 dark:text-zinc-400 mt-1 font-medium">Your personal information and account details.</p>
              </div>

              {loading.profile ? (
                <div className="space-y-4">
                  {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : errors.profile ? (
                <ErrorState message={errors.profile} onRetry={loadMyProfile} />
              ) : myProfile ? (
                <div className="space-y-6">
                  {/* Profile Card */}
                  <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex items-center gap-6">
                    <img src={myProfile.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(myProfile.name || myProfile.id)}`} alt={myProfile.name} className="w-20 h-20 rounded-full bg-surface-100 dark:bg-zinc-800 border-2 border-brand-900/20" />
                    <div>
                      <h3 className="text-lg font-extrabold text-surface-900 dark:text-white">{myProfile.name}</h3>
                      <p className="text-xs text-surface-500 dark:text-zinc-500 font-medium">{myProfile.designation || "Employee"} â€¢ {myProfile.department?.name || "--"}</p>
                      <p className="text-[10px] text-surface-400 dark:text-zinc-600 font-mono mt-1">{myProfile.employeeId || myProfile.email}</p>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
                    <h4 className="text-sm font-bold text-surface-900 dark:text-white uppercase tracking-wider mb-4">Account Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { label: "Email", value: myProfile.email },
                        { label: "Phone", value: myProfile.phone || "--" },
                        { label: "Department", value: myProfile.department?.name || "--" },
                        { label: "Role", value: myProfile.role?.name || "--" },
                        { label: "Employment Type", value: myProfile.employmentType || "--" },
                        { label: "Joining Date", value: myProfile.joiningDate ? new Date(myProfile.joiningDate).toLocaleDateString() : "--" },
                        { label: "Status", value: myProfile.status || "--" },
                        { label: "Member Since", value: myProfile.createdAt ? new Date(myProfile.createdAt).toLocaleDateString() : "--" },
                      ].map(f => (
                        <div key={f.label} className="flex justify-between items-center py-2 border-b border-surface-100 dark:border-zinc-800 last:border-b-0">
                          <span className="text-[10px] font-bold text-surface-500 dark:text-zinc-500 uppercase tracking-wider">{f.label}</span>
                          <span className="text-xs font-semibold text-surface-800 dark:text-zinc-200">{f.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Allocated Assets */}
                  {myProfile.allocatedAssets && myProfile.allocatedAssets.length > 0 && (
                    <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
                      <h4 className="text-sm font-bold text-surface-900 dark:text-white uppercase tracking-wider mb-4">Currently Allocated Assets</h4>
                      <div className="space-y-2">
                        {myProfile.allocatedAssets.map((a: any) => (
                          <div key={a.id || a.asset?.id} className="flex items-center justify-between py-2 border-b border-surface-100 dark:border-zinc-800 last:border-b-0">
                            <span className="text-xs font-bold text-brand-900 dark:text-brand-300 font-mono">{a.asset?.tag || "--"}</span>
                            <span className="text-xs font-semibold text-surface-700 dark:text-zinc-300">{a.asset?.name || "--"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState icon="user" title="Profile Not Found" subtitle="Unable to load your profile data." />
              )}
            </div>
          )}

        </main>
      </div>
      {/* Book Resource Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 bg-surface-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-xl text-surface-900 dark:text-zinc-100">
            <div className="flex justify-between items-center pb-2 border-b border-surface-200">
              <h3 className="text-base font-bold text-surface-900 uppercase tracking-wider font-sans">Book Shared Resource</h3>
              <button onClick={() => setShowBookingModal(false)} className="text-surface-400 hover:text-surface-700 dark:text-zinc-300 font-bold">âœ•</button>
            </div>
            <form onSubmit={handleBookResource} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Resource Name</label>
                <input
                  type="text"
                  placeholder="e.g. Conference Room B2"
                  value={bookingResourceName}
                  onChange={e => setBookingResourceName(e.target.value)}
                  className="w-full bg-white border border-surface-300 rounded-lg h-10 px-3 text-sm focus:border-brand-900 focus:ring-brand-900 outline-none text-surface-900 font-semibold"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Date</label>
                <input
                  type="date"
                  value={bookingDate}
                  onChange={e => setBookingDate(e.target.value)}
                  className="w-full bg-white border border-surface-300 rounded-lg h-10 px-3 text-sm focus:border-brand-900 outline-none text-surface-900 font-semibold"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Start Time</label>
                  <input
                    type="time"
                    value={bookingStartTime}
                    onChange={e => setBookingStartTime(e.target.value)}
                    className="w-full bg-white border border-surface-300 rounded-lg h-10 px-3 text-sm focus:border-brand-900 outline-none text-surface-900 font-semibold"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">End Time</label>
                  <input
                    type="time"
                    value={bookingEndTime}
                    onChange={e => setBookingEndTime(e.target.value)}
                    className="w-full bg-white border border-surface-300 rounded-lg h-10 px-3 text-sm focus:border-brand-900 outline-none text-surface-900 font-semibold"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-brand-900 hover:bg-brand-800 text-white rounded-lg h-10 text-sm font-bold uppercase tracking-wider cursor-pointer shadow-sm"
              >
                Confirm Booking
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Raise Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 bg-surface-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-xl text-surface-900 dark:text-zinc-100">
            <div className="flex justify-between items-center pb-2 border-b border-surface-200">
              <h3 className="text-base font-bold text-surface-900 uppercase tracking-wider font-sans">Raise Maintenance Request</h3>
              <button onClick={() => setShowRequestModal(false)} className="text-surface-400 hover:text-surface-700 dark:text-zinc-300 font-bold">âœ•</button>
            </div>
            <form onSubmit={handleRaiseRequest} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Asset</label>
                <select
                  value={requestAssetId}
                  onChange={e => setRequestAssetId(e.target.value)}
                  className="w-full bg-white border border-surface-300 rounded-lg h-10 px-3 text-sm focus:border-brand-900 outline-none text-surface-900 font-semibold"
                  required
                >
                  <option value="">Select an asset...</option>
                  {myAssets.map((a: any) => <option key={a.id} value={a.id}>{a.tag || a.name} - {a.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Issue Description</label>
                <input
                  type="text"
                  placeholder="e.g. Screen flickering, brake pads squeaking"
                  value={requestTitle}
                  onChange={e => setRequestTitle(e.target.value)}
                  className="w-full bg-white border border-surface-300 rounded-lg h-10 px-3 text-sm focus:border-brand-900 focus:ring-brand-900 outline-none text-surface-900 font-semibold"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-brand-900 hover:bg-brand-800 text-white rounded-lg h-10 text-sm font-bold uppercase tracking-wider cursor-pointer shadow-sm"
              >
                Submit Ticket
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Request Asset Modal */}
      {showAssetReqModal && (
        <div className="fixed inset-0 z-50 bg-zinc-900/40 dark:bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-xl text-surface-900 dark:text-zinc-100">
            <div className="flex justify-between items-center pb-2 border-b border-surface-200 dark:border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-surface-900 dark:text-white uppercase tracking-wider font-sans">Request Asset Allocation</h3>
                <p className="text-xs text-surface-500 dark:text-zinc-400 font-medium">Select an available asset to submit a request to Admin.</p>
              </div>
              <button onClick={() => setShowAssetReqModal(false)} className="text-surface-400 hover:text-surface-700 dark:text-zinc-300 font-bold">✕</button>
            </div>
            <form onSubmit={handleAssetRequestSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Available Asset <span className="text-red-500">*</span></label>
                <select
                  value={assetReqAssetId}
                  onChange={e => setAssetReqAssetId(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                  required
                >
                  <option value="">Choose an available asset...</option>
                  {availableAssets.map((a: any) => (
                    <option key={a.id} value={a.id}>
                      [{a.tag}] {a.name} ({a.category?.name || "General"}) - {a.location || "Warehouse"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Reason for Request</label>
                <input
                  type="text"
                  placeholder="e.g. Primary work laptop replacement"
                  value={assetReqReason}
                  onChange={e => setAssetReqReason(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAssetReqModal(false)} className="flex-grow bg-white dark:bg-zinc-900 hover:bg-surface-50 dark:hover:bg-zinc-800 border border-surface-300 dark:border-zinc-800 text-surface-700 dark:text-zinc-300 rounded-lg h-10 text-xs font-bold uppercase tracking-wider cursor-pointer">Cancel</button>
                <button type="submit" className="flex-grow bg-brand-900 hover:bg-brand-800 text-white rounded-lg h-10 text-xs font-bold uppercase tracking-wider cursor-pointer shadow-sm">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ENTERPRISE COMMAND PALETTE ─────────────────────────────────── */}
      <CommandPalette 
        isOpen={showCommandPalette} 
        onClose={() => setShowCommandPalette(false)} 
        onNavigateTab={(tabId) => setActiveTab(tabId)} 
        userRole="EMPLOYEE"
      />
    </div>
  );
}
