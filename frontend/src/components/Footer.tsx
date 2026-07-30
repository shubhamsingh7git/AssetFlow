import { Mail, MapPin, ShieldCheck } from 'lucide-react';
import Logo from './ui/Logo';

export default function Footer() {
  return (
    <footer className="bg-surface-50 border-t border-surface-200 pt-16 pb-8 relative z-10 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 mb-12">
          {/* Brand Info */}
          <div className="md:col-span-4 space-y-4">
            <a href="#" className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-md bg-brand-900 flex items-center justify-center p-1">
                <Logo className="w-full h-full text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-surface-900">
                Asset<span className="text-brand-900">Flow</span>
              </span>
            </a>
            <p className="text-xs text-surface-600 leading-relaxed max-w-sm font-medium">
              AssetFlow is the central Enterprise Resource Planning (ERP) platform designed to digitize the physical asset lifecycle, eliminating spreadsheets and automating logistics checks.
            </p>
            <div className="space-y-2 pt-2 text-xs text-surface-650 font-mono font-medium">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-surface-500" />
                <span>iamshubhamsingh0405@gmail.com</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-surface-500" />
                <span>Mathura, Uttar Pradesh, India</span>
              </div>
            </div>
          </div>

          {/* Links: Product */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold text-surface-900 uppercase tracking-wider font-mono">Product</h4>
            <ul className="space-y-2 text-xs text-surface-600 font-semibold">
              <li><a href="#features" className="hover:text-brand-900 transition-colors">Asset Registry</a></li>
              <li><a href="#features" className="hover:text-brand-900 transition-colors">Calendar Bookings</a></li>
              <li><a href="#features" className="hover:text-brand-900 transition-colors">Kanban Maintenance</a></li>
              <li><a href="#features" className="hover:text-brand-900 transition-colors">RFID/Barcode Audits</a></li>
              <li><a href="#roi-calculator" className="hover:text-brand-900 transition-colors">ROI Calculator</a></li>
            </ul>
          </div>

          {/* Links: Resources */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold text-surface-900 uppercase tracking-wider font-mono">Resources</h4>
            <ul className="space-y-2 text-xs text-surface-600 font-semibold">
              <li><a href="#docs" className="hover:text-brand-900 transition-colors">Documentation</a></li>
              <li><a href="#tutorials" className="hover:text-brand-900 transition-colors">Video Tutorials</a></li>
              <li><a href="#security" className="hover:text-brand-900 transition-colors">API References</a></li>
              <li><a href="#pricing" className="hover:text-brand-900 transition-colors">Pricing Options</a></li>
              <li><a href="#status" className="hover:text-brand-900 transition-colors">System Status</a></li>
            </ul>
          </div>

          {/* Links: Compliance & Trust */}
          <div className="md:col-span-4 space-y-4">
            <h4 className="text-xs font-bold text-surface-900 uppercase tracking-wider font-mono">Security & Compliance</h4>
            <p className="text-xs text-surface-600 leading-relaxed font-medium">
              We uphold the highest security standards. All datastores are encrypted at rest with AES-256 and backed by SOC2 Type II audits.
            </p>
            <div className="flex items-center space-x-3 bg-white border border-surface-200 p-3 rounded-md max-w-xs shadow-sm">
              <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <div className="text-[10px] font-bold text-surface-900 uppercase tracking-wider">ISO 27001 Certified</div>
                <div className="text-[9px] text-surface-500">Security Certificate #29401-AF</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="border-t border-surface-200 pt-8 mt-12 flex flex-col sm:flex-row items-center justify-between text-[11px] text-surface-500 font-medium gap-4">
          <div>
            &copy; {new Date().getFullYear()} AssetFlow Technologies, Inc. All rights reserved.
          </div>
          <div className="flex space-x-6">
            <a href="#privacy" className="hover:text-surface-700 transition-colors">Privacy Policy</a>
            <a href="#terms" className="hover:text-surface-700 transition-colors">Terms of Service</a>
            <a href="#cookies" className="hover:text-surface-700 transition-colors">Cookie Configurations</a>
          </div>
          <div className="flex items-center space-x-1 font-mono text-[10px] text-surface-400">
            <span>Crafted for B2B Operations</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
