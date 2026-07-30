import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, Laptop, CheckCircle2, ArrowLeft, Plus, Trash2, 
  Sparkles, ShieldCheck, Globe, Clock, DollarSign, Layers, 
  Check, ArrowRight, AlertCircle, Loader2
} from 'lucide-react';
import Logo from './ui/Logo';
import { 
  createOrganization, 
  createSetupDepartment, 
  createSetupEmployee, 
  createSetupAsset, 
  updateOnboardingStatus, 
  getOnboardingStatus,
  type OrganizationData 
} from '../lib/onboarding';

interface OnboardingWizardProps {
  onComplete: () => void;
  themeMode: 'light' | 'dark';
  setThemeMode: (mode: 'light' | 'dark') => void;
}

type StepKey = 'ORGANIZATION' | 'DEPARTMENTS' | 'EMPLOYEES' | 'ASSETS' | 'COMPLETED';

const STEP_ORDER: StepKey[] = ['ORGANIZATION', 'DEPARTMENTS', 'EMPLOYEES', 'ASSETS', 'COMPLETED'];

const DEFAULT_DEPARTMENTS = ['IT', 'HR', 'Finance', 'Operations', 'Marketing', 'Sales'];

const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (₹ / INR)' },
  { code: 'USD', symbol: '$', name: 'USD ($)' },
  { code: 'EUR', symbol: '€', name: 'EUR (€)' },
  { code: 'GBP', symbol: '£', name: 'GBP (£)' },
  { code: 'CAD', symbol: 'CA$', name: 'CAD ($)' },
  { code: 'AUD', symbol: 'A$', name: 'AUD ($)' },
  { code: 'JPY', symbol: '¥', name: 'JPY (¥)' },
];

const INDUSTRIES = [
  'Information Technology & Software',
  'Financial Services & Banking',
  'Healthcare & Life Sciences',
  'Manufacturing & Industrial',
  'Retail & E-Commerce',
  'Education & Research',
  'Real Estate & Construction',
  'Media & Telecommunications',
  'Professional Services',
  'Other',
];

const COMPANY_SIZES = [
  '1 - 10 employees',
  '11 - 50 employees',
  '51 - 200 employees',
  '201 - 500 employees',
  '500+ employees',
];

