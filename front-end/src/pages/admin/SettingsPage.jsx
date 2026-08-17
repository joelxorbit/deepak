import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';

export const SettingsPage = () => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('General');

  const [businessName, setBusinessName] = useState('Elite Pitch Turf Arena');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [email, setEmail] = useState('support@elitepitch.com');
  const [address, setAddress] = useState('123 Sports Complex Way, Stadium District, Metro City, 400001');

  const [slotRate, setSlotRate] = useState(300);
  const [gstRate, setGstRate] = useState(18);
  const [cancelWindowHours, setCancelWindowHours] = useState(2);

  const handleSaveSettings = (e) => {
    e.preventDefault();
    addToast('Enterprise settings updated successfully.', 'success');
  };

  const mockAuditLogs = [
    { id: 1, action: 'ADMIN_LOGIN', user: 'admin', timestamp: '2026-08-14 10:15 AM', details: 'Successful JWT authentication' },
    { id: 2, action: 'MARK_PAID', user: 'admin', timestamp: '2026-08-14 11:30 AM', details: 'Updated payment status to Paid for BK-20260814-0002' },
    { id: 3, action: 'APPROVE_BOOKING', user: 'admin', timestamp: '2026-08-14 01:20 PM', details: 'Approved reservation BK-20260814-0003' },
    { id: 4, action: 'SETTINGS_UPDATE', user: 'admin', timestamp: '2026-08-14 03:45 PM', details: 'Updated Slot Rate to ₹300/hr and GST to 18%' }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-3xl font-extrabold text-on-surface">Enterprise Settings & System Controls</h1>
        <p className="text-on-surface-variant font-body-md text-sm mt-1">
          Configure business details, turf slot rates, tax policy, and review audit trail logs.
        </p>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm space-y-6">
        <div className="flex gap-2 border-b border-black/5 pb-4 overflow-x-auto">
          {['General', 'Booking & Pricing', 'Audit Logs'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`min-h-[44px] px-5 py-2.5 rounded-2xl text-xs font-label-bold transition-all flex-shrink-0 ${
                activeTab === tab ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-variant'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'General' && (
          <form onSubmit={handleSaveSettings} className="space-y-6 max-w-2xl">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-label-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Business / Arena Name *</label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-label-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-label-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-label-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Arena Address *</label>
                <textarea
                  rows="3"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-2xl p-4 text-sm focus:outline-none focus:border-primary resize-none"
                ></textarea>
              </div>
            </div>

            <button
              type="submit"
              className="min-h-[44px] px-6 py-3 bg-primary text-white font-label-bold text-xs rounded-2xl shadow-lg shadow-primary/25 hover:bg-primary-dark hover:scale-[1.02] transition-all"
            >
              Save General Settings
            </button>
          </form>
        )}

        {activeTab === 'Booking & Pricing' && (
          <form onSubmit={handleSaveSettings} className="space-y-6 max-w-2xl">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-label-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Base Rate Per Hour (₹) *</label>
                  <input
                    type="number"
                    required
                    value={slotRate}
                    onChange={(e) => setSlotRate(Number(e.target.value))}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-label-bold uppercase tracking-wider text-on-surface-variant mb-1.5">GST Rate (%) *</label>
                  <input
                    type="number"
                    required
                    value={gstRate}
                    onChange={(e) => setGstRate(Number(e.target.value))}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-label-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Cancellation Restriction Window (Hours) *</label>
                <input
                  type="number"
                  required
                  value={cancelWindowHours}
                  onChange={(e) => setCancelWindowHours(Number(e.target.value))}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                />
                <span className="text-[11px] text-on-surface-variant mt-1 block">
                  Bookings starting within this number of hours cannot be cancelled by customers.
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="min-h-[44px] px-6 py-3 bg-primary text-white font-label-bold text-xs rounded-2xl shadow-lg shadow-primary/25 hover:bg-primary-dark hover:scale-[1.02] transition-all"
            >
              Save Pricing Rules
            </button>
          </form>
        )}

        {activeTab === 'Audit Logs' && (
          <div className="space-y-4">
            <h2 className="font-bold text-base text-on-surface">Recent System Audit Trails</h2>
            <div className="overflow-x-auto rounded-2xl border border-black/5">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-container-low border-b border-black/5 text-on-surface-variant font-label-bold text-xs uppercase">
                  <tr>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Admin User</th>
                    <th className="p-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {mockAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-container-lowest transition-colors text-xs">
                      <td className="p-4 text-on-surface-variant font-mono">{log.timestamp}</td>
                      <td className="p-4 font-bold text-primary">{log.action}</td>
                      <td className="p-4 font-bold text-on-surface">{log.user}</td>
                      <td className="p-4 text-on-surface-variant">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
