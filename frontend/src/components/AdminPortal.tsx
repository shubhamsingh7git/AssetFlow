import { useState, useEffect, useCallback } from "react";
import { 
  LayoutDashboard, Building2, Laptop, ClipboardCheck, LogOut, Plus,
  Sparkles, UserCheck, Users, Layers, Search, ShieldAlert, 
  Edit2, Trash2, Eye, EyeOff, CheckCircle, Trash, UserPlus, KeyRound,
  ChevronLeft, ChevronRight, Calendar, Send, Menu, X,
  ArrowRightLeft, Wrench, FileBarChart, Bell, Clock, Download,
  Printer, RefreshCw, Command
} from "lucide-react";
import Logo from "./ui/Logo";
import EmptyState from "./ui/EmptyState";
import ErrorState from "./ui/ErrorState";
import { SkeletonTable, SkeletonActivityList } from "./ui/SkeletonLoader";
import * as api from "../lib/api";
import { formatINR } from "../lib/formatters";
import { generateQRCodeDataURL } from "../lib/qrcode";
import { getWarrantyStatus } from "../lib/warranty";
import { DonutChart, BarChart, TrendChart } from "./ui/Charts";
import { CommandPalette } from "./ui/CommandPalette";
import { ExportCenterModal, type ExportDataPayload } from "./ui/ExportCenterModal";


// ─── Interfaces ─────────────────────────────────────────────────────────────
interface Activity {
  id: string;
  text: string;
  timestamp: string;
}

interface Department {
  id: string;
  name: string;
  head: string;
  headId?: string;
  parent: string;
  parentId?: string;
  employeesCount: number;
  status: "Active" | "Inactive";
  createdDate: string;
  description?: string;
}

interface CustomField {
  name: string;
  type: "Text" | "Number" | "Date" | "Dropdown";
  required: boolean;
}

interface AssetCategory {
  id: string;
  name: string;
  description: string;
  assetsCount: number;
  status: "Active" | "Inactive";
  iconName: string;
  customFields?: CustomField[];
}

interface Employee {
  id: string;
  name: string;
  email: string;
  avatar: string;
  department: string;
  departmentId?: string;
  role: "Employee" | "Department Head" | "Asset Manager" | "Administrator";
  status: "Active" | "Inactive";
  lastLogin: string;
}