export default function OnboardingWizard({ onComplete, themeMode, setThemeMode }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState<StepKey>('ORGANIZATION');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Step 1: Org details
  const [orgData, setOrgData] = useState<OrganizationData>({
    name: '',
    logo: '',
    industry: 'Information Technology & Software',
    companySize: '11 - 50 employees',
    country: 'United States',
    timezone: 'UTC',
    currency: 'USD',
    address: '',
    website: '',
    description: '',
  });

  // Step 2: Departments
  const [departments, setDepartments] = useState<{ id?: string; name: string; description: string }[]>([
    { name: 'IT', description: 'Information Technology & Hardware Support' },
    { name: 'HR', description: 'Human Resources & Talent Management' },
    { name: 'Finance', description: 'Finance, Payroll & Procurement' },
    { name: 'Operations', description: 'Business Operations & Logistics' },
  ]);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');

  // Step 3: Employees
  const [employees, setEmployees] = useState<{ name: string; email: string; department: string; role: string; jobTitle: string; phone: string }[]>([
    { name: '', email: '', department: 'IT', role: 'Employee', jobTitle: 'Systems Engineer', phone: '' }
  ]);

  // Step 4: Assets
  const [assets, setAssets] = useState<{ assetName: string; category: string; assetId: string; serialNumber: string; purchaseDate: string; purchasePrice: string; vendor: string; warranty: string; department: string; location: string }[]>([
    { assetName: '', category: 'Laptops', assetId: '', serialNumber: '', purchaseDate: '', purchasePrice: '', vendor: '', warranty: '', department: 'IT', location: 'Main Office' }
  ]);

  // Summary counters for Step 5
  const [createdCounts, setCreatedCounts] = useState({
    departmentsCount: 0,
    employeesCount: 0,
    assetsCount: 0,
  });

  // Fetch initial onboarding status on mount
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const status = await getOnboardingStatus();
        if (status.hasOrganization && status.organization) {
          setOrgData(prev => ({
            ...prev,
            name: status.organization?.name || prev.name,
            currency: status.organization?.currency || prev.currency,
            industry: status.organization?.industry || prev.industry,
          }));
        }
        if (status.completed) {
          onComplete();
          return;
        }
        if (status.step && STEP_ORDER.includes(status.step)) {
          setCurrentStep(status.step);
        }
      } catch (err: any) {
        console.error('Failed to fetch onboarding status', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [onComplete]);

  const stepIndex = STEP_ORDER.indexOf(currentStep);

  // ─── Step Handlers ─────────────────────────────────────────────────────────

  const handleOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgData.name.trim()) {
      setErrorMsg('Organization name is required');
      return;
    }
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await createOrganization(orgData);
      setCurrentStep('DEPARTMENTS');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create organization');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddDeptChip = (deptName: string) => {
    if (!departments.some(d => d.name.toLowerCase() === deptName.toLowerCase())) {
      setDepartments(prev => [...prev, { name: deptName, description: `${deptName} department` }]);
    }
  };

  const handleAddCustomDept = () => {
    if (!newDeptName.trim()) return;
    if (departments.some(d => d.name.toLowerCase() === newDeptName.trim().toLowerCase())) {
      setErrorMsg(`Department "${newDeptName.trim()}" already exists`);
      return;
    }
    setErrorMsg(null);
    setDepartments(prev => [...prev, { name: newDeptName.trim(), description: newDeptDesc.trim() || `${newDeptName.trim()} department` }]);
    setNewDeptName('');
    setNewDeptDesc('');
  };

  const handleRemoveDept = (index: number) => {
    setDepartments(prev => prev.filter((_, i) => i !== index));
  };

  const handleDepartmentsSubmit = async () => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      // Create departments sequentially
      let created = 0;
      for (const dept of departments) {
        if (dept.name.trim()) {
          try {
            await createSetupDepartment(dept.name.trim(), dept.description);
            created++;
          } catch (e) {
            // Ignore if already created
          }
        }
      }
      setCreatedCounts(prev => ({ ...prev, departmentsCount: created || departments.length }));
      await updateOnboardingStatus('EMPLOYEES');
      setCurrentStep('EMPLOYEES');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save departments');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddEmployeeRow = () => {
    setEmployees(prev => [
      ...prev,
      { name: '', email: '', department: departments[0]?.name || 'IT', role: 'Employee', jobTitle: 'Team Member', phone: '' }
    ]);
  };

  const handleRemoveEmployeeRow = (index: number) => {
    setEmployees(prev => prev.filter((_, i) => i !== index));
  };

  const handleEmployeesSubmit = async () => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const validEmps = employees.filter(e => e.name.trim() && e.email.trim());
      let created = 0;
      for (const emp of validEmps) {
        try {
          await createSetupEmployee({
            name: emp.name.trim(),
            email: emp.email.trim(),
            department: emp.department,
            role: emp.role,
            jobTitle: emp.jobTitle,
            phone: emp.phone,
          });
          created++;
        } catch (e) {
          // Continue with next
        }
      }
      setCreatedCounts(prev => ({ ...prev, employeesCount: created }));
      await updateOnboardingStatus('ASSETS');
      setCurrentStep('ASSETS');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save employees');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAssetRow = () => {
    setAssets(prev => [
      ...prev,
      { assetName: '', category: 'Laptops', assetId: '', serialNumber: '', purchaseDate: '', purchasePrice: '', vendor: '', warranty: '', department: departments[0]?.name || 'IT', location: 'Main Office' }
    ]);
  };

  const handleRemoveAssetRow = (index: number) => {
    setAssets(prev => prev.filter((_, i) => i !== index));
  };

  const handleAssetsSubmit = async () => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const validAssets = assets.filter(a => a.assetName.trim());
      let created = 0;
      for (const ast of validAssets) {
        try {
          await createSetupAsset({
            assetName: ast.assetName.trim(),
            category: ast.category,
            assetId: ast.assetId.trim() || undefined,
            serialNumber: ast.serialNumber.trim() || undefined,
            purchaseDate: ast.purchaseDate || undefined,
            purchasePrice: ast.purchasePrice ? parseFloat(ast.purchasePrice) : undefined,
            vendor: ast.vendor.trim() || undefined,
            warranty: ast.warranty || undefined,
            department: ast.department,
            location: ast.location,
          });
          created++;
        } catch (e) {
          // Continue
        }
      }
      setCreatedCounts(prev => ({ ...prev, assetsCount: created }));
      await updateOnboardingStatus('COMPLETED', true);
      setCurrentStep('COMPLETED');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register assets');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinish = async () => {
    setSubmitting(true);
    try {
      await updateOnboardingStatus('COMPLETED', true);
      onComplete();
    } catch (err: any) {
      onComplete();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
        <p className="text-slate-400 font-medium">Initializing Organization Onboarding Setup...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeMode === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} transition-colors duration-200 flex flex-col`}>
      {/* Header Bar */}
      <header className={`px-6 py-4 border-b ${themeMode === 'dark' ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white/80'} backdrop-blur-md sticky top-0 z-40 flex items-center justify-between`}>
        <div className="flex items-center space-x-3">
          <Logo className="w-9 h-9" />
          <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-violet-500">
            AssetFlow <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-mono border border-indigo-500/20">ERP Setup</span>
          </span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
          className={`p-2 rounded-lg text-sm font-medium transition-colors ${
            themeMode === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          {themeMode === 'dark' ? '☀️ Light' : '🌙 Dark'}
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-w-5xl w-full mx-auto px-4 py-8 flex flex-col">
        
        {/* Progress Stepper Bar */}
        <div className="mb-10">
          <div className="flex items-center justify-between max-w-3xl mx-auto relative">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 z-0" />
            <div 
              className="absolute top-1/2 left-0 h-1 bg-indigo-600 transition-all duration-500 -translate-y-1/2 z-0" 
              style={{ width: `${(stepIndex / (STEP_ORDER.length - 1)) * 100}%` }}
            />

            {[
              { id: 'ORGANIZATION', label: 'Organization', icon: Building2 },
              { id: 'DEPARTMENTS', label: 'Departments', icon: Layers },
              { id: 'EMPLOYEES', label: 'Employees', icon: Users },
              { id: 'ASSETS', label: 'Assets', icon: Laptop },
              { id: 'COMPLETED', label: 'Finish', icon: CheckCircle2 },
            ].map((st, idx) => {
              const Icon = st.icon;
              const isPast = idx < stepIndex;
              const isCurrent = idx === stepIndex;

              return (
                <div key={st.id} className="relative z-10 flex flex-col items-center">
                  <div 
                    className={`w-11 h-11 rounded-full flex items-center justify-center font-bold transition-all duration-300 shadow-md ${
                      isPast
                        ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                        : isCurrent
                        ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/20 shadow-indigo-600/30 scale-110'
                        : themeMode === 'dark'
                        ? 'bg-slate-800 text-slate-500 border border-slate-700'
                        : 'bg-white text-slate-400 border border-slate-300'
                    }`}
                  >
                    {isPast ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs font-semibold mt-2.5 transition-colors ${
                    isCurrent 
                      ? 'text-indigo-600 dark:text-indigo-400 font-bold' 
                      : isPast 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : 'text-slate-400'
                  }`}>
                    {st.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Alert Box */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-start space-x-3 animate-fadeIn">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm font-medium">{errorMsg}</div>
            <button onClick={() => setErrorMsg(null)} className="text-xs text-red-500 hover:underline">Dismiss</button>
          </div>
        )}

        {/* ─── STEP 1: ORGANIZATION CREATION ─── */}
        {currentStep === 'ORGANIZATION' && (
          <div className={`p-8 rounded-2xl border ${themeMode === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-xl transition-all`}>
            <div className="mb-8">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 text-xs font-semibold mb-3 border border-indigo-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Step 1 of 5</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Setup Your Organization Profile</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                Enter your company details to initialize your isolated multi-tenant ERP workspace.
              </p>
            </div>

            <form onSubmit={handleOrgSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Org Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2">Organization / Company Name <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Building2 className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Global Logistics, Corp."
                      value={orgData.name}
                      onChange={e => setOrgData({ ...orgData, name: e.target.value })}
                      className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm transition-all outline-none ${
                        themeMode === 'dark' 
                          ? 'bg-slate-800/80 border-slate-700 focus:border-indigo-500 text-white' 
                          : 'bg-slate-50 border-slate-300 focus:border-indigo-600 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Industry */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Industry Sector</label>
                  <select
                    value={orgData.industry || ''}
                    onChange={e => setOrgData({ ...orgData, industry: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border text-sm outline-none ${
                      themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {INDUSTRIES.map(ind => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>

                {/* Company Size */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Company Size</label>
                  <select
                    value={orgData.companySize || ''}
                    onChange={e => setOrgData({ ...orgData, companySize: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border text-sm outline-none ${
                      themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {COMPANY_SIZES.map(cs => (
                      <option key={cs} value={cs}>{cs}</option>
                    ))}
                  </select>
                </div>

                {/* Country */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Country / Region</label>
                  <div className="relative">
                    <Globe className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. United States, India, Germany"
                      value={orgData.country || ''}
                      onChange={e => setOrgData({ ...orgData, country: e.target.value })}
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none ${
                        themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Timezone */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Timezone</label>
                  <div className="relative">
                    <Clock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                      value={orgData.timezone || 'UTC'}
                      onChange={e => setOrgData({ ...orgData, timezone: e.target.value })}
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none ${
                        themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="UTC">UTC (Coordinated Universal Time)</option>
                      <option value="America/New_York">EST (Eastern Standard Time)</option>
                      <option value="America/Los_Angeles">PST (Pacific Standard Time)</option>
                      <option value="Asia/Kolkata">IST (Indian Standard Time)</option>
                      <option value="Europe/London">GMT (Greenwich Mean Time)</option>
                      <option value="Europe/Paris">CET (Central European Time)</option>
                    </select>
                  </div>
                </div>

                {/* Default Currency */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Default Base Currency</label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                      value={orgData.currency || 'INR'}
                      onChange={e => setOrgData({ ...orgData, currency: e.target.value })}
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none ${
                        themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    >
                      {CURRENCIES.map(c => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Website */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Website (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://acme.com"
                    value={orgData.website || ''}
                    onChange={e => setOrgData({ ...orgData, website: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border text-sm outline-none ${
                      themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2">Headquarters Address (Optional)</label>
                  <input
                    type="text"
                    placeholder="100 Technology Parkway, Suite 400, Innovation City"
                    value={orgData.address || ''}
                    onChange={e => setOrgData({ ...orgData, address: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border text-sm outline-none ${
                      themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

              </div>

              <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/25 flex items-center space-x-2 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Create Organization & Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ─── STEP 2: CREATE DEPARTMENTS ─── */}
        {currentStep === 'DEPARTMENTS' && (
          <div className={`p-8 rounded-2xl border ${themeMode === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-xl transition-all`}>
            <div className="mb-8">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 text-xs font-semibold mb-3 border border-indigo-500/20">
                <Layers className="w-3.5 h-3.5" />
                <span>Step 2 of 5</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Configure Company Departments</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                Select quick department templates or create custom organizational units.
              </p>
            </div>

            {/* Pre-suggested quick chips */}
            <div className="mb-8">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Add Presets</label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_DEPARTMENTS.map(dept => {
                  const isAdded = departments.some(d => d.name.toLowerCase() === dept.toLowerCase());
                  return (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => handleAddDeptChip(dept)}
                      disabled={isAdded}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                        isAdded
                          ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 cursor-default'
                          : themeMode === 'dark'
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                      }`}
                    >
                      {isAdded ? <Check className="w-3.5 h-3.5 text-indigo-500" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                      <span>{dept}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Department Form */}
            <div className={`p-4 rounded-xl mb-8 border ${themeMode === 'dark' ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <h3 className="text-sm font-bold mb-3">Add Custom Department</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Department Name (e.g., Engineering)"
                  value={newDeptName}
                  onChange={e => setNewDeptName(e.target.value)}
                  className={`px-3.5 py-2.5 rounded-lg border text-sm outline-none ${
                    themeMode === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
                <input
                  type="text"
                  placeholder="Description (Optional)"
                  value={newDeptDesc}
                  onChange={e => setNewDeptDesc(e.target.value)}
                  className={`px-3.5 py-2.5 rounded-lg border text-sm outline-none ${
                    themeMode === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleAddCustomDept}
                  className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors flex items-center justify-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Department</span>
                </button>
              </div>
            </div>

            {/* Configured Departments List */}
            <div className="space-y-3 mb-8">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Configured Departments ({departments.length})
              </label>
              {departments.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm border border-dashed rounded-xl">
                  No departments added yet. Select a preset or add a custom department.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {departments.map((dept, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-xl border flex items-center justify-between ${
                        themeMode === 'dark' ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-sm">{dept.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{dept.description}</div>
                      </div>
                      <button
                        onClick={() => handleRemoveDept(index)}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep('ORGANIZATION')}
                className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition-colors flex items-center space-x-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleDepartmentsSubmit}
                disabled={submitting}
                className="px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/25 flex items-center space-x-2 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Save Departments & Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: EMPLOYEES ─── */}
        {currentStep === 'EMPLOYEES' && (
          <div className={`p-8 rounded-2xl border ${themeMode === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-xl transition-all`}>
            <div className="mb-8">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 text-xs font-semibold mb-3 border border-indigo-500/20">
                <Users className="w-3.5 h-3.5" />
                <span>Step 3 of 5</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Add / Invite Initial Employees</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                Add company staff members and assign their respective departments and access roles.
              </p>
            </div>

            {/* Employee Form List */}
            <div className="space-y-4 mb-8">
              {employees.map((emp, index) => (
                <div 
                  key={index}
                  className={`p-5 rounded-xl border relative ${
                    themeMode === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Employee #{index + 1}</span>
                    {employees.length > 1 && (
                      <button
                        onClick={() => handleRemoveEmployeeRow(index)}
                        className="text-xs text-red-500 hover:underline flex items-center space-x-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Full Name</label>
                      <input
                        type="text"
                        placeholder="Shubham Singh"
                        value={emp.name}
                        onChange={e => {
                          const updated = [...employees];
                          updated[index].name = e.target.value;
                          setEmployees(updated);
                        }}
                        className={`w-full px-3.5 py-2 rounded-lg border text-sm outline-none ${
                          themeMode === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">Work Email</label>
                      <input
                        type="email"
                        placeholder="shubham.singh@company.com"
                        value={emp.email}
                        onChange={e => {
                          const updated = [...employees];
                          updated[index].email = e.target.value;
                          setEmployees(updated);
                        }}
                        className={`w-full px-3.5 py-2 rounded-lg border text-sm outline-none ${
                          themeMode === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">Department</label>
                      <select
                        value={emp.department}
                        onChange={e => {
                          const updated = [...employees];
                          updated[index].department = e.target.value;
                          setEmployees(updated);
                        }}
                        className={`w-full px-3.5 py-2 rounded-lg border text-sm outline-none ${
                          themeMode === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      >
                        {departments.length > 0 ? (
                          departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)
                        ) : (
                          <option value="IT">IT</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">System Role</label>
                      <select
                        value={emp.role}
                        onChange={e => {
                          const updated = [...employees];
                          updated[index].role = e.target.value;
                          setEmployees(updated);
                        }}
                        className={`w-full px-3.5 py-2 rounded-lg border text-sm outline-none ${
                          themeMode === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      >
                        <option value="Employee">Employee</option>
                        <option value="Department Head">Department Head</option>
                        <option value="Asset Manager">Asset Manager</option>
                        <option value="Administrator">Administrator</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">Job Title</label>
                      <input
                        type="text"
                        placeholder="Systems Engineer"
                        value={emp.jobTitle}
                        onChange={e => {
                          const updated = [...employees];
                          updated[index].jobTitle = e.target.value;
                          setEmployees(updated);
                        }}
                        className={`w-full px-3.5 py-2 rounded-lg border text-sm outline-none ${
                          themeMode === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">Phone Number (Optional)</label>
                      <input
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={emp.phone}
                        onChange={e => {
                          const updated = [...employees];
                          updated[index].phone = e.target.value;
                          setEmployees(updated);
                        }}
                        className={`w-full px-3.5 py-2 rounded-lg border text-sm outline-none ${
                          themeMode === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddEmployeeRow}
                className="w-full py-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 font-semibold text-sm transition-colors flex items-center justify-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Another Employee</span>
              </button>
            </div>

            {/* Actions */}
            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep('DEPARTMENTS')}
                className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition-colors flex items-center space-x-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep('ASSETS')}
                  className="px-5 py-2.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-sm font-semibold"
                >
                  Skip for Now
                </button>
                <button
                  type="button"
                  onClick={handleEmployeesSubmit}
                  disabled={submitting}
                  className="px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/25 flex items-center space-x-2 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Save Employees & Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 4: REGISTER ASSETS ─── */}
        {currentStep === 'ASSETS' && (
          <div className={`p-8 rounded-2xl border ${themeMode === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-xl transition-all`}>
            <div className="mb-8">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 text-xs font-semibold mb-3 border border-indigo-500/20">
                <Laptop className="w-3.5 h-3.5" />
                <span>Step 4 of 5</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Register Initial Hardware & Assets</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                Register company laptops, servers, workstations, and hardware to initialize tracking.
              </p>
            </div>

            {/* Asset Form List */}
            <div className="space-y-4 mb-8">
              {assets.map((ast, index) => (
                <div 
                  key={index}
                  className={`p-5 rounded-xl border relative ${
                    themeMode === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Asset #{index + 1}</span>
                    {assets.length > 1 && (
                      <button
                        onClick={() => handleRemoveAssetRow(index)}
                        className="text-xs text-red-500 hover:underline flex items-center space-x-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Asset Name</label>
                      <input
                        type="text"
                        placeholder="MacBook Pro M3 Max"
                        value={ast.assetName}
                        onChange={e => {
                          const updated = [...assets];
                          updated[index].assetName = e.target.value;
                          setAssets(updated);
                        }}
                        className={`w-full px-3.5 py-2 rounded-lg border text-sm outline-none ${
                          themeMode === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">Category</label>
                      <select
                        value={ast.category}
                        onChange={e => {
                          const updated = [...assets];
                          updated[index].category = e.target.value;
                          setAssets(updated);
                        }}
                        className={`w-full px-3.5 py-2 rounded-lg border text-sm outline-none ${
                          themeMode === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      >
                        <option value="Laptops">Laptops</option>
                        <option value="Desktops">Desktops</option>
                        <option value="Servers">Servers</option>
                        <option value="Mobile Devices">Mobile Devices</option>
                        <option value="Monitors">Monitors & Displays</option>
                        <option value="Office Furniture">Office Furniture</option>
                        <option value="Networking">Networking</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">Asset Tag / ID (Optional)</label>
                      <input
                        type="text"
                        placeholder="AF-1001"
                        value={ast.assetId}
                        onChange={e => {
                          const updated = [...assets];
                          updated[index].assetId = e.target.value;
                          setAssets(updated);
                        }}
                        className={`w-full px-3.5 py-2 rounded-lg border text-sm outline-none ${
                          themeMode === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">Serial Number</label>
                      <input
                        type="text"
                        placeholder="C02G789XQ15"
                        value={ast.serialNumber}
                        onChange={e => {
                          const updated = [...assets];
                          updated[index].serialNumber = e.target.value;
                          setAssets(updated);
                        }}
                        className={`w-full px-3.5 py-2 rounded-lg border text-sm outline-none ${
                          themeMode === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">Purchase Date</label>
                      <input
                        type="date"
                        value={ast.purchaseDate}
                        onChange={e => {
                          const updated = [...assets];
                          updated[index].purchaseDate = e.target.value;
                          setAssets(updated);
                        }}
                        className={`w-full px-3.5 py-2 rounded-lg border text-sm outline-none ${
                          themeMode === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">Purchase Cost ({orgData.currency || 'USD'})</label>
                      <input
                        type="number"
                        placeholder="2499.00"
                        value={ast.purchasePrice}
                        onChange={e => {
                          const updated = [...assets];
                          updated[index].purchasePrice = e.target.value;
                          setAssets(updated);
                        }}
                        className={`w-full px-3.5 py-2 rounded-lg border text-sm outline-none ${
                          themeMode === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">Vendor / Supplier</label>
                      <input
                        type="text"
                        placeholder="Apple Enterprise"
                        value={ast.vendor}
                        onChange={e => {
                          const updated = [...assets];
                          updated[index].vendor = e.target.value;
                          setAssets(updated);
                        }}
                        className={`w-full px-3.5 py-2 rounded-lg border text-sm outline-none ${
                          themeMode === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">Location</label>
                      <input
                        type="text"
                        placeholder="HQ - Floor 3"
                        value={ast.location}
                        onChange={e => {
                          const updated = [...assets];
                          updated[index].location = e.target.value;
                          setAssets(updated);
                        }}
                        className={`w-full px-3.5 py-2 rounded-lg border text-sm outline-none ${
                          themeMode === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddAssetRow}
                className="w-full py-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 font-semibold text-sm transition-colors flex items-center justify-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Register Another Asset</span>
              </button>
            </div>

            {/* Actions */}
            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep('EMPLOYEES')}
                className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition-colors flex items-center space-x-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => handleAssetsSubmit()}
                  className="px-5 py-2.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-sm font-semibold"
                >
                  Skip for Now
                </button>
                <button
                  type="button"
                  onClick={handleAssetsSubmit}
                  disabled={submitting}
                  className="px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/25 flex items-center space-x-2 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Complete Setup & Finish</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 5: FINISH ─── */}
        {currentStep === 'COMPLETED' && (
          <div className={`p-10 rounded-2xl border text-center ${themeMode === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'} shadow-2xl transition-all`}>
            <div className="w-20 h-20 bg-gradient-to-tr from-emerald-500 to-teal-400 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/30 animate-bounce">
              <span className="text-4xl">🎉</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">Your Organization is Ready!</h1>
            <p className="text-slate-500 dark:text-slate-400 text-base max-w-xl mx-auto mb-10">
              <strong className="text-indigo-600 dark:text-indigo-400">{orgData.name || 'Your Organization'}</strong> has been fully configured and isolated in AssetFlow ERP.
            </p>

            {/* Metrics Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-10 text-left">
              <div className={`p-4 rounded-xl border ${themeMode === 'dark' ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Departments</div>
                <div className="text-2xl font-bold text-indigo-500 mt-1">{createdCounts.departmentsCount || departments.length}</div>
                <div className="text-xs text-slate-500 mt-0.5">Configured</div>
              </div>

              <div className={`p-4 rounded-xl border ${themeMode === 'dark' ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Employees</div>
                <div className="text-2xl font-bold text-indigo-500 mt-1">{createdCounts.employeesCount || employees.filter(e => e.name).length}</div>
                <div className="text-xs text-slate-500 mt-0.5">Added / Invited</div>
              </div>

              <div className={`p-4 rounded-xl border ${themeMode === 'dark' ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Initial Assets</div>
                <div className="text-2xl font-bold text-indigo-500 mt-1">{createdCounts.assetsCount || assets.filter(a => a.assetName).length}</div>
                <div className="text-xs text-slate-500 mt-0.5">Registered</div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFinish}
              disabled={submitting}
              className="px-10 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-base transition-all shadow-xl shadow-indigo-600/30 flex items-center space-x-3 mx-auto disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
              <span>Go To ERP Dashboard</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