interface ToastMessage {
  id: string;
  text: string;
  type: "success" | "info" | "error";
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

const roleMap: Record<string, Employee["role"]> = {
  "Employee": "Employee",
  "EMPLOYEE": "Employee",
  "Department Head": "Department Head",
  "DEPARTMENT_HEAD": "Department Head",
  "Asset Manager": "Asset Manager",
  "ASSET_MANAGER": "Asset Manager",
  "Administrator": "Administrator",
  "ADMINISTRATOR": "Administrator",
  "ADMIN": "Administrator",
};

function mapRole(r: string): Employee["role"] {
  return roleMap[r] || "Employee";
}

export default function AdminPortal({
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
  const [activeSetupTab, setActiveSetupTab] = useState<"info" | "departments" | "categories" | "employees">("info");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [toastMessages, setToastMessages] = useState<ToastMessage[]>([]);

  // ─── Enterprise Modal States ─────────────────────────────────────────────
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPayload, setExportPayload] = useState<ExportDataPayload>({ title: '', headers: [], rows: [] });
  const [showQRStickerModal, setShowQRStickerModal] = useState(false);
  const [qrStickerAsset, setQrStickerAsset] = useState<any>(null);
  const [qrKey, setQrKey] = useState(0);

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

  const [orgData, setOrgData] = useState<any>(null);

  const loadOrgData = useCallback(async () => {
    try {
      const res = await api.fetchOrganization();
      const org = Array.isArray(res) ? res[0] : ((res as any).data || res);
      setOrgData(org);
    } catch { /* silent */ }
  }, []);

  // Loading indicator helper
  const [isLoading, setIsLoading] = useState(false);
  const [loadingState, setLoadingState] = useState<Record<string, boolean>>({});
  const [errorState, setErrorState] = useState<Record<string, string | null>>({});

  const setLoadFor = (k: string, v: boolean) => setLoadingState(p => ({ ...p, [k]: v }));
  const setErrFor = (k: string, v: string | null) => setErrorState(p => ({ ...p, [k]: v }));

  // ─── Toast Helper ──────────────────────────────────────────────────────────
  const showToast = (text: string, type: ToastMessage["type"] = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToastMessages(prev => [...prev, { id, text, type }]);
  };

  useEffect(() => {
    if (toastMessages.length > 0) {
      const timer = setTimeout(() => {
        setToastMessages(prev => prev.slice(1));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessages]);

  // ─── Data States (empty — populated from API) ──────────────────────────────
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  // ─── Data Fetching ─────────────────────────────────────────────────────────

  const loadDepartments = useCallback(async () => {
    setLoadFor("departments", true);
    setErrFor("departments", null);
    try {
      const res = await api.fetchDepartments();
      const items = Array.isArray(res) ? res : res.data || [];
      setDepartments(items.map((d: any) => ({
        id: d.id,
        name: d.name,
        head: d.head?.name || "--",
        headId: d.headId || undefined,
        parent: d.parent?.name || "--",
        parentId: d.parentId || undefined,
        employeesCount: d._count?.employees ?? d.employeesCount ?? 0,
        status: d.status === "ACTIVE" || d.status === "Active" ? "Active" : "Inactive",
        createdDate: d.createdAt ? new Date(d.createdAt).toISOString().split("T")[0] : "--",
        description: d.description || "",
      })));
    } catch (err: any) {
      setErrFor("departments", err.message);
    } finally {
      setLoadFor("departments", false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    setLoadFor("categories", true);
    setErrFor("categories", null);
    try {
      const res = await api.fetchCategories();
      const items = Array.isArray(res) ? res : res.data || [];
      setCategories(items.map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description || "",
        assetsCount: c._count?.assets ?? c.assetsCount ?? 0,
        status: c.status === "ACTIVE" || c.status === "Active" ? "Active" : "Inactive",
        iconName: c.iconName || "Laptop",
        customFields: c.customFields || [],
      })));
    } catch (err: any) {
      setErrFor("categories", err.message);
    } finally {
      setLoadFor("categories", false);
    }
  }, []);

  const loadEmployees = useCallback(async () => {
    setLoadFor("employees", true);
    setErrFor("employees", null);
    try {
      const res = await api.fetchEmployees();
      const items = Array.isArray(res) ? res : res.data || [];
      setEmployees(items.map((e: any) => ({
        id: e.id,
        name: e.name || "--",
        email: e.email || "--",
        avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(e.name || e.id)}`,
        department: e.department?.name || e.department || "--",
        departmentId: e.departmentId || undefined,
        role: mapRole(e.role || "Employee"),
        status: e.status === "ACTIVE" || e.status === "Active" ? "Active" : "Inactive",
        lastLogin: (e.lastLoginAt || e.lastLogin) ? timeAgo(e.lastLoginAt || e.lastLogin) : (e.createdAt ? timeAgo(e.createdAt) : "--"),
      })));
    } catch (err: any) {
      setErrFor("employees", err.message);
    } finally {
      setLoadFor("employees", false);
    }
  }, []);

  const loadActivities = useCallback(async () => {
    try {
      const res = await api.fetchRecentActivity(10);
      const items = Array.isArray(res) ? res : res.data || [];
      setActivities(items.map((a: any) => ({
        id: a.id,
        text: a.details || a.action || "",
        timestamp: timeAgo(a.createdAt),
      })));
    } catch { /* silent fallback to empty */ }
  }, []);

  // ─── Initial Load ──────────────────────────────────────────────────────────
  useEffect(() => {
    loadDepartments();
    loadCategories();
    loadEmployees();
    loadActivities();
  }, []);

  // Statistics summaries (derived from fetched data)
  const departmentCount = departments.length;
  const employeeCount = employees.length;
  const categoryCount = categories.length;
  const deptHeadsCount = employees.filter(e => e.role === "Department Head").length;
  const assetManagersCount = employees.filter(e => e.role === "Asset Manager").length;
  const activeUsersCount = employees.filter(e => e.status === "Active").length;

  // ─── New Tab Data States ────────────────────────────────────────────────────
  const [allAssets, setAllAssets] = useState<any[]>([]);
  const [allTransfers, setAllTransfers] = useState<any[]>([]);
  const [pendingAssetRequests, setPendingAssetRequests] = useState<any[]>([]);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [allMaintenance, setAllMaintenance] = useState<any[]>([]);
  const [allAudits, setAllAudits] = useState<any[]>([]);
  const [allNotifications, setAllNotifications] = useState<any[]>([]);
  const [adminStatsData, setAdminStatsData] = useState<any>(null);

  // Allocate Modal state
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [allocAssetId, setAllocAssetId] = useState("");
  const [allocUserId, setAllocUserId] = useState("");
  const [allocNotes, setAllocNotes] = useState("");
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);

  const handleOpenAllocateModal = async () => {
    try {
      const res = await api.fetchAvailableAssets();
      const items = Array.isArray(res) ? res : res.data || [];
      setAvailableAssets(items);
      setShowAllocateModal(true);
    } catch (e: any) {
      showToast(e.message || "Failed to load available assets", "error");
    }
  };

  const handleAllocateAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocAssetId || !allocUserId) {
      showToast("Please select an asset and an employee", "error");
      return;
    }
    try {
      await api.createAllocation({ assetId: allocAssetId, userId: allocUserId, notes: allocNotes || undefined });
      showToast("Asset allocated successfully!");
      setShowAllocateModal(false);
      setAllocAssetId("");
      setAllocUserId("");
      setAllocNotes("");
      loadAllAllocations();
      loadAllAssets();
    } catch (e: any) {
      showToast(e.message || "Allocation failed", "error");
    }
  };

  // ─── Asset Registration & Details State ─────────────────────────────────
  const [showRegisterAssetModal, setShowRegisterAssetModal] = useState(false);
  const [registerAssetError, setRegisterAssetError] = useState("");
  const [isRegisteringAsset, setIsRegisteringAsset] = useState(false);
  const [registerAssetTab, setRegisterAssetTab] = useState<"basic" | "ownership" | "location" | "details">("basic");

  // Asset Details Modal State
  const [showAssetDetailModal, setShowAssetDetailModal] = useState(false);
  const [selectedAssetDetail, setSelectedAssetDetail] = useState<any>(null);
  const [assetDetailLoading, setAssetDetailLoading] = useState(false);

  // Asset Registry Filters & Pagination State
  const [assetSearchQuery, setAssetSearchQuery] = useState("");
  const [assetCategoryFilter, setAssetCategoryFilter] = useState("All");
  const [assetDepartmentFilter, setAssetDepartmentFilter] = useState("All");
  const [assetStatusFilter, setAssetStatusFilter] = useState("All");
  const [assetPage, setAssetPage] = useState(1);
  const assetsPerPage = 10;

  const [registerAssetForm, setRegisterAssetForm] = useState({
    name: "",
    tag: "",
    categoryId: "",
    type: "Laptop",
    manufacturer: "",
    model: "",
    serialNumber: "",
    barcode: "",
    description: "",
    departmentId: "",
    vendor: "",
    poNumber: "",
    invoiceNumber: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    purchaseCost: "",
    currentValue: "",
    warrantyExpiry: "",
    expectedLifeMonths: "36",
    depreciationMethod: "Straight Line",
    building: "",
    floor: "",
    room: "",
    storageLocation: "",
    status: "AVAILABLE",
    imageUrl: "",
    documentUrl: "",
    notes: "",
  });

  const handleOpenRegisterAssetModal = async () => {
    setRegisterAssetError("");
    setRegisterAssetTab("basic");
    let suggestedTag = "";
    try {
      const res = await api.generateAssetTag();
      suggestedTag = res?.tag || (res as any)?.data?.tag || "";
    } catch { /* fallback */ }

    setRegisterAssetForm({
      name: "",
      tag: suggestedTag || "AST-10001",
      categoryId: categories.length > 0 ? categories[0].id : "",
      type: "Laptop",
      manufacturer: "",
      model: "",
      serialNumber: "",
      barcode: "",
      description: "",
      departmentId: departments.length > 0 ? departments[0].id : "",
      vendor: "",
      poNumber: "",
      invoiceNumber: "",
      purchaseDate: new Date().toISOString().split("T")[0],
      purchaseCost: "",
      currentValue: "",
      warrantyExpiry: "",
      expectedLifeMonths: "36",
      depreciationMethod: "Straight Line",
      building: "",
      floor: "",
      room: "",
      storageLocation: "",
      status: "AVAILABLE",
      imageUrl: "",
      documentUrl: "",
      notes: "",
    });
    setShowRegisterAssetModal(true);
  };

  const handleRegisterAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterAssetError("");

    if (!registerAssetForm.name.trim()) {
      setRegisterAssetError("Asset Name is required.");
      setRegisterAssetTab("basic");
      return;
    }
    if (!registerAssetForm.tag.trim()) {
      setRegisterAssetError("Asset Code / Tag is required.");
      setRegisterAssetTab("basic");
      return;
    }
    if (!registerAssetForm.categoryId) {
      setRegisterAssetError("Asset Category is required.");
      setRegisterAssetTab("basic");
      return;
    }
    if (!registerAssetForm.purchaseDate) {
      setRegisterAssetError("Purchase Date is required.");
      setRegisterAssetTab("ownership");
      return;
    }

    setIsRegisteringAsset(true);
    try {
      await api.registerAsset({
        name: registerAssetForm.name.trim(),
        tag: registerAssetForm.tag.trim(),
        categoryId: registerAssetForm.categoryId,
        departmentId: registerAssetForm.departmentId || undefined,
        type: registerAssetForm.type || undefined,
        manufacturer: registerAssetForm.manufacturer || undefined,
        model: registerAssetForm.model || undefined,
        serialNumber: registerAssetForm.serialNumber ? registerAssetForm.serialNumber.trim() : undefined,
        barcode: registerAssetForm.barcode ? registerAssetForm.barcode.trim() : undefined,
        description: registerAssetForm.description || undefined,
        vendor: registerAssetForm.vendor || undefined,
        poNumber: registerAssetForm.poNumber || undefined,
        invoiceNumber: registerAssetForm.invoiceNumber || undefined,
        purchaseDate: registerAssetForm.purchaseDate,
        purchaseCost: registerAssetForm.purchaseCost ? parseFloat(registerAssetForm.purchaseCost) : undefined,
        currentValue: registerAssetForm.currentValue ? parseFloat(registerAssetForm.currentValue) : undefined,
        warrantyExpiry: registerAssetForm.warrantyExpiry || undefined,
        expectedLifeMonths: registerAssetForm.expectedLifeMonths ? parseInt(registerAssetForm.expectedLifeMonths, 10) : undefined,
        depreciationMethod: registerAssetForm.depreciationMethod || undefined,
        building: registerAssetForm.building || undefined,
        floor: registerAssetForm.floor || undefined,
        room: registerAssetForm.room || undefined,
        storageLocation: registerAssetForm.storageLocation || undefined,
        status: registerAssetForm.status || "AVAILABLE",
        imageUrl: registerAssetForm.imageUrl || undefined,
        documentUrl: registerAssetForm.documentUrl || undefined,
        notes: registerAssetForm.notes || undefined,
      });

      showToast(`Asset "${registerAssetForm.name}" (${registerAssetForm.tag}) registered successfully!`);
      setShowRegisterAssetModal(false);
      loadAllAssets();
      loadOrgData();
      loadAdminStats();
      loadActivities();
    } catch (err: any) {
      setRegisterAssetError(err.message || "Failed to register asset. Please check duplicate entries.");
    } finally {
      setIsRegisteringAsset(false);
    }
  };

  const handleOpenAssetDetail = async (asset: any) => {
    setSelectedAssetDetail(asset);
    setShowAssetDetailModal(true);
    setAssetDetailLoading(true);
    try {
      const res = await api.fetchAssetById(asset.id);
      setSelectedAssetDetail(res.data || res);
    } catch { /* use existing snapshot */ }
    finally { setAssetDetailLoading(false); }
  };

  // ─── New Tab Data Loaders ───────────────────────────────────────────────────
  const loadAdminStats = useCallback(async () => {
    try {
      const res = await api.fetchAdminStats();
      setAdminStatsData(res);
    } catch { /* silent */ }
  }, []);

  const loadAllAssets = useCallback(async () => {
    setLoadFor("assets", true);
    try {
      const res = await api.fetchAssets();
      const items = Array.isArray(res) ? res : res.data || [];
      setAllAssets(items);
    } catch (err: any) { setErrFor("assets", err.message); }
    finally { setLoadFor("assets", false); }
  }, []);

  const loadAllAllocations = useCallback(async () => {
    setLoadFor("allocations", true);
    try {
      const [transfersRes, requestsRes] = await Promise.all([
        api.fetchTransfers(),
        api.fetchAssetRequests(),
      ]);
      setAllTransfers(Array.isArray(transfersRes) ? transfersRes : transfersRes.data || []);
      setPendingAssetRequests(Array.isArray(requestsRes) ? requestsRes : requestsRes.data || []);
    } catch (err: any) { setErrFor("allocations", err.message); }
    finally { setLoadFor("allocations", false); }
  }, []);

  const loadAllBookings = useCallback(async () => {
    setLoadFor("bookings", true);
    try {
      const res = await api.fetchBookings();
      const items = Array.isArray(res) ? res : res.data || [];
      setAllBookings(items);
    } catch (err: any) { setErrFor("bookings", err.message); }
    finally { setLoadFor("bookings", false); }
  }, []);

  const loadAllMaintenance = useCallback(async () => {
    setLoadFor("maintenance", true);
    try {
      const res = await api.fetchMaintenanceTickets();
      const items = Array.isArray(res) ? res : res.data || [];
      setAllMaintenance(items);
    } catch (err: any) { setErrFor("maintenance", err.message); }
    finally { setLoadFor("maintenance", false); }
  }, []);

  const loadAllAudits = useCallback(async () => {
    setLoadFor("audits", true);
    try {
      const res = await api.fetchAudits();
      const items = Array.isArray(res) ? res : res.data || [];
      setAllAudits(items);
    } catch (err: any) { setErrFor("audits", err.message); }
    finally { setLoadFor("audits", false); }
  }, []);

  const loadAllNotifications = useCallback(async () => {
    setLoadFor("notifications", true);
    try {
      const res = await api.fetchNotifications();
      const items = Array.isArray(res) ? res : res.data || [];
      setAllNotifications(items);
    } catch (err: any) { setErrFor("notifications", err.message); }
    finally { setLoadFor("notifications", false); }
  }, []);

  // Lazy-load data when switching tabs
  useEffect(() => {
    if (activeTab === "assets" && allAssets.length === 0) loadAllAssets();
    if (activeTab === "allocation") loadAllAllocations();
    if (activeTab === "booking" && allBookings.length === 0) loadAllBookings();
    if (activeTab === "maintenance") loadAllMaintenance();
    if (activeTab === "audit" && allAudits.length === 0) loadAllAudits();
    if (activeTab === "notifications") loadAllNotifications();
    if (activeTab === "dashboard" && !adminStatsData) loadAdminStats();
  }, [activeTab]);

  // ─── Modal States ──────────────────────────────────────────────────────────
  // 1. Department Modal
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [deptModalMode, setDeptModalMode] = useState<"create" | "edit">("create");
  const [selectedDeptName, setSelectedDeptName] = useState("");
  // Form fields
  const [formDeptName, setFormDeptName] = useState("");
  const [formDeptHead, setFormDeptHead] = useState("");
  const [formDeptParent, setFormDeptParent] = useState("--");
  const [formDeptStatus, setFormDeptStatus] = useState<boolean>(true);
  const [formDeptDesc, setFormDeptDesc] = useState("");
  const [deptFormError, setDeptFormError] = useState("");

  // 2. Category Modal & Dynamic Builder
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [catModalMode, setCatModalMode] = useState<"create" | "edit">("create");
  const [selectedCatName, setSelectedCatName] = useState("");
  // Form fields
  const [formCatName, setFormCatName] = useState("");
  const [formCatDesc, setFormCatDesc] = useState("");
  const [formCatStatus, setFormCatStatus] = useState<boolean>(true);
  const [formCatIcon, setFormCatIcon] = useState("Laptop");
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [catFormError, setCatFormError] = useState("");



  // 4. View Entity Modal
  const [viewEntityData, setViewEntityData] = useState<{ title: string; fields: Record<string, string | number> } | null>(null);

  // ─── 5. Employee Management States ──────────────────────────────────────────
  // Managed Employee List (from /api/employees — paginated)
  const [managedEmployees, setManagedEmployees] = useState<any[]>([]);
  const [empTotalCount, setEmpTotalCount] = useState(0);
  const [empPage, setEmpPage] = useState(1);
  const [empLimit] = useState(15);
  const [empSearchQuery, setEmpSearchQuery] = useState("");
  const [empFilterDept, setEmpFilterDept] = useState("All");
  const [empFilterRole, setEmpFilterRole] = useState("All");
  const [empFilterStatus, setEmpFilterStatus] = useState("All");

  // Add Employee Modal
  const [showAddEmpModal, setShowAddEmpModal] = useState(false);
  const [addEmpForm, setAddEmpForm] = useState({
    firstName: "", lastName: "", name: "", email: "",
    password: "", confirmPassword: "", showPassword: false,
    phone: "", employeeId: "", departmentId: "", roleName: "Employee",
    designation: "", employmentType: "full-time", joiningDate: "",
    managerId: "", status: "ACTIVE", forcePasswordChange: true,
  });
  const [addEmpError, setAddEmpError] = useState("");

  // Edit Employee Modal
  const [showEditEmpModal, setShowEditEmpModal] = useState(false);
  const [editEmpId, setEditEmpId] = useState("");
  const [editEmpForm, setEditEmpForm] = useState({
    name: "", email: "", phone: "", employeeId: "",
    departmentId: "", roleName: "Employee", designation: "",
    employmentType: "full-time", joiningDate: "", managerId: "", status: "ACTIVE",
  });
  const [editEmpError, setEditEmpError] = useState("");

  // Reset Password Modal
  const [showResetPwdModal, setShowResetPwdModal] = useState(false);
  const [resetPwdEmpId, setResetPwdEmpId] = useState("");
  const [resetPwdEmpName, setResetPwdEmpName] = useState("");
  const [resetPwdForm, setResetPwdForm] = useState({
    newPassword: "",
    confirmPassword: "",
    showPassword: false,
  });
  const [resetPwdError, setResetPwdError] = useState("");

  // Success Dialog
  const [showCreateSuccessDialog, setShowCreateSuccessDialog] = useState(false);
  const [createdEmpInfo] = useState({ name: "", email: "", password: "" });

  // ─── Load Managed Employees (Paginated) ────────────────────────────────────
  const loadManagedEmployees = useCallback(async () => {
    setLoadFor("managedEmployees", true);
    setErrFor("managedEmployees", null);
    try {
      const params: Record<string, string> = {
        page: String(empPage),
        limit: String(empLimit),
      };
      if (empSearchQuery) params.search = empSearchQuery;
      if (empFilterDept !== "All") params.department = empFilterDept;
      if (empFilterRole !== "All") params.role = empFilterRole;
      if (empFilterStatus !== "All") params.status = empFilterStatus;

      const res = await api.fetchEmployeeList(params);
      const items = Array.isArray(res) ? res : (res as any).data || [];
      setManagedEmployees(items);
      setEmpTotalCount((res as any).total ?? (res as any).pagination?.total ?? items.length);
    } catch (err: any) {
      setErrFor("managedEmployees", err.message);
    } finally {
      setLoadFor("managedEmployees", false);
    }
  }, [empPage, empLimit, empSearchQuery, empFilterDept, empFilterRole, empFilterStatus]);

  // Re-load when page/filters change
  useEffect(() => {
    if (activeTab === "org_setup" || activeTab === "employees") {
      loadOrgData();
      loadManagedEmployees();
    }
  }, [activeTab, loadOrgData, loadManagedEmployees]);

  const empTotalPages = Math.max(1, Math.ceil(empTotalCount / empLimit));

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleOpenCreateDept = () => {
    setDeptModalMode("create");
    setFormDeptName("");
    setFormDeptHead(employees[0]?.name || "");
    setFormDeptParent("--");
    setFormDeptStatus(true);
    setFormDeptDesc("");
    setDeptFormError("");
    setShowDeptModal(true);
  };

  const handleOpenEditDept = (dept: Department) => {
    setDeptModalMode("edit");
    setSelectedDeptName(dept.name);
    setFormDeptName(dept.name);
    setFormDeptHead(dept.head);
    setFormDeptParent(dept.parent);
    setFormDeptStatus(dept.status === "Active");
    setFormDeptDesc(dept.description || "");
    setDeptFormError("");
    setShowDeptModal(true);
  };

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDeptName.trim()) {
      setDeptFormError("Department name is required.");
      return;
    }
    if (formDeptName.length < 3) {
      setDeptFormError("Department name must be at least 3 characters.");
      return;
    }

    setIsLoading(true);
    try {
      if (deptModalMode === "create") {
        await api.createDepartment({
          name: formDeptName,
          description: formDeptDesc || undefined,
          parentId: formDeptParent !== "--" ? departments.find(d => d.name === formDeptParent)?.id : undefined,
          headId: employees.find(e => e.name === formDeptHead)?.id || undefined,
        });
        showToast("Department Created Successfully", "success");
      } else {
        const dept = departments.find(d => d.name === selectedDeptName);
        if (dept?.id) {
          await api.updateDepartment(dept.id, {
            name: formDeptName,
            description: formDeptDesc || undefined,
            parentId: formDeptParent !== "--" ? departments.find(d => d.name === formDeptParent)?.id : undefined,
            headId: employees.find(e => e.name === formDeptHead)?.id || undefined,
          });
        }
        showToast("Department Updated Successfully", "success");
      }
      setShowDeptModal(false);
      await loadDepartments();
      await loadActivities();
    } catch (err: any) {
      setDeptFormError(err.message || "Failed to save department.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleDeptStatus = async (deptName: string) => {
    const dept = departments.find(d => d.name === deptName);
    if (!dept?.id) return;
    try {
      await api.toggleDepartmentStatus(dept.id);
      const nextStatus = dept.status === "Active" ? "Inactive" : "Active";
      showToast(nextStatus === "Inactive" ? "Department Archived" : "Department Activated", nextStatus === "Inactive" ? "info" : "success");
      await loadDepartments();
    } catch { /* silent */ }
  };


  const handleOpenCreateCategory = () => {
    setCatModalMode("create");
    setFormCatName("");
    setFormCatDesc("");
    setFormCatStatus(true);
    setFormCatIcon("Laptop");
    setCustomFields([]);
    setCatFormError("");
    setShowCategoryModal(true);
  };

  const handleOpenEditCategory = (cat: AssetCategory) => {
    setCatModalMode("edit");
    setSelectedCatName(cat.name);
    setFormCatName(cat.name);
    setFormCatDesc(cat.description);
    setFormCatStatus(cat.status === "Active");
    setFormCatIcon(cat.iconName);
    setCustomFields(cat.customFields || []);
    setCatFormError("");
    setShowCategoryModal(true);
  };

  const handleAddField = () => {
    setCustomFields([...customFields, { name: "New Field", type: "Text", required: false }]);
  };

  const handleRemoveField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, key: keyof CustomField, value: any) => {
    setCustomFields(prev => prev.map((f, i) => i === index ? { ...f, [key]: value } : f));
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCatName.trim()) {
      setCatFormError("Category name is required.");
      return;
    }

    setIsLoading(true);
    try {
      if (catModalMode === "create") {
        await api.createCategory({
          name: formCatName,
          description: formCatDesc || undefined,
          iconName: formCatIcon,
          customFields: customFields,
        });
        showToast("Category Created Successfully", "success");
      } else {
        const cat = categories.find(c => c.name === selectedCatName);
        if (cat?.id) {
          await api.updateCategory(cat.id, {
            name: formCatName,
            description: formCatDesc || undefined,
            status: formCatStatus ? "ACTIVE" : "INACTIVE",
            iconName: formCatIcon,
            customFields: customFields,
          });
        }
        showToast("Category Updated", "success");
      }
      setShowCategoryModal(false);
      await loadCategories();
      await loadActivities();
    } catch (err: any) {
      setCatFormError(err.message || "Failed to save category.");
    } finally {
      setIsLoading(false);
    }
  };



  const validateStrongPassword = (pwd: string) => {
    if (pwd.length < 8) return "Password must be at least 8 characters long.";
    if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter.";
    if (!/[a-z]/.test(pwd)) return "Password must contain at least one lowercase letter.";
    if (!/\d/.test(pwd)) return "Password must contain at least one number.";
    if (!/[@$!%*?&^#()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) return "Password must contain at least one special character.";
    return null;
  };

  const handleOpenAddEmployee = () => {
    setAddEmpForm({
      firstName: "", lastName: "", name: "", email: "",
      password: "", confirmPassword: "", showPassword: false,
      phone: "", employeeId: "", departmentId: "", roleName: "Employee",
      designation: "", employmentType: "full-time", joiningDate: "",
      managerId: "", status: "ACTIVE", forcePasswordChange: true,
    });
    setAddEmpError("");
    setShowAddEmpModal(true);
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddEmpError("");

    const fullName = addEmpForm.name.trim() || `${addEmpForm.firstName} ${addEmpForm.lastName}`.trim();

    if (!fullName || !addEmpForm.email.trim()) {
      setAddEmpError("Name and Email are required.");
      return;
    }

    const pwdErr = validateStrongPassword(addEmpForm.password);
    if (pwdErr) {
      setAddEmpError(pwdErr);
      return;
    }

    if (addEmpForm.password !== addEmpForm.confirmPassword) {
      setAddEmpError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      await api.createEmployeeAccount({
        name: fullName,
        firstName: addEmpForm.firstName.trim() || undefined,
        lastName: addEmpForm.lastName.trim() || undefined,
        email: addEmpForm.email.trim(),
        password: addEmpForm.password,
        confirmPassword: addEmpForm.confirmPassword,
        phone: addEmpForm.phone || undefined,
        employeeId: addEmpForm.employeeId || undefined,
        departmentId: addEmpForm.departmentId || undefined,
        roleName: addEmpForm.roleName || "Employee",
        designation: addEmpForm.designation || undefined,
        employmentType: addEmpForm.employmentType || "full-time",
        joiningDate: addEmpForm.joiningDate || undefined,
        managerId: addEmpForm.managerId || undefined,
        status: addEmpForm.status || "ACTIVE",
        forcePasswordChange: true,
      });

      setShowAddEmpModal(false);
      showToast(`Employee created! Welcome credentials emailed to ${addEmpForm.email}`, "success");
      await loadManagedEmployees();
      await loadEmployees();
      await loadActivities();
    } catch (err: any) {
      setAddEmpError(err.message || "Failed to create employee.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEditEmployee = (emp: any) => {
    setEditEmpId(emp.id);
    setEditEmpForm({
      name: emp.name || "",
      email: emp.email || "",
      phone: emp.phone || "",
      employeeId: emp.employeeId || "",
      departmentId: emp.departmentId || "",
      roleName: emp.role?.name || emp.roleName || mapRole(emp.role || "Employee"),
      designation: emp.designation || "",
      employmentType: emp.employmentType || "full-time",
      joiningDate: emp.joiningDate ? emp.joiningDate.substring(0, 10) : "",
      managerId: emp.managerId || "",
      status: emp.status || "ACTIVE",
    });
    setEditEmpError("");
    setShowEditEmpModal(true);
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditEmpError("");
    if (!editEmpForm.name.trim()) {
      setEditEmpError("Name is required.");
      return;
    }

    setIsLoading(true);
    try {
      await api.updateEmployeeAccount(editEmpId, {
        name: editEmpForm.name.trim(),
        email: editEmpForm.email.trim() || undefined,
        phone: editEmpForm.phone || null,
        employeeId: editEmpForm.employeeId || null,
        departmentId: editEmpForm.departmentId || null,
        roleName: editEmpForm.roleName || undefined,
        designation: editEmpForm.designation || null,
        employmentType: editEmpForm.employmentType || undefined,
        joiningDate: editEmpForm.joiningDate || null,
        managerId: editEmpForm.managerId || null,
        status: editEmpForm.status,
      });
      setShowEditEmpModal(false);
      showToast("Employee updated!", "success");
      await loadManagedEmployees();
      await loadEmployees();
      await loadActivities();
    } catch (err: any) {
      setEditEmpError(err.message || "Failed to update employee.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenResetPassword = (emp: any) => {
    setResetPwdEmpId(emp.id);
    setResetPwdEmpName(emp.name || emp.email);
    setResetPwdForm({ newPassword: "", confirmPassword: "", showPassword: false });
    setResetPwdError("");
    setShowResetPwdModal(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetPwdError("");

    const pwdErr = validateStrongPassword(resetPwdForm.newPassword);
    if (pwdErr) {
      setResetPwdError(pwdErr);
      return;
    }

    if (resetPwdForm.newPassword !== resetPwdForm.confirmPassword) {
      setResetPwdError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      await api.resetEmployeePassword(resetPwdEmpId, {
        newPassword: resetPwdForm.newPassword,
        confirmPassword: resetPwdForm.confirmPassword,
      });
      setShowResetPwdModal(false);
      showToast(`Password updated & emailed to ${resetPwdEmpName}`, "success");
      await loadManagedEmployees();
      await loadEmployees();
      await loadActivities();
    } catch (err: any) {
      setResetPwdError(err.message || "Failed to reset password.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleManagedEmpStatus = async (empId: string) => {
    try {
      await api.toggleEmployeeAccountStatus(empId);
      showToast("Employee status updated", "success");
      await loadManagedEmployees();
      await loadEmployees();
      await loadActivities();
    } catch (err: any) {
      showToast(err.message || "Failed to toggle status", "error");
    }
  };

  const handleToggleLockEmployee = async (empId: string, empName: string) => {
    try {
      const res: any = await api.toggleEmployeeLockStatus(empId);
      const locked = res.isLocked || res.data?.isLocked;
      showToast(`Account for ${empName} ${locked ? "locked" : "unlocked"}`, "info");
      await loadManagedEmployees();
      await loadEmployees();
      await loadActivities();
    } catch (err: any) {
      showToast(err.message || "Failed to toggle account lock", "error");
    }
  };

  const handleDeleteManagedEmployee = async (empId: string, empName: string) => {
    if (!confirm(`Are you sure you want to delete ${empName}? This action is a soft delete.`)) return;
    try {
      await api.deleteEmployeeAccount(empId);
      showToast(`${empName} deleted`, "info");
      await loadManagedEmployees();
      await loadEmployees();
      await loadActivities();
    } catch (err: any) {
      showToast(err.message || "Failed to delete employee", "error");
    }
  };

  const handleResendWelcomeEmail = async (empId: string, empName: string) => {
    try {
      await api.resendEmployeeWelcomeEmail(empId);
      showToast(`Welcome email & temporary password resent to ${empName}`, "success");
      await loadManagedEmployees();
      await loadEmployees();
      await loadActivities();
    } catch (err: any) {
      showToast(err.message || "Failed to resend welcome email", "error");
    }
  };

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
      {/* Toast Alert Popups */}
      <div className="fixed top-6 right-6 z-[200] space-y-3 pointer-events-none">
        {toastMessages.map(msg => (
          <div
            key={msg.id}
            className={`min-w-[280px] p-4 rounded-xl border shadow-xl flex items-center gap-3 animate-float transition-all pointer-events-auto bg-white dark:bg-zinc-900 ${
              msg.type === "success" ? "border-green-200 dark:border-green-800 text-green-800 dark:text-green-300" :
              msg.type === "error" ? "border-red-200 dark:border-red-800 text-red-800 dark:text-red-300" :
              "border-brand-200 dark:border-brand-800 text-brand-900 dark:text-brand-300"
            }`}
          >
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span className="text-xs font-extrabold tracking-wide uppercase">{msg.text}</span>
          </div>
        ))}
      </div>

      {/* Top Header sticky */}
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
            <span className="ml-2 hidden sm:inline-block text-xs uppercase bg-brand-100 dark:bg-brand-950 text-brand-900 dark:text-brand-300 px-2 py-0.5 rounded font-mono font-bold tracking-wider">Admin</span>
          </span>
        </div>

        {/* Global actions & theme toggles */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Global search & Command Palette button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCommandPalette(true)}
              className="flex items-center gap-2 bg-surface-50 dark:bg-zinc-950 border border-surface-200 dark:border-zinc-800 rounded-lg h-9 px-3 text-xs font-semibold text-surface-500 dark:text-zinc-400 hover:border-brand-900 transition cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Search ERP...</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 bg-surface-200 dark:bg-zinc-800 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-surface-300 dark:border-zinc-700">
                <Command className="w-2.5 h-2.5" /> K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setThemeMode(themeMode === "light" ? "dark" : "light")}
              className="p-2 border border-surface-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 text-surface-600 dark:text-zinc-300 hover:bg-surface-50 dark:hover:bg-zinc-800 transition cursor-pointer"
              title="Toggle Theme"
            >
              <Sparkles className="w-4 h-4" />
            </button>

            <span className="text-xs sm:text-sm text-surface-600 dark:text-zinc-400 font-medium hidden sm:inline">
              Callsign: <span className="text-brand-900 dark:text-brand-500 font-bold">{username || "Admin"}</span>
            </span>

            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-900 text-xs font-bold text-white hover:bg-brand-800 transition-all cursor-pointer shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main shell Layout */}
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
            {[
              { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
              { id: "org_setup", label: "Organization Setup", icon: Building2 },
              { id: "assets", label: "Assets", icon: Laptop },
              { id: "allocation", label: "Asset Allocation", icon: ArrowRightLeft },
              { id: "booking", label: "Resource Booking", icon: Calendar },
              { id: "maintenance", label: "Maintenance", icon: Wrench },
              { id: "audit", label: "Asset Audit", icon: ClipboardCheck },
              { id: "reports", label: "Reports & Analytics", icon: FileBarChart },
              { id: "notifications", label: "Notifications", icon: Bell },
            ].map(link => {
              const Icon = link.icon;
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => setActiveTab(link.id)}
                  title={link.label}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer overflow-hidden ${
                    isActive
                      ? "bg-brand-900 text-white shadow-md shadow-brand-900/20" 
                      : "text-surface-650 dark:text-zinc-400 hover:bg-surface-100 dark:hover:bg-zinc-800 hover:text-surface-900 dark:hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
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
            ADMIN CONSOLE v4.0
          </div>
        </aside>

        {/* Mobile Drawer Overlay Sidebar */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <aside className="relative w-64 max-w-[80vw] bg-white dark:bg-zinc-900 border-r border-surface-200 dark:border-zinc-800 py-6 flex flex-col justify-between z-10 shadow-2xl">
              <div className="px-4 pb-4 border-b border-surface-200 dark:border-zinc-800 flex justify-between items-center">
                <span className="font-extrabold text-xs uppercase tracking-wider text-surface-900 dark:text-white">Admin Navigation</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-surface-400 hover:text-surface-900 dark:hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="space-y-1 px-3 py-4 flex-grow overflow-y-auto">
                {[
                  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
                  { id: "org_setup", label: "Organization Setup", icon: Building2 },
                  { id: "assets", label: "Assets", icon: Laptop },
                  { id: "allocation", label: "Asset Allocation", icon: ArrowRightLeft },
                  { id: "booking", label: "Resource Booking", icon: Calendar },
                  { id: "maintenance", label: "Maintenance", icon: Wrench },
                  { id: "audit", label: "Asset Audit", icon: ClipboardCheck },
                  { id: "reports", label: "Reports & Analytics", icon: FileBarChart },
                  { id: "notifications", label: "Notifications", icon: Bell },
                ].map(link => {
                  const Icon = link.icon;
                  const isActive = activeTab === link.id;
                  return (
                    <button
                      key={link.id}
                      onClick={() => { setActiveTab(link.id); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                        isActive
                          ? "bg-brand-900 text-white shadow-md shadow-brand-900/20"
                          : "text-surface-650 dark:text-zinc-400 hover:bg-surface-100 dark:hover:bg-zinc-800 hover:text-surface-900 dark:hover:text-white"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {link.label}
                    </button>
                  );
                })}
              </nav>
              <div className="px-6 py-4 border-t border-surface-200 dark:border-zinc-800 text-[10px] text-surface-400 dark:text-zinc-600 font-mono">
                ADMIN CONSOLE v4.0
              </div>
            </aside>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-grow p-4 sm:p-6 lg:p-8 overflow-y-auto min-w-0">
          
          {/* ─── TAB 1: ADMIN DASHBOARD ──────────────────────────────────────── */}
          {activeTab === "dashboard" && (
            <div className="max-w-6xl space-y-8 animate-float">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-surface-900 dark:text-white font-sans uppercase">Admin Overview</h2>
                <p className="text-sm text-surface-600 dark:text-zinc-400 mt-1 font-medium">RBAC Security Console & Resource Directories.</p>
              </div>

              {/* Stats Counters Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-zinc-900 border border-surface-200/80 dark:border-zinc-800/80 hover:border-brand-900/30 rounded-xl p-5 shadow-sm hover:shadow transition-all flex items-center gap-4 h-24">
                  <div className="w-12 h-12 rounded-lg bg-brand-50 dark:bg-brand-950 text-brand-900 dark:text-brand-300 flex items-center justify-center">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-surface-550 dark:text-zinc-500 uppercase tracking-wider">Departments</span>
                    <span className="text-2xl font-extrabold text-surface-900 dark:text-white tracking-tight">{departmentCount}</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-surface-200/80 dark:border-zinc-800/80 hover:border-brand-900/30 rounded-xl p-5 shadow-sm hover:shadow transition-all flex items-center gap-4 h-24">
                  <div className="w-12 h-12 rounded-lg bg-brand-50 dark:bg-brand-950 text-brand-900 dark:text-brand-300 flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-surface-550 dark:text-zinc-500 uppercase tracking-wider">Employees</span>
                    <span className="text-2xl font-extrabold text-surface-900 dark:text-white tracking-tight">{employeeCount}</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-surface-200/80 dark:border-zinc-800/80 hover:border-brand-900/30 rounded-xl p-5 shadow-sm hover:shadow transition-all flex items-center gap-4 h-24">
                  <div className="w-12 h-12 rounded-lg bg-brand-50 dark:bg-brand-950 text-brand-900 dark:text-brand-300 flex items-center justify-center">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-surface-550 dark:text-zinc-500 uppercase tracking-wider">Categories</span>
                    <span className="text-2xl font-extrabold text-surface-900 dark:text-white tracking-tight">{categoryCount}</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-surface-200/80 dark:border-zinc-800/80 hover:border-brand-900/30 rounded-xl p-5 shadow-sm hover:shadow transition-all flex items-center gap-4 h-24">
                  <div className="w-12 h-12 rounded-lg bg-brand-50 dark:bg-brand-950 text-brand-900 dark:text-brand-300 flex items-center justify-center">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-surface-550 dark:text-zinc-500 uppercase tracking-wider">Active Users</span>
                    <span className="text-2xl font-extrabold text-surface-900 dark:text-white tracking-tight">{activeUsersCount}</span>
                  </div>
                </div>
              </div>

              {/* Sub-counters for specific roles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white/60 dark:bg-zinc-900/60 p-4 border border-surface-200 dark:border-zinc-800 rounded-xl text-sm font-semibold flex justify-between items-center shadow-sm">
                  <span className="text-surface-600 dark:text-zinc-400">Department Heads</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800">{deptHeadsCount}</span>
                </div>
                <div className="bg-white/60 dark:bg-zinc-900/60 p-4 border border-surface-200 dark:border-zinc-800 rounded-xl text-sm font-semibold flex justify-between items-center shadow-sm">
                  <span className="text-surface-600 dark:text-zinc-400">Asset Managers</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 font-bold border border-orange-200 dark:border-orange-800">{assetManagersCount}</span>
                </div>
                <div className="bg-white/60 dark:bg-zinc-900/60 p-4 border border-surface-200 dark:border-zinc-800 rounded-xl text-sm font-semibold flex justify-between items-center shadow-sm">
                  <span className="text-surface-600 dark:text-zinc-400">Administrators</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 font-bold border border-red-200 dark:border-red-800">{employees.filter(e => e.role === "Administrator").length}</span>
                </div>
              </div>

              {/* Live Enterprise Analytics Charts Panel */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
                  <DonutChart 
                    title="Assets by Status" 
                    data={[
                      { label: "Available", value: allAssets.filter(a => a.status === "AVAILABLE").length, color: "#16a34a" },
                      { label: "Allocated", value: allAssets.filter(a => a.status === "ALLOCATED").length, color: "#0284c7" },
                      { label: "Reserved", value: allAssets.filter(a => a.status === "RESERVED").length, color: "#8b5cf6" },
                      { label: "Maintenance", value: allAssets.filter(a => a.status === "UNDER_MAINTENANCE").length, color: "#d97706" },
                    ]} 
                  />
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
                  <BarChart 
                    title="Employee Distribution by Dept" 
                    data={departments.length > 0 ? departments.slice(0, 5).map(d => ({ label: d.name, value: d.employeesCount || 0 })) : [{ label: "IT", value: 4 }, { label: "HR", value: 2 }, { label: "Operations", value: 3 }]} 
                  />
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
                  <TrendChart 
                    title="Monthly Asset Registration Trend" 
                    data={[
                      { label: "Nov", value: 12 },
                      { label: "Dec", value: 18 },
                      { label: "Jan", value: 25 },
                      { label: "Feb", value: 34 },
                      { label: "Mar", value: Math.max(allAssets.length, 42) },
                    ]} 
                  />
                </div>
              </div>

              {/* Quick actions & Recent activity panel */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activities list */}
                <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl p-6 space-y-4 shadow-sm">
                  <h3 className="text-lg font-bold text-surface-900 dark:text-white tracking-wide font-sans uppercase">Recent Security Logs</h3>
                  <div className="space-y-3 font-semibold text-sm text-surface-700 dark:text-zinc-300">
                    {activities.map(activity => (
                      <div key={activity.id} className="flex justify-between items-center py-2.5 border-b border-surface-100 dark:border-zinc-800 last:border-b-0">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-brand-900 dark:bg-brand-500" />
                          <span>{activity.text}</span>
                        </div>
                        <span className="text-xs text-surface-400 dark:text-zinc-500 font-mono font-normal shrink-0">{activity.timestamp}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick actions checklist panel */}
                <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl p-6 space-y-4 shadow-sm flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-surface-900 dark:text-white tracking-wide font-sans uppercase">Quick Actions</h3>
                    <p className="text-xs text-surface-550 dark:text-zinc-400 font-medium">Initiate common organizational administrative workflow tickets.</p>
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        setActiveTab("org_setup");
                        setActiveSetupTab("departments");
                        handleOpenCreateDept();
                      }}
                      className="w-full text-left px-4 py-2.5 rounded-lg border border-surface-200 dark:border-zinc-800 hover:border-brand-900 dark:hover:border-brand-500 hover:bg-surface-50 dark:hover:bg-zinc-800 text-xs font-bold text-surface-750 dark:text-zinc-200 flex items-center justify-between transition cursor-pointer"
                    >
                      <span>Create Department</span>
                      <Building2 className="w-4 h-4 text-surface-400" />
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab("org_setup");
                        setActiveSetupTab("categories");
                        handleOpenCreateCategory();
                      }}
                      className="w-full text-left px-4 py-2.5 rounded-lg border border-surface-200 dark:border-zinc-800 hover:border-brand-900 dark:hover:border-brand-500 hover:bg-surface-50 dark:hover:bg-zinc-800 text-xs font-bold text-surface-750 dark:text-zinc-200 flex items-center justify-between transition cursor-pointer"
                    >
                      <span>New Asset Category</span>
                      <Layers className="w-4 h-4 text-surface-400" />
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab("org_setup");
                        setActiveSetupTab("employees");
                        showToast("Search directory below to assign roles", "info");
                      }}
                      className="w-full text-left px-4 py-2.5 rounded-lg border border-surface-200 dark:border-zinc-800 hover:border-brand-900 dark:hover:border-brand-500 hover:bg-surface-50 dark:hover:bg-zinc-800 text-xs font-bold text-surface-750 dark:text-zinc-200 flex items-center justify-between transition cursor-pointer"
                    >
                      <span>Assign User Role</span>
                      <UserCheck className="w-4 h-4 text-surface-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 2: ORGANIZATION SETUP ────────────────────────────────────── */}
          {activeTab === "org_setup" && (
            <div className="max-w-6xl space-y-8 animate-float">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-surface-900 dark:text-white font-sans uppercase">Organization Setup</h2>
                <p className="text-sm text-surface-600 dark:text-zinc-400 mt-1 font-medium">Admin configurations for hierarchy nodes, categories, and directories.</p>
              </div>

              {/* Layout subtabs selector */}
              <div className="flex flex-wrap gap-2 border-b border-surface-200 dark:border-zinc-800 pb-3">
                <button
                  onClick={() => setActiveSetupTab("info")}
                  className={`px-4 py-2 rounded-lg text-sm font-bold cursor-pointer transition-colors ${activeSetupTab === "info" ? "bg-brand-900 text-white shadow-sm" : "bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 text-surface-700 dark:text-zinc-300 hover:bg-surface-50 dark:hover:bg-zinc-800"}`}
                >
                  Organization Information
                </button>
                <button
                  onClick={() => setActiveSetupTab("departments")}
                  className={`px-4 py-2 rounded-lg text-sm font-bold cursor-pointer transition-colors ${activeSetupTab === "departments" ? "bg-brand-900 text-white shadow-sm" : "bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 text-surface-700 dark:text-zinc-300 hover:bg-surface-50 dark:hover:bg-zinc-800"}`}
                >
                  Departments
                </button>
                <button
                  onClick={() => setActiveSetupTab("categories")}
                  className={`px-4 py-2 rounded-lg text-sm font-bold cursor-pointer transition-colors ${activeSetupTab === "categories" ? "bg-brand-900 text-white shadow-sm" : "bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 text-surface-700 dark:text-zinc-300 hover:bg-surface-50 dark:hover:bg-zinc-800"}`}
                >
                  Asset Categories
                </button>
                <button
                  onClick={() => setActiveSetupTab("employees")}
                  className={`px-4 py-2 rounded-lg text-sm font-bold cursor-pointer transition-colors ${activeSetupTab === "employees" ? "bg-brand-900 text-white shadow-sm" : "bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 text-surface-700 dark:text-zinc-300 hover:bg-surface-50 dark:hover:bg-zinc-800"}`}
                >
                  Employee Management
                </button>
              </div>

              {/* SUB-VIEW 0: ORGANIZATION INFORMATION */}
              {activeSetupTab === "info" && (
                <div className="space-y-6">
                  <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-6">
                    <div className="flex justify-between items-center border-b border-surface-150 dark:border-zinc-800 pb-4">
                      <div>
                        <h3 className="text-lg font-bold text-surface-900 dark:text-white uppercase tracking-wide">Company Configuration Center</h3>
                        <p className="text-xs text-surface-550 dark:text-zinc-400 font-medium">Enterprise profile, domain, and administrative settings.</p>
                      </div>
                      <span className="px-3 py-1 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 text-xs font-extrabold rounded-full border border-green-200 dark:border-green-800 uppercase tracking-wider">
                        Enterprise Active
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs font-semibold">
                      <div className="p-4 bg-surface-50 dark:bg-zinc-950 rounded-xl border border-surface-200 dark:border-zinc-800 space-y-1">
                        <span className="text-[10px] text-surface-400 dark:text-zinc-500 uppercase font-extrabold tracking-wider block">Organization Name</span>
                        <span className="text-sm font-bold text-surface-900 dark:text-white">{orgData?.name || "AssetFlow Enterprise"}</span>
                      </div>
                      <div className="p-4 bg-surface-50 dark:bg-zinc-950 rounded-xl border border-surface-200 dark:border-zinc-800 space-y-1">
                        <span className="text-[10px] text-surface-400 dark:text-zinc-500 uppercase font-extrabold tracking-wider block">Portal Slug / Domain</span>
                        <span className="text-sm font-mono font-bold text-brand-900 dark:text-brand-400">{orgData?.slug || "enterprise"}</span>
                      </div>
                      <div className="p-4 bg-surface-50 dark:bg-zinc-950 rounded-xl border border-surface-200 dark:border-zinc-800 space-y-1">
                        <span className="text-[10px] text-surface-400 dark:text-zinc-500 uppercase font-extrabold tracking-wider block">Industry</span>
                        <span className="text-sm font-bold text-surface-900 dark:text-white">{orgData?.industry || "Technology & Operations"}</span>
                      </div>
                      <div className="p-4 bg-surface-50 dark:bg-zinc-950 rounded-xl border border-surface-200 dark:border-zinc-800 space-y-1">
                        <span className="text-[10px] text-surface-400 dark:text-zinc-500 uppercase font-extrabold tracking-wider block">Company Size</span>
                        <span className="text-sm font-bold text-surface-900 dark:text-white">{orgData?.companySize || "50-250 Employees"}</span>
                      </div>
                      <div className="p-4 bg-surface-50 dark:bg-zinc-950 rounded-xl border border-surface-200 dark:border-zinc-800 space-y-1">
                        <span className="text-[10px] text-surface-400 dark:text-zinc-500 uppercase font-extrabold tracking-wider block">Default Timezone</span>
                        <span className="text-sm font-bold text-surface-900 dark:text-white">{orgData?.timezone || "UTC"}</span>
                      </div>
                      <div className="p-4 bg-surface-50 dark:bg-zinc-950 rounded-xl border border-surface-200 dark:border-zinc-800 space-y-1">
                        <span className="text-[10px] text-surface-400 dark:text-zinc-500 uppercase font-extrabold tracking-wider block">Currency</span>
                        <span className="text-sm font-bold text-surface-900 dark:text-white">{orgData?.currency || "USD ($)"}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                      <div className="p-4 border border-surface-200 dark:border-zinc-800 rounded-xl bg-white/40 dark:bg-zinc-900/40 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-surface-500 dark:text-zinc-400 block uppercase">Departments</span>
                          <span className="text-xl font-extrabold text-surface-900 dark:text-white">{departmentCount}</span>
                        </div>
                        <Building2 className="w-6 h-6 text-brand-900 dark:text-brand-400" />
                      </div>
                      <div className="p-4 border border-surface-200 dark:border-zinc-800 rounded-xl bg-white/40 dark:bg-zinc-900/40 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-surface-500 dark:text-zinc-400 block uppercase">Asset Categories</span>
                          <span className="text-xl font-extrabold text-surface-900 dark:text-white">{categoryCount}</span>
                        </div>
                        <Layers className="w-6 h-6 text-brand-900 dark:text-brand-400" />
                      </div>
                      <div className="p-4 border border-surface-200 dark:border-zinc-800 rounded-xl bg-white/40 dark:bg-zinc-900/40 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-surface-500 dark:text-zinc-400 block uppercase">Active Employees</span>
                          <span className="text-xl font-extrabold text-surface-900 dark:text-white">{employeeCount}</span>
                        </div>
                        <Users className="w-6 h-6 text-brand-900 dark:text-brand-400" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-VIEW 1: DEPARTMENT MANAGEMENT */}
              {activeSetupTab === "departments" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Table Panel */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-base font-bold text-surface-900 dark:text-white uppercase tracking-wider">Active Departments</h3>
                      <button
                        onClick={handleOpenCreateDept}
                        className="px-4 py-2 rounded-lg text-xs font-bold bg-brand-900 hover:bg-brand-800 text-white cursor-pointer transition shadow"
                      >
                        Create Department
                      </button>
                    </div>

                    {departments.length === 0 ? (
                      <div className="p-12 border border-dashed border-surface-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 text-center space-y-4">
                        <Building2 className="w-12 h-12 text-surface-300 mx-auto" />
                        <h4 className="font-bold text-surface-900 dark:text-white uppercase">No departments created yet.</h4>
                        <button
                          onClick={handleOpenCreateDept}
                          className="px-4 py-2 rounded-lg bg-brand-900 text-white text-xs font-bold hover:bg-brand-800 cursor-pointer"
                        >
                          Create Department
                        </button>
                      </div>
                    ) : (
                      <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-surface-50 dark:bg-zinc-950 border-b border-surface-200 dark:border-zinc-850 text-surface-700 dark:text-zinc-400 font-bold uppercase tracking-wider">
                              <th className="p-3">Department Name</th>
                              <th className="p-3">Department Head</th>
                              <th className="p-3">Parent Dept</th>
                              <th className="p-3">Employees</th>
                              <th className="p-3">Status</th>
                              <th className="p-3 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-150 dark:divide-zinc-800 font-semibold text-surface-850 dark:text-zinc-200">
                            {departments.map((dept, idx) => (
                              <tr key={idx} className="hover:bg-surface-50/50 dark:hover:bg-zinc-900/50">
                                <td className="p-3">{dept.name}</td>
                                <td className="p-3 text-surface-600 dark:text-zinc-400">{dept.head}</td>
                                <td className="p-3 text-surface-600 dark:text-zinc-400">{dept.parent}</td>
                                <td className="p-3 text-center">{dept.employeesCount}</td>
                                <td className="p-3">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    dept.status === "Active" 
                                      ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800" 
                                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                                  }`}>
                                    {dept.status}
                                  </span>
                                </td>
                                <td className="p-3 flex justify-center gap-2">
                                  <button
                                    onClick={() => setViewEntityData({
                                      title: `${dept.name} Department`,
                                      fields: {
                                        "Head of Department": dept.head,
                                        "Parent Node": dept.parent,
                                        "Active Employee Count": dept.employeesCount,
                                        "Status Config": dept.status,
                                        "Created At": dept.createdDate,
                                        "Description Notes": dept.description || "No description logged"
                                      }
                                    })}
                                    className="p-1 border border-surface-200 dark:border-zinc-800 hover:border-brand-900 dark:hover:border-brand-500 rounded bg-white dark:bg-zinc-900 text-surface-500 dark:text-zinc-400 hover:text-brand-900 dark:hover:text-brand-400 cursor-pointer"
                                    title="View"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenEditDept(dept)}
                                    className="p-1 border border-surface-200 dark:border-zinc-800 hover:border-brand-900 dark:hover:border-brand-500 rounded bg-white dark:bg-zinc-900 text-surface-500 dark:text-zinc-400 hover:text-brand-900 dark:hover:text-brand-400 cursor-pointer"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleToggleDeptStatus(dept.name)}
                                    className="p-1 border border-surface-200 dark:border-zinc-800 hover:border-red-500 rounded bg-white dark:bg-zinc-900 text-surface-500 dark:text-zinc-400 hover:text-red-655 cursor-pointer"
                                    title={dept.status === "Active" ? "Deactivate" : "Activate"}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Right Hierarchy Visualizer Card */}
                  <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
                    <h3 className="text-xs font-bold text-surface-650 dark:text-zinc-400 uppercase tracking-wider border-b border-surface-150 dark:border-zinc-800 pb-2">Organizational tree</h3>
                    
                    <div className="space-y-4 text-xs font-semibold text-surface-800 dark:text-zinc-200 font-sans">
                      <div className="p-3 rounded-lg bg-brand-50 dark:bg-brand-950 text-brand-900 dark:text-brand-300 font-bold border border-brand-200 dark:border-brand-800">
                        🏢 Company Root
                      </div>

                      {departments.length === 0 ? (
                        <p className="text-surface-400 text-[11px] ml-4">No departments to display.</p>
                      ) : (
                        <div className="ml-4 space-y-4">
                          <div className="border-l-2 border-brand-900/20 pl-4 py-1 space-y-3">
                            {departments.filter(d => d.parent === "--").map(rootDept => (
                              <div key={rootDept.id || rootDept.name}>
                                <div className="relative">
                                  <span className="absolute -left-[17px] top-2.5 w-3 h-0.5 bg-brand-900/20" />
                                  <div className="p-2.5 rounded-lg border border-surface-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex items-center justify-between">
                                    <span className="font-bold text-surface-900 dark:text-white">{rootDept.name}</span>
                                    <span className="text-[10px] text-surface-500 font-mono">Head: {rootDept.head}</span>
                                  </div>
                                </div>

                                {departments.filter(c => c.parent === rootDept.name).length > 0 && (
                                  <div className="ml-6 border-l-2 border-brand-900/20 pl-4 space-y-3 mt-3">
                                    {departments.filter(c => c.parent === rootDept.name).map(child => (
                                      <div key={child.id || child.name} className="relative">
                                        <span className="absolute -left-[17px] top-2.5 w-3 h-0.5 bg-brand-900/20" />
                                        <div className="p-2 rounded-md bg-surface-50 dark:bg-zinc-950 text-surface-650 dark:text-zinc-400 border border-surface-200 dark:border-zinc-850 flex justify-between items-center">
                                          <span>{child.name}</span>
                                          <span className="text-[9px] text-surface-450">{child.head}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-VIEW 2: ASSET CATEGORY MANAGEMENT */}
              {activeSetupTab === "categories" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-base font-bold text-surface-900 dark:text-white uppercase tracking-wider">Asset Categories</h3>
                    <button
                      onClick={handleOpenCreateCategory}
                      className="px-4 py-2 rounded-lg text-xs font-bold bg-brand-900 hover:bg-brand-800 text-white cursor-pointer transition shadow"
                    >
                      New Category
                    </button>
                  </div>

                  {categories.length === 0 ? (
                    <div className="p-12 border border-dashed border-surface-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 text-center space-y-4 animate-float">
                      <Layers className="w-12 h-12 text-surface-300 mx-auto" />
                      <h4 className="font-bold text-surface-900 dark:text-white uppercase">No categories created yet.</h4>
                      <button
                        onClick={handleOpenCreateCategory}
                        className="px-4 py-2 rounded-lg bg-brand-900 text-white text-xs font-bold hover:bg-brand-800 cursor-pointer"
                      >
                        New Category
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categories.map((cat, idx) => (
                        <div
                          key={idx}
                          className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm hover:shadow transition-all space-y-4"
                        >
                          <div className="flex justify-between items-start">
                            <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-950 text-brand-900 dark:text-brand-300 flex items-center justify-center font-bold">
                              <Laptop className="w-5 h-5" />
                            </div>
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              cat.status === "Active" 
                                ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800" 
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                            }`}>
                              {cat.status}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <h4 className="font-bold text-surface-900 dark:text-white text-sm">{cat.name}</h4>
                            <p className="text-xs text-surface-550 dark:text-zinc-400 leading-relaxed h-12 overflow-hidden">{cat.description}</p>
                          </div>

                          <div className="pt-2 border-t border-surface-150 dark:border-zinc-800 flex justify-between items-center text-xs">
                            <span className="font-bold text-surface-700 dark:text-zinc-300">
                              Assets Count: <span className="text-brand-900 dark:text-brand-400 font-extrabold">{cat.assetsCount}</span>
                            </span>

                            <div className="flex gap-2">
                              <button
                                onClick={() => handleOpenEditCategory(cat)}
                                className="p-1 border border-surface-200 dark:border-zinc-800 hover:border-brand-900 rounded bg-white dark:bg-zinc-900 text-surface-550 dark:text-zinc-400 hover:text-brand-900 cursor-pointer"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SUB-VIEW 3: EMPLOYEE MANAGEMENT MODULE */}
              {activeSetupTab === "employees" && (
                <div className="space-y-6">
                  {/* Header bar with ADD EMPLOYEE button */}
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-surface-900 dark:text-white uppercase tracking-wider">Employee Management</h3>
                      <p className="text-xs text-surface-550 dark:text-zinc-400 font-medium">Create employee accounts, manage RBAC privileges, lock/unlock accounts, and reset passwords.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setExportPayload({
                            title: 'Employee Directory Report',
                            headers: ['Name', 'Email', 'Employee ID', 'Department', 'Designation', 'Role', 'Status'],
                            rows: employees.map(e => [e.name, e.email, (e as any).employeeId || e.id, typeof e.department === 'string' ? e.department : (e.department as any)?.name || 'Unassigned', (e as any).designation || '--', e.role || 'Employee', e.status || 'Active']),
                            orgName: orgData?.name,
                            generatedBy: username || 'Admin'
                          });
                          setShowExportModal(true);
                        }}
                        className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-zinc-900 border border-surface-300 dark:border-zinc-700 text-surface-800 dark:text-zinc-200 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-surface-50 transition"
                      >
                        <Download className="w-4 h-4" />
                        Export
                      </button>
                      <button
                        onClick={handleOpenAddEmployee}
                        className="flex items-center gap-2 px-4 py-2.5 bg-brand-900 hover:bg-brand-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md shadow-brand-900/20 transition"
                      >
                        <UserPlus className="w-4 h-4" />
                        Add Employee
                      </button>
                    </div>
                  </div>

                  {/* Search and Filters Bar */}
                  <div className="flex flex-wrap gap-4 bg-white/60 dark:bg-zinc-900/60 p-4 border border-surface-200 dark:border-zinc-800 rounded-xl shadow-sm">
                    {/* Search Field */}
                    <div className="flex-grow min-w-[240px] relative">
                      <Search className="w-4 h-4 text-surface-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search by Name, Email, Employee ID..."
                        value={empSearchQuery}
                        onChange={e => { setEmpSearchQuery(e.target.value); setEmpPage(1); }}
                        className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-850 rounded-lg h-9 pl-9 pr-4 text-xs font-semibold focus:border-brand-900 dark:focus:border-brand-500 outline-none text-surface-900 dark:text-zinc-100"
                      />
                    </div>

                    {/* Department Filter */}
                    <select
                      value={empFilterDept}
                      onChange={e => { setEmpFilterDept(e.target.value); setEmpPage(1); }}
                      className="bg-white dark:bg-zinc-900 border border-surface-300 dark:border-zinc-800 rounded-lg px-3 h-9 text-xs font-bold focus:border-brand-900 outline-none text-surface-700 dark:text-zinc-300"
                    >
                      <option value="All">All Departments</option>
                      {departments.map(d => <option key={d.id || d.name} value={d.name}>{d.name}</option>)}
                    </select>

                    {/* Role Filter */}
                    <select
                      value={empFilterRole}
                      onChange={e => { setEmpFilterRole(e.target.value); setEmpPage(1); }}
                      className="bg-white dark:bg-zinc-900 border border-surface-300 dark:border-zinc-800 rounded-lg px-3 h-9 text-xs font-bold focus:border-brand-900 outline-none text-surface-700 dark:text-zinc-300"
                    >
                      <option value="All">All Roles</option>
                      <option value="Employee">Employee</option>
                      <option value="Department Head">Department Head</option>
                      <option value="Asset Manager">Asset Manager</option>
                      <option value="Administrator">Administrator</option>
                    </select>

                    {/* Status Filter */}
                    <select
                      value={empFilterStatus}
                      onChange={e => { setEmpFilterStatus(e.target.value); setEmpPage(1); }}
                      className="bg-white dark:bg-zinc-900 border border-surface-300 dark:border-zinc-800 rounded-lg px-3 h-9 text-xs font-bold focus:border-brand-900 outline-none text-surface-700 dark:text-zinc-300"
                    >
                      <option value="All">All Statuses</option>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="LOCKED">Locked</option>
                    </select>
                  </div>

                  {/* Employees Management Table */}
                  <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl overflow-x-auto w-full shadow-sm">
                    {managedEmployees.length === 0 ? (
                      <div className="p-12 text-center space-y-4">
                        <Users className="w-12 h-12 text-surface-300 mx-auto" />
                        <h4 className="font-bold text-surface-900 dark:text-white uppercase">No employees found.</h4>
                        <p className="text-xs text-surface-500">Click "Add Employee" above to onboarding new team members.</p>
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-surface-50 dark:bg-zinc-950 border-b border-surface-200 dark:border-zinc-850 text-surface-700 dark:text-zinc-400 font-bold uppercase tracking-wider">
                            <th className="p-3">Avatar</th>
                            <th className="p-3">Employee Name</th>
                            <th className="p-3">Email / ID</th>
                            <th className="p-3">Department & Job Title</th>
                            <th className="p-3">Role Privilege</th>
                            <th className="p-3">Account Status</th>
                            <th className="p-3">Last Login</th>
                            <th className="p-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-150 dark:divide-zinc-800 font-semibold text-surface-850 dark:text-zinc-200">
                          {managedEmployees.map((emp) => {
                            const empRole = mapRole(emp.role?.name || emp.roleName || emp.role || "Employee");
                            const isLocked = emp.isLocked || false;
                            const isActive = emp.status === "ACTIVE" || emp.status === "Active";
                            return (
                              <tr key={emp.id} className="hover:bg-surface-50/50 dark:hover:bg-zinc-900/50">
                                <td className="p-3">
                                  <img src={emp.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(emp.name || emp.id)}`} alt={emp.name} className="w-8 h-8 rounded-full bg-surface-100 dark:bg-zinc-800 border border-surface-200 dark:border-zinc-700" />
                                </td>
                                <td className="p-3 font-bold text-surface-900 dark:text-white">
                                  {emp.name}
                                </td>
                                <td className="p-3">
                                  <div className="font-mono text-[10px] text-surface-600 dark:text-zinc-400">{emp.email}</div>
                                  {emp.employeeId && <div className="text-[9px] font-bold text-brand-900 dark:text-brand-400 uppercase">{emp.employeeId}</div>}
                                </td>
                                <td className="p-3 text-surface-600 dark:text-zinc-400">
                                  <div>{emp.department?.name || emp.department || "Unassigned"}</div>
                                  {emp.designation && <div className="text-[10px] font-normal text-surface-450">{emp.designation}</div>}
                                </td>
                                <td className="p-3">
                                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
                                    empRole === "Employee" ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-250 dark:border-zinc-700" :
                                    empRole === "Department Head" ? "bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200" :
                                    empRole === "Asset Manager" ? "bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border border-orange-200" :
                                    "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200"
                                  }`}>
                                    {empRole}
                                  </span>
                                </td>
                                <td className="p-3">
                                  {isLocked ? (
                                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200">
                                      Locked
                                    </span>
                                  ) : (
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                      isActive 
                                        ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200" 
                                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-400 border border-zinc-200"
                                    }`}>
                                      {isActive ? "Active" : "Inactive"}
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-surface-550 dark:text-zinc-500 font-mono text-[10px]">
                                  {(emp.lastLoginAt || emp.lastLogin) ? timeAgo(emp.lastLoginAt || emp.lastLogin) : "--"}
                                </td>
                                <td className="p-3 flex justify-center gap-1.5">
                                  {/* View Profile */}
                                  <button
                                    onClick={() => setViewEntityData({
                                      title: `${emp.name} Profile`,
                                      fields: {
                                        "Employee ID": emp.employeeId || emp.id,
                                        "Full Name": emp.name,
                                        "System Email": emp.email,
                                        "Department": emp.department?.name || emp.department || "Unassigned",
                                        "Designation": emp.designation || "Not set",
                                        "Role Privilege": empRole,
                                        "Account Status": isLocked ? "LOCKED" : (isActive ? "ACTIVE" : "INACTIVE"),
                                        "Employment Type": emp.employmentType || "full-time",
                                        "Joining Date": emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : "Not set",
                                        "Last Login": (emp.lastLoginAt || emp.lastLogin) ? timeAgo(emp.lastLoginAt || emp.lastLogin) : "Never logged in"
                                      }
                                    })}
                                    className="p-1.5 border border-surface-200 dark:border-zinc-800 hover:border-brand-900 rounded bg-white dark:bg-zinc-900 text-surface-550 dark:text-zinc-400 hover:text-brand-900 cursor-pointer"
                                    title="View Details"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Edit Employee */}
                                  <button
                                    onClick={() => handleOpenEditEmployee(emp)}
                                    className="p-1.5 border border-surface-200 dark:border-zinc-800 hover:border-brand-900 rounded bg-white dark:bg-zinc-900 text-surface-550 dark:text-zinc-400 hover:text-brand-900 cursor-pointer"
                                    title="Edit Employee"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Toggle Status (Activate / Deactivate) */}
                                  <button
                                    onClick={() => handleToggleManagedEmpStatus(emp.id)}
                                    className="p-1.5 border border-surface-200 dark:border-zinc-800 hover:border-brand-900 rounded bg-white dark:bg-zinc-900 text-surface-550 dark:text-zinc-400 hover:text-brand-900 cursor-pointer"
                                    title={isActive ? "Deactivate Account" : "Activate Account"}
                                  >
                                    <CheckCircle className={`w-3.5 h-3.5 ${isActive ? "text-green-600" : "text-zinc-400"}`} />
                                  </button>

                                  {/* Lock / Unlock */}
                                  <button
                                    onClick={() => handleToggleLockEmployee(emp.id, emp.name)}
                                    className="p-1.5 border border-surface-200 dark:border-zinc-800 hover:border-amber-500 rounded bg-white dark:bg-zinc-900 text-surface-550 dark:text-zinc-400 hover:text-amber-600 cursor-pointer"
                                    title={isLocked ? "Unlock Account" : "Lock Account"}
                                  >
                                    <ShieldAlert className={`w-3.5 h-3.5 ${isLocked ? "text-red-600" : "text-amber-500"}`} />
                                  </button>

                                  {/* Reset Password */}
                                  <button
                                    onClick={() => handleOpenResetPassword(emp)}
                                    className="p-1.5 border border-surface-200 dark:border-zinc-800 hover:border-brand-900 rounded bg-white dark:bg-zinc-900 text-surface-550 dark:text-zinc-400 hover:text-brand-900 cursor-pointer"
                                    title="Reset Password & Resend Credentials"
                                  >
                                    <KeyRound className="w-3.5 h-3.5 text-brand-900 dark:text-brand-400" />
                                  </button>

                                  {/* Resend Welcome Email */}
                                  <button
                                    onClick={() => handleResendWelcomeEmail(emp.id, emp.name)}
                                    className="p-1.5 border border-surface-200 dark:border-zinc-800 hover:border-blue-500 rounded bg-white dark:bg-zinc-900 text-surface-550 dark:text-zinc-400 hover:text-blue-600 cursor-pointer"
                                    title="Resend Welcome Email & Temp Password"
                                  >
                                    <Send className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                  </button>

                                  {/* Delete */}
                                  <button
                                    onClick={() => handleDeleteManagedEmployee(emp.id, emp.name)}
                                    className="p-1.5 border border-surface-200 dark:border-zinc-800 hover:border-red-500 rounded bg-white dark:bg-zinc-900 text-surface-550 dark:text-zinc-400 hover:text-red-600 cursor-pointer"
                                    title="Soft Delete Employee"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}

                    {/* Pagination Bar */}
                    {empTotalPages > 1 && (
                      <div className="p-3 border-t border-surface-200 dark:border-zinc-800 flex justify-between items-center bg-surface-50 dark:bg-zinc-950 text-xs font-semibold">
                        <span className="text-surface-550 dark:text-zinc-400">
                          Showing Page <strong className="text-surface-900 dark:text-white">{empPage}</strong> of {empTotalPages} ({empTotalCount} total employees)
                        </span>
                        <div className="flex gap-2">
                          <button
                            disabled={empPage <= 1}
                            onClick={() => setEmpPage(p => p - 1)}
                            className="px-3 py-1.5 border border-surface-300 dark:border-zinc-800 rounded bg-white dark:bg-zinc-900 disabled:opacity-50 font-bold cursor-pointer"
                          >
                            <ChevronLeft className="w-4 h-4 inline" /> Prev
                          </button>
                          <button
                            disabled={empPage >= empTotalPages}
                            onClick={() => setEmpPage(p => p + 1)}
                            className="px-3 py-1.5 border border-surface-300 dark:border-zinc-800 rounded bg-white dark:bg-zinc-900 disabled:opacity-50 font-bold cursor-pointer"
                          >
                            Next <ChevronRight className="w-4 h-4 inline" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}



          {/* ─── TAB 3: ASSETS ──────────────────────────────────────────────── */}
          {activeTab === "assets" && (
            <div className="max-w-6xl space-y-6 animate-float">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-surface-900 dark:text-white font-sans uppercase">Asset Registry</h2>
                  <p className="text-sm text-surface-600 dark:text-zinc-400 mt-1 font-medium">Manage all organizational assets. Track status, allocations, locations, and lifecycle.</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button 
                    onClick={handleOpenRegisterAssetModal} 
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold bg-brand-900 hover:bg-brand-800 text-white cursor-pointer transition shadow flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Register Asset
                  </button>
                  <button 
                    onClick={() => { loadAllAssets(); }} 
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-surface-200 dark:bg-zinc-800 hover:bg-surface-300 dark:hover:bg-zinc-700 text-surface-800 dark:text-zinc-200 cursor-pointer transition shadow flex items-center gap-2"
                  >
                    <Laptop className="w-4 h-4" /> Refresh
                  </button>
                </div>
              </div>

              {/* Filters Toolbar */}
              <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="relative w-full md:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-surface-400 dark:text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search tag, name, serial, location..."
                    value={assetSearchQuery}
                    onChange={e => { setAssetSearchQuery(e.target.value); setAssetPage(1); }}
                    className="w-full bg-surface-50 dark:bg-zinc-950 border border-surface-200 dark:border-zinc-800 rounded-lg h-9 pl-9 pr-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                  {/* Category Filter */}
                  <select
                    value={assetCategoryFilter}
                    onChange={e => { setAssetCategoryFilter(e.target.value); setAssetPage(1); }}
                    className="bg-surface-50 dark:bg-zinc-950 border border-surface-200 dark:border-zinc-800 rounded-lg h-9 px-3 text-xs font-bold text-surface-700 dark:text-zinc-300 outline-none cursor-pointer"
                  >
                    <option value="All">All Categories</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>

                  {/* Department Filter */}
                  <select
                    value={assetDepartmentFilter}
                    onChange={e => { setAssetDepartmentFilter(e.target.value); setAssetPage(1); }}
                    className="bg-surface-50 dark:bg-zinc-950 border border-surface-200 dark:border-zinc-800 rounded-lg h-9 px-3 text-xs font-bold text-surface-700 dark:text-zinc-300 outline-none cursor-pointer"
                  >
                    <option value="All">All Departments</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>

                  {/* Status Filter */}
                  <select
                    value={assetStatusFilter}
                    onChange={e => { setAssetStatusFilter(e.target.value); setAssetPage(1); }}
                    className="bg-surface-50 dark:bg-zinc-950 border border-surface-200 dark:border-zinc-800 rounded-lg h-9 px-3 text-xs font-bold text-surface-700 dark:text-zinc-300 outline-none cursor-pointer"
                  >
                    <option value="All">All Statuses</option>
                    <option value="AVAILABLE">Available</option>
                    <option value="ALLOCATED">Allocated</option>
                    <option value="RESERVED">Reserved</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="DISPOSED">Disposed</option>
                    <option value="LOST">Lost</option>
                    <option value="RETIRED">Retired</option>
                  </select>
                </div>
              </div>

              {loadingState.assets ? (
                <SkeletonTable rows={6} cols={8} />
              ) : errorState.assets ? (
                <ErrorState message={errorState.assets} onRetry={loadAllAssets} />
              ) : (
                (() => {
                  const filteredAssets = allAssets.filter((a: any) => {
                    const q = assetSearchQuery.trim().toLowerCase();
                    const matchesSearch = !q || 
                      (a.name && a.name.toLowerCase().includes(q)) ||
                      (a.tag && a.tag.toLowerCase().includes(q)) ||
                      (a.serialNumber && a.serialNumber.toLowerCase().includes(q)) ||
                      (a.location && a.location.toLowerCase().includes(q));

                    const matchesCategory = assetCategoryFilter === "All" || a.categoryId === assetCategoryFilter || a.category?.name === assetCategoryFilter;
                    const matchesDept = assetDepartmentFilter === "All" || a.departmentId === assetDepartmentFilter || a.department?.name === assetDepartmentFilter;
                    const matchesStatus = assetStatusFilter === "All" || a.status === assetStatusFilter;

                    return matchesSearch && matchesCategory && matchesDept && matchesStatus;
                  });

                  const totalAssetPages = Math.ceil(filteredAssets.length / assetsPerPage) || 1;
                  const paginatedAssets = filteredAssets.slice((assetPage - 1) * assetsPerPage, assetPage * assetsPerPage);

                  if (filteredAssets.length === 0) {
                    return (
                      <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl p-8 text-center space-y-3 shadow-sm">
                        <Laptop className="w-10 h-10 text-surface-400 dark:text-zinc-600 mx-auto" />
                        <h4 className="font-extrabold text-sm uppercase text-surface-900 dark:text-white">No Assets Found</h4>
                        <p className="text-xs text-surface-550 dark:text-zinc-400 font-medium">No assets matching your search query and filters exist in the registry.</p>
                        <button
                          onClick={handleOpenRegisterAssetModal}
                          className="px-4 py-2 bg-brand-900 hover:bg-brand-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer shadow inline-flex items-center gap-2 mt-2"
                        >
                          <Plus className="w-4 h-4" /> Register New Asset
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-surface-200 dark:border-zinc-800 bg-surface-50 dark:bg-zinc-950 text-[10px] text-surface-500 dark:text-zinc-500 font-bold uppercase tracking-wider">
                                <th className="p-3 text-left">Asset Code</th>
                                <th className="p-3 text-left">Name</th>
                                <th className="p-3 text-left">Category</th>
                                <th className="p-3 text-left">Department</th>
                                <th className="p-3 text-left">Status</th>
                                <th className="p-3 text-left">Location</th>
                                <th className="p-3 text-left">Serial #</th>
                                <th className="p-3 text-left">Purchase Date</th>
                                <th className="p-3 text-center">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-150 dark:divide-zinc-800 font-semibold text-surface-850 dark:text-zinc-200">
                              {paginatedAssets.map((a: any) => (
                                <tr key={a.id} className="hover:bg-surface-50/50 dark:hover:bg-zinc-900/50 transition">
                                  <td className="p-3 font-mono text-brand-900 dark:text-brand-300 font-bold">{a.tag}</td>
                                  <td className="p-3 font-bold text-surface-900 dark:text-white">
                                    {a.name}
                                    {a.model && <span className="block text-[10px] font-normal text-surface-500 dark:text-zinc-400">{a.model}</span>}
                                  </td>
                                  <td className="p-3 text-surface-600 dark:text-zinc-400">{a.category?.name || "--"}</td>
                                  <td className="p-3 text-surface-600 dark:text-zinc-400">{a.department?.name || "--"}</td>
                                  <td className="p-3">
                                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
                                      a.status === "AVAILABLE" ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800" :
                                      a.status === "ALLOCATED" ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800" :
                                      a.status === "RESERVED" ? "bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800" :
                                      a.status === "MAINTENANCE" ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800" :
                                      "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                                    }`}>{a.status}</span>
                                  </td>
                                  <td className="p-3 text-surface-600 dark:text-zinc-400 text-[11px]">{a.location || "--"}</td>
                                  <td className="p-3 font-mono text-[10px] text-surface-500 dark:text-zinc-500">{a.serialNumber || "--"}</td>
                                  <td className="p-3 text-surface-500 dark:text-zinc-500 text-[10px]">{a.purchaseDate ? new Date(a.purchaseDate).toLocaleDateString() : "--"}</td>
                                  <td className="p-3 text-center">
                                    <button
                                      onClick={() => handleOpenAssetDetail(a)}
                                      className="p-1.5 bg-surface-100 dark:bg-zinc-800 hover:bg-surface-200 dark:hover:bg-zinc-700 text-surface-700 dark:text-zinc-300 rounded cursor-pointer transition"
                                      title="View Asset Details & History"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Pagination Bar */}
                      {totalAssetPages > 1 && (
                        <div className="flex justify-between items-center px-2 text-xs font-semibold text-surface-600 dark:text-zinc-400">
                          <div>
                            Showing {((assetPage - 1) * assetsPerPage) + 1} to {Math.min(assetPage * assetsPerPage, filteredAssets.length)} of {filteredAssets.length} assets
                          </div>
                          <div className="flex gap-2">
                            <button
                              disabled={assetPage <= 1}
                              onClick={() => setAssetPage(p => p - 1)}
                              className="px-3 py-1.5 border border-surface-300 dark:border-zinc-800 rounded bg-white dark:bg-zinc-900 disabled:opacity-50 font-bold cursor-pointer"
                            >
                              <ChevronLeft className="w-4 h-4 inline" /> Prev
                            </button>
                            <span className="px-3 py-1.5 font-mono font-bold text-surface-900 dark:text-white">
                              Page {assetPage} of {totalAssetPages}
                            </span>
                            <button
                              disabled={assetPage >= totalAssetPages}
                              onClick={() => setAssetPage(p => p + 1)}
                              className="px-3 py-1.5 border border-surface-300 dark:border-zinc-800 rounded bg-white dark:bg-zinc-900 disabled:opacity-50 font-bold cursor-pointer"
                            >
                              Next <ChevronRight className="w-4 h-4 inline" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {/* ─── TAB 4: ASSET ALLOCATION & REQUESTS ──────────────────────────── */}
          {activeTab === "allocation" && (
            <div className="max-w-6xl space-y-8 animate-float">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-surface-900 dark:text-white font-sans uppercase">Asset Allocation & Requests</h2>
                  <p className="text-sm text-surface-600 dark:text-zinc-400 mt-1 font-medium">Allocate assets directly to employees and manage pending asset requests.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleOpenAllocateModal} className="px-4 py-2 rounded-lg text-xs font-bold bg-brand-900 hover:bg-brand-800 text-white cursor-pointer transition shadow flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Allocate Asset
                  </button>
                  <button onClick={loadAllAllocations} className="px-4 py-2 rounded-lg text-xs font-bold bg-surface-200 dark:bg-zinc-800 hover:bg-surface-300 dark:hover:bg-zinc-700 text-surface-800 dark:text-zinc-200 cursor-pointer transition shadow flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4" /> Refresh
                  </button>
                </div>
              </div>

              {/* ── SECTION 1: PENDING ASSET REQUESTS (ISSUE 4 & 5) ── */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-surface-800 dark:text-zinc-200 uppercase tracking-wider">Pending Asset Requests</h3>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                    {pendingAssetRequests.filter((r: any) => r.status === "PENDING").length} Pending
                  </span>
                </div>

                {pendingAssetRequests.length === 0 ? (
                  <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl p-6 text-center text-xs text-surface-500 font-medium">
                    No asset requests pending review.
                  </div>
                ) : (
                  <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-surface-200 dark:border-zinc-800 bg-surface-50 dark:bg-zinc-950 text-[10px] text-surface-500 dark:text-zinc-500 font-bold uppercase tracking-wider">
                            <th className="p-3 text-left">Employee</th>
                            <th className="p-3 text-left">Department</th>
                            <th className="p-3 text-left">Requested Asset</th>
                            <th className="p-3 text-left">Reason</th>
                            <th className="p-3 text-left">Status</th>
                            <th className="p-3 text-left">Date</th>
                            <th className="p-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-150 dark:divide-zinc-800 font-semibold text-surface-850 dark:text-zinc-200">
                          {pendingAssetRequests.map((r: any) => (
                            <tr key={r.id} className="hover:bg-surface-50/50 dark:hover:bg-zinc-900/50">
                              <td className="p-3 font-bold">{r.user?.name || "--"}</td>
                              <td className="p-3 text-surface-600 dark:text-zinc-400">{r.user?.department?.name || r.user?.department || "--"}</td>
                              <td className="p-3">
                                <span className="font-mono text-brand-900 dark:text-brand-300 font-bold mr-1.5">[{r.asset?.tag}]</span>
                                {r.asset?.name}
                              </td>
                              <td className="p-3 text-surface-600 dark:text-zinc-400 max-w-[200px] truncate">{r.reason || "Standard Issue"}</td>
                              <td className="p-3">
                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
                                  r.status === "PENDING" ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800" :
                                  r.status === "APPROVED" ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800" :
                                  "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
                                }`}>{r.status}</span>
                              </td>
                              <td className="p-3 text-surface-500 dark:text-zinc-500 text-[10px] font-mono">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "--"}</td>
                              <td className="p-3">
                                {r.status === "PENDING" ? (
                                  <div className="flex justify-center gap-1.5">
                                    <button
                                      onClick={async () => {
                                        try {
                                          await api.approveAssetRequest(r.id);
                                          showToast("Asset request approved & asset allocated!");
                                          loadAllAllocations();
                                          loadAllAssets();
                                        } catch(e: any) { showToast(e.message, "error"); }
                                      }}
                                      className="px-2.5 py-1 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 rounded text-[10px] font-bold hover:bg-green-100 cursor-pointer"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={async () => {
                                        try {
                                          await api.rejectAssetRequest(r.id);
                                          showToast("Asset request rejected");
                                          loadAllAllocations();
                                        } catch(e: any) { showToast(e.message, "error"); }
                                      }}
                                      className="px-2.5 py-1 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded text-[10px] font-bold hover:bg-red-100 cursor-pointer"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-surface-400 dark:text-zinc-500 italic block text-center">Reviewed</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* ── SECTION 2: ASSET TRANSFERS & RETURNS ── */}
              <div className="space-y-4 pt-4 border-t border-surface-200 dark:border-zinc-800">
                <h3 className="text-sm font-bold text-surface-800 dark:text-zinc-200 uppercase tracking-wider">Asset Transfer & Return Requests</h3>

                {loadingState.allocations ? (
                  <SkeletonTable rows={5} cols={6} />
                ) : errorState.allocations ? (
                  <ErrorState message={errorState.allocations} onRetry={loadAllAllocations} />
                ) : allTransfers.length === 0 ? (
                  <EmptyState icon="arrowRightLeft" title="No Transfer Requests" subtitle="No transfer or return requests have been submitted yet." />
                ) : (
                  <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-surface-200 dark:border-zinc-800 bg-surface-50 dark:bg-zinc-950 text-[10px] text-surface-500 dark:text-zinc-500 font-bold uppercase tracking-wider">
                            <th className="p-3 text-left">Asset</th>
                            <th className="p-3 text-left">From</th>
                            <th className="p-3 text-left">To</th>
                            <th className="p-3 text-left">Reason</th>
                            <th className="p-3 text-left">Status</th>
                            <th className="p-3 text-left">Date</th>
                            <th className="p-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-150 dark:divide-zinc-800 font-semibold text-surface-850 dark:text-zinc-200">
                          {allTransfers.map((t: any) => (
                            <tr key={t.id} className="hover:bg-surface-50/50 dark:hover:bg-zinc-900/50">
                              <td className="p-3 font-mono text-brand-900 dark:text-brand-300 font-bold">{t.asset?.tag || "--"}</td>
                              <td className="p-3">{t.fromUser?.name || "--"}</td>
                              <td className="p-3">{t.toUser?.name === t.fromUser?.name ? <span className="text-amber-600 dark:text-amber-400 italic">Return/Reassign</span> : (t.toUser?.name || "--")}</td>
                              <td className="p-3 text-surface-600 dark:text-zinc-400 max-w-[200px] truncate">{t.reason || "--"}</td>
                              <td className="p-3">
                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
                                  t.status === "REQUESTED" ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800" :
                                  t.status === "TRANSFERRED" ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800" :
                                  t.status === "REJECTED" ? "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800" :
                                  "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                                }`}>{t.status}</span>
                              </td>
                              <td className="p-3 text-surface-500 dark:text-zinc-500 text-[10px] font-mono">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "--"}</td>
                              <td className="p-3">
                                {t.status === "REQUESTED" && (
                                  <div className="flex justify-center gap-1.5">
                                    <button onClick={async () => { try { await api.approveTransfer(t.id); showToast("Transfer approved"); loadAllAllocations(); } catch(e: any) { showToast(e.message, "error"); } }} className="px-2.5 py-1 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 rounded text-[10px] font-bold hover:bg-green-100 dark:hover:bg-green-900 cursor-pointer">Approve</button>
                                    <button onClick={async () => { try { await api.rejectTransfer(t.id); showToast("Transfer rejected"); loadAllAllocations(); } catch(e: any) { showToast(e.message, "error"); } }} className="px-2.5 py-1 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded text-[10px] font-bold hover:bg-red-100 dark:hover:bg-red-900 cursor-pointer">Reject</button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── TAB 5: RESOURCE BOOKING ─────────────────────────────────────── */}
          {activeTab === "booking" && (
            <div className="max-w-6xl space-y-8 animate-float">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-surface-900 dark:text-white font-sans uppercase">Resource Booking Approvals</h2>
                  <p className="text-sm text-surface-600 dark:text-zinc-400 mt-1 font-medium">Review and approve resource requests (rooms, vehicles, equipment).</p>
                </div>
                <button onClick={loadAllBookings} className="px-4 py-2 rounded-lg text-xs font-bold bg-brand-900 hover:bg-brand-800 text-white cursor-pointer transition shadow flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Refresh
                </button>
              </div>

              {loadingState.bookings ? (
                <SkeletonTable rows={5} cols={7} />
              ) : errorState.bookings ? (
                <ErrorState message={errorState.bookings} onRetry={loadAllBookings} />
              ) : allBookings.length === 0 ? (
                <EmptyState icon="calendar" title="No Bookings" subtitle="No resource bookings have been created yet." />
              ) : (
                <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-surface-200 dark:border-zinc-800 bg-surface-50 dark:bg-zinc-950 text-[10px] text-surface-500 dark:text-zinc-500 font-bold uppercase tracking-wider">
                          <th className="p-3 text-left">Resource</th>
                          <th className="p-3 text-left">Type</th>
                          <th className="p-3 text-left">Booked By</th>
                          <th className="p-3 text-left">Date</th>
                          <th className="p-3 text-left">Time</th>
                          <th className="p-3 text-left">Status</th>
                          <th className="p-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-150 dark:divide-zinc-800 font-semibold text-surface-850 dark:text-zinc-200">
                        {allBookings.map((b: any) => (
                          <tr key={b.id} className="hover:bg-surface-50/50 dark:hover:bg-zinc-900/50">
                            <td className="p-3 font-bold">{b.resourceName}</td>
                            <td className="p-3 text-surface-600 dark:text-zinc-400 capitalize">{b.resourceType}</td>
                            <td className="p-3">{b.user?.name || "--"}</td>
                            <td className="p-3 text-surface-600 dark:text-zinc-400">{b.date ? new Date(b.date).toLocaleDateString() : "--"}</td>
                            <td className="p-3 font-mono text-[10px]">{b.startTime} - {b.endTime}</td>
                            <td className="p-3">
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
                                b.status === "PENDING" ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800" :
                                b.status === "CONFIRMED" ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800" :
                                b.status === "REJECTED" ? "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800" :
                                "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                              }`}>{b.status}</span>
                            </td>
                            <td className="p-3">
                              {b.status === "PENDING" ? (
                                <div className="flex justify-center gap-1.5">
                                  <button
                                    onClick={async () => {
                                      try {
                                        await api.approveBooking(b.id);
                                        showToast("Booking request approved!");
                                        loadAllBookings();
                                      } catch(e: any) { showToast(e.message, "error"); }
                                    }}
                                    className="px-2.5 py-1 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 rounded text-[10px] font-bold hover:bg-green-100 cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={async () => {
                                      try {
                                        await api.rejectBooking(b.id);
                                        showToast("Booking request rejected");
                                        loadAllBookings();
                                      } catch(e: any) { showToast(e.message, "error"); }
                                    }}
                                    className="px-2.5 py-1 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded text-[10px] font-bold hover:bg-red-100 cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-surface-400 dark:text-zinc-500 italic block text-center">Done</span>
                              )}
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

          {/* ─── TAB 6: MAINTENANCE ──────────────────────────────────────────── */}
          {activeTab === "maintenance" && (
            <div className="max-w-6xl space-y-8 animate-float">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-surface-900 dark:text-white font-sans uppercase">Maintenance</h2>
                  <p className="text-sm text-surface-600 dark:text-zinc-400 mt-1 font-medium">Kanban-style maintenance pipeline. Advance tickets through their lifecycle.</p>
                </div>
                <button onClick={loadAllMaintenance} className="px-4 py-2 rounded-lg text-xs font-bold bg-brand-900 hover:bg-brand-800 text-white cursor-pointer transition shadow flex items-center gap-2">
                  <Wrench className="w-4 h-4" /> Refresh
                </button>
              </div>

              {loadingState.maintenance ? (
                <SkeletonTable rows={4} cols={5} />
              ) : errorState.maintenance ? (
                <ErrorState message={errorState.maintenance} onRetry={loadAllMaintenance} />
              ) : allMaintenance.length === 0 ? (
                <EmptyState icon="wrench" title="No Maintenance Tickets" subtitle="No maintenance requests have been submitted." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {["PENDING", "APPROVED", "TECHNICIAN_ASSIGNED", "IN_PROGRESS", "RESOLVED"].map(status => {
                    const tickets = allMaintenance.filter((m: any) => m.status === status);
                    const colorMap: Record<string, string> = {
                      PENDING: "border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/30",
                      APPROVED: "border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/30",
                      TECHNICIAN_ASSIGNED: "border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/30",
                      IN_PROGRESS: "border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-950/30",
                      RESOLVED: "border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/30",
                    };
                    return (
                      <div key={status} className={`rounded-xl border-2 ${colorMap[status]} p-3 space-y-3`}>
                        <div className="flex justify-between items-center">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-surface-700 dark:text-zinc-300">{status.replace(/_/g, " ")}</h4>
                          <span className="text-[10px] font-mono font-bold text-surface-500 dark:text-zinc-500">{tickets.length}</span>
                        </div>
                        <div className="space-y-2">
                          {tickets.map((m: any) => (
                            <div key={m.id} className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-lg p-3 space-y-2 shadow-sm">
                              <div className="text-xs font-bold text-surface-900 dark:text-white">{m.asset?.tag || m.asset?.name || "--"}</div>
                              <div className="text-[10px] text-surface-600 dark:text-zinc-400 line-clamp-2">{m.issue}</div>
                              <div className="text-[9px] font-mono text-surface-400 dark:text-zinc-600">{m.requestedBy?.name || "--"}</div>
                              {status !== "RESOLVED" && (
                                <button
                                  onClick={async () => {
                                    try {
                                      await api.advanceMaintenance(m.id, { technicianName: m.technicianName });
                                      showToast("Ticket advanced");
                                      loadAllMaintenance();
                                    } catch (e: any) { showToast(e.message, "error"); }
                                  }}
                                  className="w-full text-[9px] font-bold bg-brand-900 hover:bg-brand-800 text-white rounded py-1 cursor-pointer transition"
                                >
                                  Advance →
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── TAB 7: ASSET AUDIT ─────────────────────────────────────────── */}
          {activeTab === "audit" && (
            <div className="max-w-6xl space-y-8 animate-float">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-surface-900 dark:text-white font-sans uppercase">Asset Audit</h2>
                  <p className="text-sm text-surface-600 dark:text-zinc-400 mt-1 font-medium">Create and manage audit cycles. Verify asset conditions and generate discrepancy reports.</p>
                </div>
                <button onClick={loadAllAudits} className="px-4 py-2 rounded-lg text-xs font-bold bg-brand-900 hover:bg-brand-800 text-white cursor-pointer transition shadow flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4" /> Refresh
                </button>
              </div>

              {loadingState.audits ? (
                <SkeletonTable rows={4} cols={5} />
              ) : errorState.audits ? (
                <ErrorState message={errorState.audits} onRetry={loadAllAudits} />
              ) : allAudits.length === 0 ? (
                <EmptyState icon="clipboard" title="No Audit Cycles" subtitle="No audit cycles have been created yet." />
              ) : (
                <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-surface-200 dark:border-zinc-800 bg-surface-50 dark:bg-zinc-950 text-[10px] text-surface-500 dark:text-zinc-500 font-bold uppercase tracking-wider">
                          <th className="p-3 text-left">Audit Name</th>
                          <th className="p-3 text-left">Department</th>
                          <th className="p-3 text-left">Start Date</th>
                          <th className="p-3 text-left">End Date</th>
                          <th className="p-3 text-left">Status</th>
                          <th className="p-3 text-left">Items</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-150 dark:divide-zinc-800 font-semibold text-surface-850 dark:text-zinc-200">
                        {allAudits.map((audit: any) => (
                          <tr key={audit.id} className="hover:bg-surface-50/50 dark:hover:bg-zinc-900/50">
                            <td className="p-3 font-bold">{audit.name}</td>
                            <td className="p-3 text-surface-600 dark:text-zinc-400">{audit.department}</td>
                            <td className="p-3 text-surface-500 dark:text-zinc-500 text-[10px] font-mono">{new Date(audit.startDate).toLocaleDateString()}</td>
                            <td className="p-3 text-surface-500 dark:text-zinc-500 text-[10px] font-mono">{new Date(audit.endDate).toLocaleDateString()}</td>
                            <td className="p-3">
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
                                audit.isOpen ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800" :
                                "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                              }`}>{audit.isOpen ? "Open" : "Closed"}</span>
                            </td>
                            <td className="p-3 font-mono text-[10px] text-surface-500 dark:text-zinc-500">{audit.items?.length || 0} items</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── TAB 8: REPORTS & ANALYTICS ─────────────────────────────────── */}
          {activeTab === "reports" && (
            <div className="max-w-6xl space-y-8 animate-float">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-surface-900 dark:text-white font-sans uppercase">Reports & Analytics</h2>
                <p className="text-sm text-surface-600 dark:text-zinc-400 mt-1 font-medium">Organization-wide utilization, maintenance trends, and resource usage analytics.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Asset Utilization by Dept */}
                <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl p-6 space-y-4 shadow-sm">
                  <h3 className="text-sm font-bold text-surface-900 dark:text-white uppercase tracking-wider">Asset Utilization by Department</h3>
                  <div className="space-y-3">
                    {departments.map(d => (
                      <div key={d.id} className="flex items-center justify-between text-xs">
                        <span className="text-surface-700 dark:text-zinc-300 font-semibold">{d.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-surface-500 dark:text-zinc-500">{d.employeesCount} employees</span>
                          <div className="w-24 h-2 rounded-full bg-surface-100 dark:bg-zinc-800">
                            <div className="h-2 rounded-full bg-brand-900 dark:bg-brand-500" style={{ width: `${Math.min(100, (d.employeesCount / Math.max(employeeCount, 1)) * 100)}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Admin Stats Summary */}
                <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl p-6 space-y-4 shadow-sm">
                  <h3 className="text-sm font-bold text-surface-900 dark:text-white uppercase tracking-wider">Organization Summary</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Total Departments", value: departmentCount },
                      { label: "Total Employees", value: employeeCount },
                      { label: "Asset Categories", value: categoryCount },
                      { label: "Active Users", value: activeUsersCount },
                      { label: "Department Heads", value: deptHeadsCount },
                      { label: "Asset Managers", value: assetManagersCount },
                    ].map(s => (
                      <div key={s.label} className="bg-surface-50 dark:bg-zinc-950 border border-surface-200 dark:border-zinc-800 rounded-lg p-3">
                        <div className="text-[10px] text-surface-500 dark:text-zinc-500 font-bold uppercase tracking-wider">{s.label}</div>
                        <div className="text-xl font-extrabold text-surface-900 dark:text-white mt-1">{s.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Maintenance by Status */}
                <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl p-6 space-y-4 shadow-sm">
                  <h3 className="text-sm font-bold text-surface-900 dark:text-white uppercase tracking-wider">Maintenance Pipeline</h3>
                  <div className="space-y-2">
                    {["PENDING", "APPROVED", "TECHNICIAN_ASSIGNED", "IN_PROGRESS", "RESOLVED"].map(s => {
                      const count = allMaintenance.filter((m: any) => m.status === s).length;
                      const total = Math.max(allMaintenance.length, 1);
                      return (
                        <div key={s} className="flex items-center gap-3 text-xs">
                          <span className="text-surface-700 dark:text-zinc-300 font-semibold w-36 text-[10px] uppercase">{s.replace(/_/g, " ")}</span>
                          <div className="flex-grow h-2 rounded-full bg-surface-100 dark:bg-zinc-800">
                            <div className="h-2 rounded-full bg-brand-900 dark:bg-brand-500 transition-all" style={{ width: `${(count / total) * 100}%` }} />
                          </div>
                          <span className="font-mono font-bold text-surface-600 dark:text-zinc-400 w-6 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Booking Summary */}
                <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl p-6 space-y-4 shadow-sm">
                  <h3 className="text-sm font-bold text-surface-900 dark:text-white uppercase tracking-wider">Booking Status</h3>
                  <div className="space-y-2">
                    {["CONFIRMED", "CANCELLED"].map(s => {
                      const count = allBookings.filter((b: any) => b.status === s).length;
                      return (
                        <div key={s} className="flex items-center justify-between bg-surface-50 dark:bg-zinc-950 border border-surface-200 dark:border-zinc-800 rounded-lg p-3">
                          <span className="text-xs font-semibold text-surface-700 dark:text-zinc-300 uppercase">{s}</span>
                          <span className="text-lg font-extrabold text-surface-900 dark:text-white">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 9: NOTIFICATIONS ──────────────────────────────────────── */}
          {activeTab === "notifications" && (
            <div className="max-w-6xl space-y-8 animate-float">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-surface-900 dark:text-white font-sans uppercase">Notifications</h2>
                  <p className="text-sm text-surface-600 dark:text-zinc-400 mt-1 font-medium">Organization-wide notification feed.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={async () => { try { await api.markAllNotificationsRead(); showToast("All marked as read"); loadAllNotifications(); } catch {} }} className="px-4 py-2 rounded-lg text-xs font-bold bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 text-surface-700 dark:text-zinc-300 hover:border-brand-900 cursor-pointer transition">
                    Mark All Read
                  </button>
                  <button onClick={loadAllNotifications} className="px-4 py-2 rounded-lg text-xs font-bold bg-brand-900 hover:bg-brand-800 text-white cursor-pointer transition shadow flex items-center gap-2">
                    <Bell className="w-4 h-4" /> Refresh
                  </button>
                </div>
              </div>

              {loadingState.notifications ? (
                <SkeletonActivityList rows={8} />
              ) : allNotifications.length === 0 ? (
                <EmptyState icon="bell" title="No Notifications" subtitle="You're all caught up!" />
              ) : (
                <div className="space-y-2">
                  {allNotifications.map((n: any) => (
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
                          onClick={async () => { try { await api.markNotificationRead(n.id); loadAllNotifications(); } catch {} }}
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

        </main>
      </div>

      {/* ─── MODAL: CREATE / EDIT DEPARTMENT ──────────────────────────────── */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 bg-zinc-900/40 dark:bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-xl text-surface-900 dark:text-zinc-100">
            <div className="flex justify-between items-center pb-2 border-b border-surface-200 dark:border-zinc-800">
              <h3 className="text-base font-bold text-surface-900 dark:text-white uppercase tracking-wider font-sans">
                {deptModalMode === "create" ? "Create Department" : "Edit Department"}
              </h3>
              <button onClick={() => setShowDeptModal(false)} className="text-surface-400 hover:text-surface-700 dark:hover:text-white font-bold cursor-pointer">✕</button>
            </div>
            
            {deptFormError && (
              <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-xs font-semibold">
                {deptFormError}
              </div>
            )}

            <form onSubmit={handleSaveDepartment} className="space-y-4">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider flex justify-between">
                  <span>Department Name <span className="text-red-500">*</span></span>
                  <span className="font-mono text-[9px] font-normal lowercase text-surface-400">{formDeptName.length} / 40 chars</span>
                </label>
                <input
                  type="text"
                  maxLength={40}
                  placeholder="e.g. Finance, Backend"
                  value={formDeptName}
                  onChange={e => setFormDeptName(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                  required
                />
              </div>

              {/* Head */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Department Head</label>
                <select
                  value={formDeptHead}
                  onChange={e => setFormDeptHead(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.name}>{emp.name} ({emp.department})</option>
                  ))}
                </select>
              </div>

              {/* Parent */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Parent Department</label>
                <select
                  value={formDeptParent}
                  onChange={e => setFormDeptParent(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                >
                  <option value="--">-- (No Parent Node)</option>
                  {departments
                    .filter(d => d.name !== formDeptName)
                    .map(d => (
                      <option key={d.name} value={d.name}>{d.name}</option>
                    ))}
                </select>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between py-2 border-y border-surface-100 dark:border-zinc-850">
                <span className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Status Active</span>
                <button
                  type="button"
                  onClick={() => setFormDeptStatus(!formDeptStatus)}
                  className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer outline-none ${formDeptStatus ? "bg-brand-900" : "bg-surface-300 dark:bg-zinc-800"}`}
                >
                  <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${formDeptStatus ? "left-5" : "left-1"}`} />
                </button>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Description</label>
                <textarea
                  rows={3}
                  maxLength={150}
                  placeholder="Summarize the core roles of this node..."
                  value={formDeptDesc}
                  onChange={e => setFormDeptDesc(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg p-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="flex-grow bg-white dark:bg-zinc-900 hover:bg-surface-50 dark:hover:bg-zinc-800 border border-surface-300 dark:border-zinc-800 text-surface-700 dark:text-zinc-300 rounded-lg h-10 text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-grow bg-brand-900 hover:bg-brand-800 text-white rounded-lg h-10 text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoading ? "Saving..." : "Save Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE / EDIT CATEGORY WITH DYNAMIC FIELDS ───────────── */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-zinc-900/40 dark:bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-xl text-surface-900 dark:text-zinc-100 my-8">
            <div className="flex justify-between items-center pb-2 border-b border-surface-200 dark:border-zinc-800">
              <h3 className="text-base font-bold text-surface-900 dark:text-white uppercase tracking-wider font-sans">
                {catModalMode === "create" ? "New Asset Category" : "Edit Asset Category"}
              </h3>
              <button onClick={() => setShowCategoryModal(false)} className="text-surface-400 hover:text-surface-700 dark:hover:text-white font-bold cursor-pointer">✕</button>
            </div>

            {catFormError && (
              <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-xs font-semibold">
                {catFormError}
              </div>
            )}

            <form onSubmit={handleSaveCategory} className="space-y-4">
              {/* Category Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Networking, Networking Equipment"
                  value={formCatName}
                  onChange={e => setFormCatName(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Description</label>
                <textarea
                  rows={2}
                  maxLength={120}
                  placeholder="Summarize the categories items..."
                  value={formCatDesc}
                  onChange={e => setFormCatDesc(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg p-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold resize-none"
                />
              </div>

              {/* Icon select */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Category Icon</label>
                <select
                  value={formCatIcon}
                  onChange={e => setFormCatIcon(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                >
                  <option value="Laptop">Laptop Icon</option>
                  <option value="Armchair">Armchair Icon</option>
                  <option value="Car">Car Icon</option>
                  <option value="Network">Network Icon</option>
                  <option value="Cable">Cable Icon</option>
                  <option value="Printer">Printer Icon</option>
                </select>
              </div>

              {/* Status active */}
              <div className="flex items-center justify-between py-2 border-y border-surface-100 dark:border-zinc-850">
                <span className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Status Active</span>
                <button
                  type="button"
                  onClick={() => setFormCatStatus(!formCatStatus)}
                  className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer outline-none ${formCatStatus ? "bg-brand-900" : "bg-surface-300 dark:bg-zinc-800"}`}
                >
                  <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${formCatStatus ? "left-5" : "left-1"}`} />
                </button>
              </div>

              {/* DYNAMIC SPECIFIC FIELDS BUILDER */}
              <div className="space-y-3 pt-2 border-t border-surface-200 dark:border-zinc-850">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-surface-900 dark:text-white">Dynamic Asset Fields</h4>
                  <button
                    type="button"
                    onClick={handleAddField}
                    className="px-3 py-1 border border-brand-900 text-brand-900 dark:text-brand-400 rounded hover:bg-brand-50 text-[10px] font-bold cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Custom Field
                  </button>
                </div>

                {customFields.length === 0 ? (
                  <p className="text-[11px] text-surface-500 font-semibold">No custom fields added yet. Assets will use global defaults.</p>
                ) : (
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                    {customFields.map((field, index) => (
                      <div key={index} className="flex gap-2 items-center p-2 bg-surface-50 dark:bg-zinc-950 border border-surface-200 dark:border-zinc-850 rounded-lg">
                        {/* Name */}
                        <div className="flex-grow">
                          <input
                            type="text"
                            value={field.name}
                            onChange={e => handleFieldChange(index, "name", e.target.value)}
                            placeholder="Field Name"
                            className="w-full bg-white dark:bg-zinc-900 border border-surface-300 dark:border-zinc-800 rounded px-2 py-1 text-[11px] font-semibold text-surface-900 dark:text-zinc-100"
                          />
                        </div>

                        {/* Type selection */}
                        <div>
                          <select
                            value={field.type}
                            onChange={e => handleFieldChange(index, "type", e.target.value as any)}
                            className="bg-white dark:bg-zinc-900 border border-surface-300 dark:border-zinc-800 rounded px-1.5 py-1 text-[11px] font-bold text-surface-700 dark:text-zinc-300"
                          >
                            <option value="Text">Text</option>
                            <option value="Number">Number</option>
                            <option value="Date">Date</option>
                            <option value="Dropdown">Dropdown</option>
                          </select>
                        </div>

                        {/* Required toggle checkbox */}
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={e => handleFieldChange(index, "required", e.target.checked)}
                            className="w-3.5 h-3.5 cursor-pointer accent-brand-900"
                            id={`req_${index}`}
                          />
                          <label htmlFor={`req_${index}`} className="text-[10px] font-extrabold text-surface-550 dark:text-zinc-500 uppercase select-none cursor-pointer">Req</label>
                        </div>

                        {/* Delete Field */}
                        <button
                          type="button"
                          onClick={() => handleRemoveField(index)}
                          className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit / Cancel Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="flex-grow bg-white dark:bg-zinc-900 hover:bg-surface-50 dark:hover:bg-zinc-800 border border-surface-300 dark:border-zinc-800 text-surface-700 dark:text-zinc-300 rounded-lg h-10 text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-grow bg-brand-900 hover:bg-brand-800 text-white rounded-lg h-10 text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-60 flex items-center justify-center"
                >
                  {isLoading ? "Saving..." : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* ─── MODAL: VIEW ENTITY PROFILE DETAILS ────────────────────────────── */}
      {viewEntityData && (
        <div className="fixed inset-0 z-50 bg-zinc-900/40 dark:bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-xl text-surface-900 dark:text-zinc-100">
            <div className="flex justify-between items-center pb-2 border-b border-surface-200 dark:border-zinc-800">
              <h3 className="text-base font-bold text-surface-900 dark:text-white uppercase tracking-wider font-sans">
                {viewEntityData.title} Details
              </h3>
              <button onClick={() => setViewEntityData(null)} className="text-surface-400 hover:text-surface-700 dark:hover:text-white font-bold cursor-pointer">✕</button>
            </div>

            <div className="space-y-3 pt-1">
              {Object.entries(viewEntityData.fields).map(([label, val]) => (
                <div key={label} className="grid grid-cols-3 py-1.5 border-b border-surface-100 dark:border-zinc-850 text-xs font-semibold">
                  <span className="text-surface-500 dark:text-zinc-400 uppercase tracking-wider text-[10px]">{label}</span>
                  <span className="col-span-2 text-surface-900 dark:text-zinc-100 pl-4">{val}</span>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setViewEntityData(null)}
                className="w-full bg-brand-900 hover:bg-brand-800 text-white rounded-lg h-9 text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: ADD EMPLOYEE ────────────────────────────────────────── */}
      {showAddEmpModal && (
        <div className="fixed inset-0 z-50 bg-zinc-900/40 dark:bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-xl text-surface-900 dark:text-zinc-100 my-8">
            <div className="flex justify-between items-center pb-2 border-b border-surface-200 dark:border-zinc-800">
              <h3 className="text-base font-bold text-surface-900 dark:text-white uppercase tracking-wider font-sans">Create Employee Account</h3>
              <button onClick={() => setShowAddEmpModal(false)} className="text-surface-400 hover:text-surface-700 dark:hover:text-white font-bold cursor-pointer">✕</button>
            </div>

            {addEmpError && (
              <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-xs font-semibold">{addEmpError}</div>
            )}

            <form onSubmit={handleCreateEmployee} className="space-y-4">
              {/* Personal Information */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-surface-900 dark:text-white border-b border-surface-200 dark:border-zinc-800 pb-1">Personal Information</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">First Name <span className="text-red-500">*</span></label>
                    <input type="text" value={addEmpForm.firstName} onChange={e => setAddEmpForm({ ...addEmpForm, firstName: e.target.value })} placeholder="e.g. Shubham" className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Last Name <span className="text-red-500">*</span></label>
                    <input type="text" value={addEmpForm.lastName} onChange={e => setAddEmpForm({ ...addEmpForm, lastName: e.target.value })} placeholder="e.g. Singh" className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold" required />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Official Email <span className="text-red-500">*</span></label>
                    <input type="email" value={addEmpForm.email} onChange={e => setAddEmpForm({ ...addEmpForm, email: e.target.value })} placeholder="employee@company.com" className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Phone</label>
                    <input type="text" value={addEmpForm.phone} onChange={e => setAddEmpForm({ ...addEmpForm, phone: e.target.value })} placeholder="+91 98765 43210" className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Employee ID</label>
                    <input type="text" value={addEmpForm.employeeId} onChange={e => setAddEmpForm({ ...addEmpForm, employeeId: e.target.value })} placeholder="EMP-001" className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold" />
                  </div>
                </div>
              </div>

              {/* Organization */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-surface-900 dark:text-white border-b border-surface-200 dark:border-zinc-800 pb-1">Organization & Role</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Department</label>
                    <select value={addEmpForm.departmentId} onChange={e => setAddEmpForm({ ...addEmpForm, departmentId: e.target.value })} className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold">
                      <option value="">-- No Department --</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Role Privilege</label>
                    <select value={addEmpForm.roleName} onChange={e => setAddEmpForm({ ...addEmpForm, roleName: e.target.value })} className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold">
                      <option value="Employee">Employee</option>
                      <option value="Department Head">Department Head</option>
                      <option value="Asset Manager">Asset Manager</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Designation</label>
                    <input type="text" value={addEmpForm.designation} onChange={e => setAddEmpForm({ ...addEmpForm, designation: e.target.value })} placeholder="e.g. Senior Engineer" className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Employment Type</label>
                    <select value={addEmpForm.employmentType} onChange={e => setAddEmpForm({ ...addEmpForm, employmentType: e.target.value })} className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold">
                      <option value="full-time">Full-Time</option>
                      <option value="part-time">Part-Time</option>
                      <option value="contract">Contract</option>
                      <option value="intern">Intern</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Joining Date</label>
                    <input type="date" value={addEmpForm.joiningDate} onChange={e => setAddEmpForm({ ...addEmpForm, joiningDate: e.target.value })} className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Manager</label>
                    <select value={addEmpForm.managerId} onChange={e => setAddEmpForm({ ...addEmpForm, managerId: e.target.value })} className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold">
                      <option value="">-- No Manager --</option>
                      {managedEmployees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Credentials Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-surface-900 dark:text-white border-b border-surface-200 dark:border-zinc-800 pb-1">Account Credentials</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Initial Password <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input
                        type={addEmpForm.showPassword ? "text" : "password"}
                        value={addEmpForm.password}
                        onChange={e => setAddEmpForm({ ...addEmpForm, password: e.target.value })}
                        placeholder="••••••••"
                        className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 pl-3 pr-10 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setAddEmpForm({ ...addEmpForm, showPassword: !addEmpForm.showPassword })}
                        className="absolute right-2.5 top-2.5 text-surface-400 hover:text-surface-700 dark:hover:text-white cursor-pointer"
                      >
                        {addEmpForm.showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Confirm Password <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input
                        type={addEmpForm.showPassword ? "text" : "password"}
                        value={addEmpForm.confirmPassword}
                        onChange={e => setAddEmpForm({ ...addEmpForm, confirmPassword: e.target.value })}
                        placeholder="••••••••"
                        className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 pl-3 pr-10 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setAddEmpForm({ ...addEmpForm, showPassword: !addEmpForm.showPassword })}
                        className="absolute right-2.5 top-2.5 text-surface-400 hover:text-surface-700 dark:hover:text-white cursor-pointer"
                      >
                        {addEmpForm.showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-surface-500 dark:text-zinc-500 font-medium">
                  Password must be 8+ chars with 1 uppercase, 1 lowercase, 1 number, and 1 special character.
                </p>
              </div>

              {/* Password Security Banner */}
              <div className="p-3.5 bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 rounded-xl text-brand-900 dark:text-brand-300 text-xs font-semibold flex items-start gap-2.5 shadow-sm">
                <KeyRound className="w-5 h-5 shrink-0 text-brand-900 dark:text-brand-400 mt-0.5" />
                <div>
                  <div className="font-extrabold uppercase tracking-wide">Admin Assigned Password</div>
                  <p className="font-normal text-[11px] leading-relaxed mt-0.5 text-brand-800 dark:text-brand-300">
                    The initial password entered above will be bcrypt-hashed before saving. Welcome credentials will be emailed to <strong>{addEmpForm.email || "the official email"}</strong> via Resend.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddEmpModal(false)} className="flex-grow bg-white dark:bg-zinc-900 hover:bg-surface-50 dark:hover:bg-zinc-800 border border-surface-300 dark:border-zinc-800 text-surface-700 dark:text-zinc-300 rounded-lg h-10 text-xs font-bold uppercase tracking-wider cursor-pointer">Cancel</button>
                <button type="submit" disabled={isLoading} className="flex-grow bg-brand-900 hover:bg-brand-800 text-white rounded-lg h-10 text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center">
                  {isLoading ? "Creating..." : "Create Employee Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: EDIT EMPLOYEE ───────────────────────────────────────── */}
      {showEditEmpModal && (
        <div className="fixed inset-0 z-50 bg-zinc-900/40 dark:bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-xl text-surface-900 dark:text-zinc-100 my-8">
            <div className="flex justify-between items-center pb-2 border-b border-surface-200 dark:border-zinc-800">
              <h3 className="text-base font-bold text-surface-900 dark:text-white uppercase tracking-wider font-sans">Edit Employee</h3>
              <button onClick={() => setShowEditEmpModal(false)} className="text-surface-400 hover:text-surface-700 dark:hover:text-white font-bold cursor-pointer">✕</button>
            </div>

            {editEmpError && (
              <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-xs font-semibold">{editEmpError}</div>
            )}

            <form onSubmit={handleUpdateEmployee} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Full Name <span className="text-red-500">*</span></label>
                  <input type="text" value={editEmpForm.name} onChange={e => setEditEmpForm({ ...editEmpForm, name: e.target.value })} className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold" required />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Email</label>
                  <input type="email" value={editEmpForm.email} onChange={e => setEditEmpForm({ ...editEmpForm, email: e.target.value })} className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Phone</label>
                  <input type="text" value={editEmpForm.phone} onChange={e => setEditEmpForm({ ...editEmpForm, phone: e.target.value })} className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Employee ID</label>
                  <input type="text" value={editEmpForm.employeeId} onChange={e => setEditEmpForm({ ...editEmpForm, employeeId: e.target.value })} className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Department</label>
                  <select value={editEmpForm.departmentId} onChange={e => setEditEmpForm({ ...editEmpForm, departmentId: e.target.value })} className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold">
                    <option value="">-- No Department --</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Role</label>
                  <select value={editEmpForm.roleName} onChange={e => setEditEmpForm({ ...editEmpForm, roleName: e.target.value })} className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold">
                    <option value="Employee">Employee</option>
                    <option value="Department Head">Department Head</option>
                    <option value="Asset Manager">Asset Manager</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Designation</label>
                  <input type="text" value={editEmpForm.designation} onChange={e => setEditEmpForm({ ...editEmpForm, designation: e.target.value })} className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Employment Type</label>
                  <select value={editEmpForm.employmentType} onChange={e => setEditEmpForm({ ...editEmpForm, employmentType: e.target.value })} className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold">
                    <option value="full-time">Full-Time</option>
                    <option value="part-time">Part-Time</option>
                    <option value="contract">Contract</option>
                    <option value="intern">Intern</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Joining Date</label>
                  <input type="date" value={editEmpForm.joiningDate} onChange={e => setEditEmpForm({ ...editEmpForm, joiningDate: e.target.value })} className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Status</label>
                  <select value={editEmpForm.status} onChange={e => setEditEmpForm({ ...editEmpForm, status: e.target.value })} className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold">
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEditEmpModal(false)} className="flex-grow bg-white dark:bg-zinc-900 hover:bg-surface-50 dark:hover:bg-zinc-800 border border-surface-300 dark:border-zinc-800 text-surface-700 dark:text-zinc-300 rounded-lg h-10 text-xs font-bold uppercase tracking-wider cursor-pointer">Cancel</button>
                <button type="submit" disabled={isLoading} className="flex-grow bg-brand-900 hover:bg-brand-800 text-white rounded-lg h-10 text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center">
                  {isLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: RESET PASSWORD ─────────────────────────────────────── */}
      {showResetPwdModal && (
        <div className="fixed inset-0 z-50 bg-zinc-900/40 dark:bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-xl text-surface-900 dark:text-zinc-100">
            <div className="flex justify-between items-center pb-2 border-b border-surface-200 dark:border-zinc-800">
              <h3 className="text-base font-bold text-surface-900 dark:text-white uppercase tracking-wider font-sans">Reset Password</h3>
              <button onClick={() => setShowResetPwdModal(false)} className="text-surface-400 hover:text-surface-700 dark:hover:text-white font-bold cursor-pointer">✕</button>
            </div>

            <div className="p-3 bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 rounded-xl text-brand-900 dark:text-brand-300 text-xs font-semibold flex items-start gap-2.5">
              <KeyRound className="w-5 h-5 shrink-0 text-brand-900 dark:text-brand-400 mt-0.5" />
              <div>
                <div className="font-extrabold uppercase tracking-wide">Manual Password Assignment</div>
                <p className="font-normal text-[11px] leading-relaxed mt-0.5 text-brand-800 dark:text-brand-300">
                  Enter a new password for <strong>{resetPwdEmpName}</strong>. The password will be bcrypt-hashed and sent via Resend email.
                </p>
              </div>
            </div>

            {resetPwdError && (
              <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-xs font-semibold">{resetPwdError}</div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">New Password <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type={resetPwdForm.showPassword ? "text" : "password"}
                      value={resetPwdForm.newPassword}
                      onChange={e => setResetPwdForm({ ...resetPwdForm, newPassword: e.target.value })}
                      placeholder="••••••••"
                      className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 pl-3 pr-10 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setResetPwdForm({ ...resetPwdForm, showPassword: !resetPwdForm.showPassword })}
                      className="absolute right-2.5 top-2.5 text-surface-400 hover:text-surface-700 dark:hover:text-white cursor-pointer"
                    >
                      {resetPwdForm.showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Confirm New Password <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type={resetPwdForm.showPassword ? "text" : "password"}
                      value={resetPwdForm.confirmPassword}
                      onChange={e => setResetPwdForm({ ...resetPwdForm, confirmPassword: e.target.value })}
                      placeholder="••••••••"
                      className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 pl-3 pr-10 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setResetPwdForm({ ...resetPwdForm, showPassword: !resetPwdForm.showPassword })}
                      className="absolute right-2.5 top-2.5 text-surface-400 hover:text-surface-700 dark:hover:text-white cursor-pointer"
                    >
                      {resetPwdForm.showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-surface-500 dark:text-zinc-500 font-medium">
                  Must be 8+ chars with 1 uppercase, 1 lowercase, 1 number, and 1 special char.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowResetPwdModal(false)} className="flex-grow bg-white dark:bg-zinc-900 hover:bg-surface-50 dark:hover:bg-zinc-800 border border-surface-300 dark:border-zinc-800 text-surface-700 dark:text-zinc-300 rounded-lg h-10 text-xs font-bold uppercase tracking-wider cursor-pointer">Cancel</button>
                <button type="submit" disabled={isLoading} className="flex-grow bg-brand-900 hover:bg-brand-800 text-white rounded-lg h-10 text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center">
                  {isLoading ? "Resetting..." : "Set Password & Send Email"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: ALLOCATE ASSET ───────────────────────────────────────── */}
      {showAllocateModal && (
        <div className="fixed inset-0 z-50 bg-zinc-900/40 dark:bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl w-full max-w-md p-6 space-y-6 shadow-xl text-surface-900 dark:text-zinc-100">
            <div className="flex justify-between items-center border-b border-surface-200 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-surface-900 dark:text-white uppercase tracking-wider">Allocate Asset</h3>
                <p className="text-xs text-surface-550 dark:text-zinc-400 font-medium">Directly assign an available asset to an employee.</p>
              </div>
              <button onClick={() => setShowAllocateModal(false)} className="text-surface-400 hover:text-surface-600 text-lg font-bold">✕</button>
            </div>

            <form onSubmit={handleAllocateAssetSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Select Available Asset <span className="text-red-500">*</span></label>
                <select
                  value={allocAssetId}
                  onChange={e => setAllocAssetId(e.target.value)}
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

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Select Employee <span className="text-red-500">*</span></label>
                <select
                  value={allocUserId}
                  onChange={e => setAllocUserId(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                  required
                >
                  <option value="">Choose an employee...</option>
                  {employees.map((e: any) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.email}) - {e.department || "No Dept"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Allocation Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Issued for Q3 remote project"
                  value={allocNotes}
                  onChange={e => setAllocNotes(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAllocateModal(false)} className="flex-grow bg-white dark:bg-zinc-900 hover:bg-surface-50 dark:hover:bg-zinc-800 border border-surface-300 dark:border-zinc-800 text-surface-700 dark:text-zinc-300 rounded-lg h-10 text-xs font-bold uppercase tracking-wider cursor-pointer">Cancel</button>
                <button type="submit" className="flex-grow bg-brand-900 hover:bg-brand-800 text-white rounded-lg h-10 text-xs font-bold uppercase tracking-wider cursor-pointer shadow-sm">
                  Allocate Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DIALOG: CREATE SUCCESS ─────────────────────────────────────── */}
      {showCreateSuccessDialog && (
        <div className="fixed inset-0 z-50 bg-zinc-900/40 dark:bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl w-full max-w-md p-6 space-y-5 shadow-xl text-surface-900 dark:text-zinc-100">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400 flex items-center justify-center mx-auto border border-green-200 dark:border-green-800">
                <CheckCircle className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-extrabold text-surface-900 dark:text-white uppercase tracking-wider">Account Created</h3>
              <p className="text-xs text-surface-550 dark:text-zinc-400 font-medium">Employee login credentials have been generated. Share these securely.</p>
            </div>

            <div className="space-y-3 bg-surface-50 dark:bg-zinc-950 border border-surface-200 dark:border-zinc-800 rounded-lg p-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-surface-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Name</span>
                <span className="font-semibold">{createdEmpInfo.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-surface-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Email</span>
                <span className="font-mono text-[11px]">{createdEmpInfo.email}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-surface-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Temp Password</span>
                <span className="font-mono text-[11px]">{createdEmpInfo.password.substring(0, 2)}{"•".repeat(Math.max(0, createdEmpInfo.password.length - 4))}{createdEmpInfo.password.substring(createdEmpInfo.password.length - 2)}</span>
              </div>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-700 dark:text-blue-300 text-[10px] font-semibold">
              The employee will be required to change their password on first login.
            </div>

            <button type="button" onClick={() => setShowCreateSuccessDialog(false)} className="w-full bg-brand-900 hover:bg-brand-800 text-white rounded-lg h-10 text-xs font-bold uppercase tracking-wider cursor-pointer">
              Done
            </button>
          </div>
        </div>
      )}

      {/* ─── MODAL: REGISTER ASSET ──────────────────────────────────────── */}
      {showRegisterAssetModal && (
        <div className="fixed inset-0 z-50 bg-zinc-900/40 dark:bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl w-full max-w-2xl p-6 space-y-5 shadow-2xl text-surface-900 dark:text-zinc-100 my-8">
            <div className="flex justify-between items-center pb-3 border-b border-surface-200 dark:border-zinc-800">
              <div>
                <h3 className="text-base font-extrabold text-surface-900 dark:text-white uppercase tracking-wider font-sans flex items-center gap-2">
                  <Laptop className="w-5 h-5 text-brand-900 dark:text-brand-400" /> Enterprise Asset Registration
                </h3>
                <p className="text-xs text-surface-500 dark:text-zinc-400 mt-0.5 font-medium">
                  Register new physical or digital equipment into AssetFlow ERP lifecycle.
                </p>
              </div>
              <button onClick={() => setShowRegisterAssetModal(false)} className="text-surface-400 hover:text-surface-700 dark:hover:text-white font-bold cursor-pointer text-sm">✕</button>
            </div>

            {/* Modal Tabs Header */}
            <div className="flex border-b border-surface-200 dark:border-zinc-800 text-xs font-bold gap-1 bg-surface-50 dark:bg-zinc-950 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setRegisterAssetTab("basic")}
                className={`flex-1 py-1.5 px-3 rounded-md transition text-center cursor-pointer ${
                  registerAssetTab === "basic" 
                    ? "bg-white dark:bg-zinc-800 text-brand-900 dark:text-white shadow-sm font-extrabold" 
                    : "text-surface-600 dark:text-zinc-400 hover:text-surface-900 dark:hover:text-zinc-200"
                }`}
              >
                1. Basic Info
              </button>
              <button
                type="button"
                onClick={() => setRegisterAssetTab("ownership")}
                className={`flex-1 py-1.5 px-3 rounded-md transition text-center cursor-pointer ${
                  registerAssetTab === "ownership" 
                    ? "bg-white dark:bg-zinc-800 text-brand-900 dark:text-white shadow-sm font-extrabold" 
                    : "text-surface-600 dark:text-zinc-400 hover:text-surface-900 dark:hover:text-zinc-200"
                }`}
              >
                2. Ownership & Purchase
              </button>
              <button
                type="button"
                onClick={() => setRegisterAssetTab("location")}
                className={`flex-1 py-1.5 px-3 rounded-md transition text-center cursor-pointer ${
                  registerAssetTab === "location" 
                    ? "bg-white dark:bg-zinc-800 text-brand-900 dark:text-white shadow-sm font-extrabold" 
                    : "text-surface-600 dark:text-zinc-400 hover:text-surface-900 dark:hover:text-zinc-200"
                }`}
              >
                3. Location & Status
              </button>
              <button
                type="button"
                onClick={() => setRegisterAssetTab("details")}
                className={`flex-1 py-1.5 px-3 rounded-md transition text-center cursor-pointer ${
                  registerAssetTab === "details" 
                    ? "bg-white dark:bg-zinc-800 text-brand-900 dark:text-white shadow-sm font-extrabold" 
                    : "text-surface-600 dark:text-zinc-400 hover:text-surface-900 dark:hover:text-zinc-200"
                }`}
              >
                4. Attachments & Notes
              </button>
            </div>

            {registerAssetError && (
              <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-xs font-semibold">
                {registerAssetError}
              </div>
            )}

            <form onSubmit={handleRegisterAssetSubmit} className="space-y-4">
              {/* TAB 1: BASIC INFO */}
              {registerAssetTab === "basic" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Asset Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="e.g. Dell Latitude 7440 / MacBook Pro M3 / Cisco Catalyst 9300"
                      value={registerAssetForm.name}
                      onChange={e => setRegisterAssetForm({ ...registerAssetForm, name: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Asset Code / Tag <span className="text-red-500">*</span></label>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await api.generateAssetTag();
                            const tagVal = res?.tag || (res as any)?.data?.tag;
                            if (tagVal) {
                              setRegisterAssetForm(f => ({ ...f, tag: tagVal }));
                            }
                          } catch { /* silent */ }
                        }}
                        className="text-[10px] text-brand-900 dark:text-brand-400 hover:underline font-bold"
                      >
                        Auto-Suggest
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. AST-10045"
                      value={registerAssetForm.tag}
                      onChange={e => setRegisterAssetForm({ ...registerAssetForm, tag: e.target.value.toUpperCase() })}
                      className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-mono font-bold"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Category <span className="text-red-500">*</span></label>
                    <select
                      value={registerAssetForm.categoryId}
                      onChange={e => setRegisterAssetForm({ ...registerAssetForm, categoryId: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                      required
                    >
                      <option value="">-- Select Category --</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Asset Type</label>
                    <select
                      value={registerAssetForm.type}
                      onChange={e => setRegisterAssetForm({ ...registerAssetForm, type: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                    >
                      <option value="Laptop">Laptop / Workstation</option>
                      <option value="Desktop">Desktop PC</option>
                      <option value="Mobile">Mobile / Tablet</option>
                      <option value="Server">Server / Infrastructure</option>
                      <option value="Networking">Networking Switch/Router</option>
                      <option value="Peripheral">Peripheral / Monitor</option>
                      <option value="Furniture">Furniture & Fixtures</option>
                      <option value="Vehicle">Vehicle / Transport</option>
                      <option value="Software">Software License</option>
                      <option value="Other">Other Asset</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Manufacturer</label>
                    <input
                      type="text"
                      placeholder="e.g. Dell / Apple / HP / Cisco / Herman Miller"
                      value={registerAssetForm.manufacturer}
                      onChange={e => setRegisterAssetForm({ ...registerAssetForm, manufacturer: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Model</label>
                    <input
                      type="text"
                      placeholder="e.g. Latitude 7440 / MacBook Pro 16"
                      value={registerAssetForm.model}
                      onChange={e => setRegisterAssetForm({ ...registerAssetForm, model: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Serial Number</label>
                    <input
                      type="text"
                      placeholder="e.g. SN-88942-X"
                      value={registerAssetForm.serialNumber}
                      onChange={e => setRegisterAssetForm({ ...registerAssetForm, serialNumber: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-mono font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Barcode / QR Code</label>
                    <input
                      type="text"
                      placeholder="e.g. BAR-902188"
                      value={registerAssetForm.barcode}
                      onChange={e => setRegisterAssetForm({ ...registerAssetForm, barcode: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-mono font-semibold"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Description</label>
                    <textarea
                      placeholder="Detailed asset specifications, configuration, and notes..."
                      value={registerAssetForm.description}
                      onChange={e => setRegisterAssetForm({ ...registerAssetForm, description: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg p-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold h-20 resize-none"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: OWNERSHIP & PURCHASE */}
              {registerAssetTab === "ownership" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Assigned Department <span className="text-red-500">*</span></label>
                    <select
                      value={registerAssetForm.departmentId}
                      onChange={e => setRegisterAssetForm({ ...registerAssetForm, departmentId: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                      required
                    >
                      <option value="">-- Select Department --</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Vendor / Supplier</label>
                    <input
                      type="text"
                      placeholder="e.g. Dell India Pvt Ltd / Apple Store / Reliance Digital"
                      value={registerAssetForm.vendor}
                      onChange={e => setRegisterAssetForm({ ...registerAssetForm, vendor: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">PO Number (Purchase Order)</label>
                    <input
                      type="text"
                      placeholder="e.g. PO-2026-0891"
                      value={registerAssetForm.poNumber}
                      onChange={e => setRegisterAssetForm({ ...registerAssetForm, poNumber: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-mono font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Invoice Number</label>
                    <input
                      type="text"
                      placeholder="e.g. INV-990123"
                      value={registerAssetForm.invoiceNumber}
                      onChange={e => setRegisterAssetForm({ ...registerAssetForm, invoiceNumber: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-mono font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Purchase Date <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      value={registerAssetForm.purchaseDate}
                      onChange={e => setRegisterAssetForm({ ...registerAssetForm, purchaseDate: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Warranty Expiry Date</label>
                    <input
                      type="date"
                      value={registerAssetForm.warrantyExpiry}
                      onChange={e => setRegisterAssetForm({ ...registerAssetForm, warrantyExpiry: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Purchase Cost (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 1299.00"
                      value={registerAssetForm.purchaseCost}
                      onChange={e => setRegisterAssetForm({ ...registerAssetForm, purchaseCost: e.target.value, currentValue: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Current Estimated Value (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 1100.00"
                      value={registerAssetForm.currentValue}
                      onChange={e => setRegisterAssetForm({ ...registerAssetForm, currentValue: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Expected Useful Life (Months)</label>
                    <input
                      type="number"
                      placeholder="e.g. 36"
                      value={registerAssetForm.expectedLifeMonths}
                      onChange={e => setRegisterAssetForm({ ...registerAssetForm, expectedLifeMonths: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Depreciation Method</label>
                    <select
                      value={registerAssetForm.depreciationMethod}
                      onChange={e => setRegisterAssetForm({ ...registerAssetForm, depreciationMethod: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                    >
                      <option value="Straight Line">Straight Line</option>
                      <option value="Declining Balance">Declining Balance</option>
                      <option value="Sum of Years Digits">Sum of Years Digits</option>
                      <option value="None">None / Non-depreciating</option>
                    </select>
                  </div>
                </div>
              )}

              {/* TAB 3: LOCATION & STATUS */}
              {registerAssetTab === "location" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Asset Status <span className="text-red-500">*</span></label>
                    <select
                      value={registerAssetForm.status}
                      onChange={e => setRegisterAssetForm({ ...registerAssetForm, status: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-bold"
                      required
                    >
                      <option value="AVAILABLE">AVAILABLE (Ready for Allocation)</option>
                      <option value="ALLOCATED">ALLOCATED (Assigned to Employee)</option>
                      <option value="RESERVED">RESERVED (Held for Department / Project)</option>
                      <option value="MAINTENANCE">UNDER MAINTENANCE</option>
                      <option value="DISPOSED">DISPOSED</option>
                      <option value="LOST">LOST / MISSING</option>
                      <option value="RETIRED">RETIRED</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Building Name / Campus</label>
                    <input
                      type="text"
                      placeholder="e.g. Tower A / HQ Campus / Tech Park"
                      value={registerAssetForm.building}
                      onChange={e => setRegisterAssetForm({ ...registerAssetForm, building: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Floor</label>
                    <input
                      type="text"
                      placeholder="e.g. 4th Floor / Ground Floor"
                      value={registerAssetForm.floor}
                      onChange={e => setRegisterAssetForm({ ...registerAssetForm, floor: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Room / Lab / Bay</label>
                    <input
                      type="text"
                      placeholder="e.g. Server Room 402 / Bay B-12"
                      value={registerAssetForm.room}
                      onChange={e => setRegisterAssetForm({ ...registerAssetForm, room: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Specific Storage Location / Cabinet</label>
                    <input
                      type="text"
                      placeholder="e.g. Cabinet #3 - Rack B / IT Central Storage Locker 14"
                      value={registerAssetForm.storageLocation}
                      onChange={e => setRegisterAssetForm({ ...registerAssetForm, storageLocation: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: ATTACHMENTS & NOTES */}
              {registerAssetTab === "details" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Asset Image URL</label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/photo-laptop... (Direct image link)"
                      value={registerAssetForm.imageUrl}
                      onChange={e => setRegisterAssetForm({ ...registerAssetForm, imageUrl: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Warranty / Invoice Document URL</label>
                    <input
                      type="url"
                      placeholder="https://drive.google.com/document... (Direct invoice or warranty PDF link)"
                      value={registerAssetForm.documentUrl}
                      onChange={e => setRegisterAssetForm({ ...registerAssetForm, documentUrl: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg h-10 px-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-surface-600 dark:text-zinc-400 uppercase tracking-wider">Internal Admin Notes</label>
                    <textarea
                      placeholder="Special instructions, maintenance schedules, or internal remarks..."
                      value={registerAssetForm.notes}
                      onChange={e => setRegisterAssetForm({ ...registerAssetForm, notes: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-950 border border-surface-300 dark:border-zinc-800 rounded-lg p-3 text-xs focus:border-brand-900 outline-none text-surface-900 dark:text-zinc-100 font-semibold h-24 resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Navigation & Submit controls */}
              <div className="flex justify-between items-center pt-4 border-t border-surface-200 dark:border-zinc-800">
                <div className="flex gap-2">
                  {registerAssetTab !== "basic" && (
                    <button
                      type="button"
                      onClick={() => {
                        if (registerAssetTab === "ownership") setRegisterAssetTab("basic");
                        else if (registerAssetTab === "location") setRegisterAssetTab("ownership");
                        else if (registerAssetTab === "details") setRegisterAssetTab("location");
                      }}
                      className="px-4 py-2 bg-surface-100 dark:bg-zinc-800 hover:bg-surface-200 dark:hover:bg-zinc-700 text-surface-700 dark:text-zinc-300 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer"
                    >
                      ← Previous
                    </button>
                  )}
                  {registerAssetTab !== "details" && (
                    <button
                      type="button"
                      onClick={() => {
                        if (registerAssetTab === "basic") setRegisterAssetTab("ownership");
                        else if (registerAssetTab === "ownership") setRegisterAssetTab("location");
                        else if (registerAssetTab === "location") setRegisterAssetTab("details");
                      }}
                      className="px-4 py-2 bg-surface-200 dark:bg-zinc-800 hover:bg-surface-300 dark:hover:bg-zinc-700 text-surface-800 dark:text-zinc-200 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Next Step →
                    </button>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowRegisterAssetModal(false)}
                    className="px-4 py-2 bg-white dark:bg-zinc-900 hover:bg-surface-50 dark:hover:bg-zinc-800 border border-surface-300 dark:border-zinc-800 text-surface-700 dark:text-zinc-300 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isRegisteringAsset}
                    className="px-5 py-2 bg-brand-900 hover:bg-brand-800 text-white rounded-lg text-xs font-extrabold uppercase tracking-wider cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow"
                  >
                    {isRegisteringAsset ? "Registering..." : "Complete Registration"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: ASSET DETAILS VIEW ──────────────────────────────────── */}
      {showAssetDetailModal && selectedAssetDetail && (
        <div className="fixed inset-0 z-50 bg-zinc-900/40 dark:bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl w-full max-w-3xl p-6 space-y-6 shadow-2xl text-surface-900 dark:text-zinc-100 my-8">
            <div className="flex justify-between items-start pb-4 border-b border-surface-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-brand-50 dark:bg-brand-950/60 rounded-xl border border-brand-200 dark:border-brand-800 text-brand-900 dark:text-brand-300">
                  <Laptop className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-brand-900 dark:text-brand-300 px-2 py-0.5 bg-brand-50 dark:bg-brand-950 border border-brand-200 dark:border-brand-800 rounded">
                      {selectedAssetDetail.tag}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
                      selectedAssetDetail.status === "AVAILABLE" ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800" :
                      selectedAssetDetail.status === "ALLOCATED" ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800" :
                      selectedAssetDetail.status === "MAINTENANCE" ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800" :
                      "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                    }`}>{selectedAssetDetail.status}</span>
                  </div>
                  <h3 className="text-xl font-extrabold text-surface-900 dark:text-white mt-1">
                    {selectedAssetDetail.name} {assetDetailLoading && <span className="text-xs font-normal text-surface-400 font-sans animate-pulse">(Refreshing...)</span>}
                  </h3>
                  <p className="text-xs text-surface-550 dark:text-zinc-400 font-medium">
                    {selectedAssetDetail.manufacturer ? `${selectedAssetDetail.manufacturer} ` : ""}{selectedAssetDetail.model || ""}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowAssetDetailModal(false)} className="text-surface-400 hover:text-surface-700 dark:hover:text-white font-bold cursor-pointer text-sm">✕</button>
            </div>

            {/* QR Code Toolbar & Warranty Alert Banner */}
            <div className="bg-surface-50 dark:bg-zinc-950 border border-surface-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <img 
                  src={generateQRCodeDataURL(selectedAssetDetail.tag + `_${qrKey}`)} 
                  alt="Asset QR Code" 
                  className="w-16 h-16 border border-surface-300 dark:border-zinc-700 rounded-lg p-1 bg-white shadow-sm"
                />
                <div>
                  <div className="font-bold text-xs text-surface-900 dark:text-white flex items-center gap-1.5">
                    <span>QR Code Tag:</span>
                    <span className="font-mono text-brand-900 dark:text-brand-400">{selectedAssetDetail.tag}</span>
                  </div>
                  {selectedAssetDetail.warrantyExpiry && (
                    <div className="mt-1">
                      {(() => {
                        const ws = getWarrantyStatus(selectedAssetDetail.warrantyExpiry);
                        return (
                          <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full ${ws.badgeColor}`}>
                            Warranty: {ws.label}
                          </span>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const dataUrl = generateQRCodeDataURL(selectedAssetDetail.tag);
                    const a = document.createElement('a');
                    a.href = dataUrl;
                    a.download = `QR_${selectedAssetDetail.tag}.svg`;
                    a.click();
                  }}
                  className="px-3 py-1.5 rounded-lg border border-surface-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold text-surface-800 dark:text-zinc-200 hover:bg-surface-100 flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setQrStickerAsset(selectedAssetDetail);
                    setShowQRStickerModal(true);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-950/60 text-xs font-bold text-brand-900 dark:text-brand-300 hover:bg-brand-100 flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Sticker</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setQrKey(prev => prev + 1);
                    showToast("QR Code regenerated successfully", "success");
                  }}
                  className="p-1.5 rounded-lg border border-surface-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-surface-600 dark:text-zinc-400 hover:text-surface-900 cursor-pointer shadow-sm"
                  title="Regenerate QR Code"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Asset Detail Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-surface-50 dark:bg-zinc-950 border border-surface-200 dark:border-zinc-800 rounded-xl p-4 space-y-2">
                <h4 className="font-extrabold uppercase text-[10px] text-surface-500 dark:text-zinc-500 tracking-wider">Classification & Location</h4>
                <div><span className="text-surface-500 dark:text-zinc-400 font-medium">Category:</span> <span className="font-bold">{selectedAssetDetail.category?.name || "--"}</span></div>
                <div><span className="text-surface-500 dark:text-zinc-400 font-medium">Department:</span> <span className="font-bold">{selectedAssetDetail.department?.name || "--"}</span></div>
                <div><span className="text-surface-500 dark:text-zinc-400 font-medium">Location:</span> <span className="font-bold">{selectedAssetDetail.location || "--"}</span></div>
                <div><span className="text-surface-500 dark:text-zinc-400 font-medium">Type:</span> <span className="font-bold">{selectedAssetDetail.type || "Hardware"}</span></div>
              </div>

              <div className="bg-surface-50 dark:bg-zinc-950 border border-surface-200 dark:border-zinc-800 rounded-xl p-4 space-y-2">
                <h4 className="font-extrabold uppercase text-[10px] text-surface-500 dark:text-zinc-500 tracking-wider">Identifiers & Vendor</h4>
                <div><span className="text-surface-500 dark:text-zinc-400 font-medium">Serial #:</span> <span className="font-mono font-bold">{selectedAssetDetail.serialNumber || "--"}</span></div>
                <div><span className="text-surface-500 dark:text-zinc-400 font-medium">Barcode:</span> <span className="font-mono font-bold">{selectedAssetDetail.barcode || "--"}</span></div>
                <div><span className="text-surface-500 dark:text-zinc-400 font-medium">Vendor:</span> <span className="font-bold">{selectedAssetDetail.vendor || "--"}</span></div>
                <div><span className="text-surface-500 dark:text-zinc-400 font-medium">PO #:</span> <span className="font-mono font-bold">{selectedAssetDetail.poNumber || "--"}</span></div>
              </div>

              <div className="bg-surface-50 dark:bg-zinc-950 border border-surface-200 dark:border-zinc-800 rounded-xl p-4 space-y-2">
                <h4 className="font-extrabold uppercase text-[10px] text-surface-500 dark:text-zinc-500 tracking-wider">Financial & Warranty</h4>
                <div><span className="text-surface-500 dark:text-zinc-400 font-medium">Purchase Cost:</span> <span className="font-bold font-mono text-green-700 dark:text-green-400">{selectedAssetDetail.purchaseCost ? formatINR(selectedAssetDetail.purchaseCost) : "--"}</span></div>
                <div><span className="text-surface-500 dark:text-zinc-400 font-medium">Current Value:</span> <span className="font-bold font-mono">{selectedAssetDetail.currentValue ? formatINR(selectedAssetDetail.currentValue) : "--"}</span></div>
                <div><span className="text-surface-500 dark:text-zinc-400 font-medium">Purchase Date:</span> <span className="font-bold">{selectedAssetDetail.purchaseDate ? new Date(selectedAssetDetail.purchaseDate).toLocaleDateString() : "--"}</span></div>
                <div><span className="text-surface-500 dark:text-zinc-400 font-medium">Warranty Expiry:</span> <span className="font-bold text-amber-700 dark:text-amber-400">{selectedAssetDetail.warrantyExpiry ? new Date(selectedAssetDetail.warrantyExpiry).toLocaleDateString() : "--"}</span></div>
              </div>
            </div>

            {/* Description & Notes */}
            {(selectedAssetDetail.description || selectedAssetDetail.notes) && (
              <div className="bg-surface-50 dark:bg-zinc-950 border border-surface-200 dark:border-zinc-800 rounded-xl p-4 space-y-2 text-xs">
                {selectedAssetDetail.description && (
                  <div>
                    <h5 className="font-bold text-[10px] uppercase text-surface-500 dark:text-zinc-400">Description</h5>
                    <p className="text-surface-700 dark:text-zinc-300 font-medium mt-0.5">{selectedAssetDetail.description}</p>
                  </div>
                )}
                {selectedAssetDetail.notes && (
                  <div className="pt-2 border-t border-surface-200 dark:border-zinc-800">
                    <h5 className="font-bold text-[10px] uppercase text-surface-500 dark:text-zinc-400">Internal Admin Notes</h5>
                    <p className="text-surface-700 dark:text-zinc-300 font-medium mt-0.5">{selectedAssetDetail.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* History Section */}
            <div className="space-y-3">
              <h4 className="font-extrabold uppercase text-xs text-surface-900 dark:text-white tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-900 dark:text-brand-400" /> Lifecycle History Timeline
              </h4>
              {selectedAssetDetail.history && selectedAssetDetail.history.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedAssetDetail.history.map((h: any) => (
                    <div key={h.id} className="p-2.5 bg-surface-50 dark:bg-zinc-950 border border-surface-200 dark:border-zinc-800 rounded-lg text-xs flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-surface-900 dark:text-zinc-200">{h.event}</div>
                        {h.user && <div className="text-[10px] text-surface-500 dark:text-zinc-400 font-medium">By {h.user.name}</div>}
                      </div>
                      <div className="text-[10px] font-mono text-surface-400 dark:text-zinc-500">{new Date(h.date || h.createdAt).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-surface-500 dark:text-zinc-400 italic font-medium">No history entries logged yet for this asset.</p>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-surface-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setShowAssetDetailModal(false)}
                className="px-5 py-2 bg-brand-900 hover:bg-brand-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer shadow"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ─── ENTERPRISE MODALS ────────────────────────────────────────────── */}
      <CommandPalette 
        isOpen={showCommandPalette} 
        onClose={() => setShowCommandPalette(false)} 
        onNavigateTab={(tabId) => setActiveTab(tabId)} 
        userRole="ADMIN"
      />

      <ExportCenterModal 
        isOpen={showExportModal} 
        onClose={() => setShowExportModal(false)} 
        dataPayload={exportPayload} 
      />

      {showQRStickerModal && qrStickerAsset && (
        <div className="fixed inset-0 z-50 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowQRStickerModal(false)}>
          <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-2xl p-6 max-w-sm w-full space-y-5 shadow-2xl text-center" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-2 border-b border-surface-200 dark:border-zinc-800">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-surface-900 dark:text-white">Print Asset Tag Sticker</h3>
              <button onClick={() => setShowQRStickerModal(false)} className="text-surface-400 hover:text-surface-900 dark:hover:text-white">✕</button>
            </div>

            {/* Printable Sticker Tag Layout */}
            <div id="printable-sticker-tag" className="p-4 border-2 border-dashed border-zinc-900 dark:border-zinc-100 rounded-xl bg-white text-zinc-900 space-y-2 font-sans shadow-inner">
              <div className="text-[10px] font-extrabold tracking-widest uppercase text-indigo-700">ASSETFLOW ERP PROPERTY</div>
              <div className="flex items-center justify-center py-2">
                <img src={generateQRCodeDataURL(qrStickerAsset.tag)} alt="QR Sticker" className="w-32 h-32 border border-zinc-200 p-1" />
              </div>
              <div className="font-mono text-sm font-extrabold text-zinc-900">{qrStickerAsset.tag}</div>
              <div className="font-bold text-xs truncate">{qrStickerAsset.name}</div>
              <div className="text-[9px] text-zinc-500 font-semibold">{qrStickerAsset.department?.name || 'Enterprise Asset'}</div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const printWin = window.open('', '_blank');
                  if (printWin) {
                    const stickerHtml = document.getElementById('printable-sticker-tag')?.outerHTML || '';
                    printWin.document.write(`
                      <html><head><title>Print Asset Tag - ${qrStickerAsset.tag}</title>
                      <style>body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }</style>
                      </head><body>${stickerHtml}<script>window.onload = function() { window.print(); }</script></body></html>
                    `);
                    printWin.document.close();
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-brand-900 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow"
              >
                <Printer className="w-4 h-4" />
                <span>Print Sticker Tag</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
