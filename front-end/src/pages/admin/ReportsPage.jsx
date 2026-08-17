import React, { useState, useMemo } from 'react';
import { useBooking } from '../../context/BookingContext';
import { StatCard } from '../../components/admin/StatCard';
import { TIME_SLOTS } from '../../utils/bookingUtils';

// --- CUSTOM ZERO-DEPENDENCY SVG EXECUTIVE CHARTS ---

// 1. Revenue Trend Area/Line SVG Chart
const RevenueTrendChart = ({ data = [] }) => {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (!data || data.length === 0) return null;

  const maxRevenue = Math.max(...data.map(d => d.revenue), 1000);
  const width = 800;
  const height = 240;
  const paddingX = 40;
  const paddingY = 30;

  const points = data.map((d, index) => {
    const x = paddingX + (index / Math.max(data.length - 1, 1)) * (width - 2 * paddingX);
    const y = height - paddingY - (d.revenue / maxRevenue) * (height - 2 * paddingY);
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  return (
    <div className="w-full relative">
      <div className="overflow-x-auto pb-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[600px] h-auto overflow-visible select-none">
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = height - paddingY - ratio * (height - 2 * paddingY);
            const val = Math.round(ratio * maxRevenue);
            return (
              <g key={i}>
                <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" strokeWidth="1" />
                <text x={paddingX - 8} y={y + 4} textAnchor="end" className="text-[10px] fill-on-surface-variant font-mono">
                  ₹{val}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path d={areaD} fill="url(#revenueGrad)" />

          {/* Trend Line */}
          <path d={pathD} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Interactive Data Points & Hover Targets */}
          {points.map((p, i) => (
            <g key={i} className="group cursor-pointer" onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)}>
              <circle cx={p.x} cy={p.y} r={hoverIndex === i ? '6' : '4'} fill="#10b981" stroke="#ffffff" strokeWidth="2" className="transition-all" />
              {/* Invisible large touch target */}
              <circle cx={p.x} cy={p.y} r="12" fill="transparent" />
            </g>
          ))}
        </svg>
      </div>

      {/* Hover Tooltip Overlay */}
      {hoverIndex !== null && points[hoverIndex] && (
        <div className="absolute top-2 right-4 bg-surface-dark text-white p-3 rounded-2xl shadow-xl text-xs space-y-1 animate-fade-in z-20 border border-white/10">
          <div className="font-bold text-emerald-400">{points[hoverIndex].date}</div>
          <div>Revenue: <span className="font-bold text-white">₹{points[hoverIndex].revenue}</span></div>
        </div>
      )}
    </div>
  );
};

// 2. Day of Week Bar SVG Chart
const DayOfWeekChart = ({ data = [] }) => {
  const maxCount = Math.max(...data.map(d => d.count), 5);

  return (
    <div className="w-full space-y-3">
      <div className="grid grid-cols-7 gap-2 items-end h-44 pt-6 pb-2 border-b border-black/5">
        {data.map((d, i) => {
          const heightPercent = Math.max((d.count / maxCount) * 100, 4);
          return (
            <div key={i} className="flex flex-col items-center h-full justify-end group relative">
              {/* Tooltip on hover */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-surface-dark text-white text-[11px] font-bold px-2.5 py-1 rounded-lg pointer-events-none shadow-md z-10 whitespace-nowrap">
                {d.day}: {d.count} match(es)
              </div>
              <div className="w-full max-w-[36px] bg-primary/20 hover:bg-primary rounded-t-xl transition-all duration-300 relative flex justify-center items-start pt-1" style={{ height: `${heightPercent}%` }}>
                <span className="text-[10px] font-bold text-primary group-hover:text-white transition-colors">
                  {d.count > 0 ? d.count : ''}
                </span>
              </div>
              <span className="text-xs font-label-bold text-on-surface-variant mt-2">{d.day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 3. Chronological Peak Booking Hours Bar Chart
const PeakHoursChart = ({ data = [] }) => {
  const maxCount = Math.max(...data.map(d => d.count), 5);

  return (
    <div className="w-full space-y-3 overflow-x-auto pb-2">
      <div className="min-w-[700px] space-y-2">
        {data.map((d, i) => {
          const widthPercent = Math.max((d.count / maxCount) * 100, 2);
          return (
            <div key={i} className="flex items-center gap-3 text-xs group">
              <span className="w-36 font-mono text-on-surface-variant text-right flex-shrink-0 font-medium">{d.slot}</span>
              <div className="flex-grow bg-surface-container-low rounded-xl h-7 overflow-hidden relative flex items-center px-2">
                <div className="bg-primary/80 group-hover:bg-primary h-full rounded-xl transition-all duration-300 absolute left-0 top-0" style={{ width: `${widthPercent}%` }} />
                <span className="relative z-10 font-bold text-on-surface text-[11px] ml-2">
                  {d.count > 0 ? `${d.count} booking(s)` : ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 4. Customer Retention & Growth Segment Visualization
const CustomerRetentionChart = ({ newCount = 0, returningCount = 0 }) => {
  const total = newCount + returningCount || 1;
  const newPercent = Math.round((newCount / total) * 100);
  const returningPercent = Math.round((returningCount / total) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-xs">
        <div>
          <span className="font-bold text-on-surface text-sm block">Player Base Composition</span>
          <span className="text-on-surface-variant">Ratio of new vs repeat players</span>
        </div>
        <div className="text-right">
          <span className="font-bold text-primary text-base">{total}</span>
          <span className="text-on-surface-variant block text-[11px]">Total Active</span>
        </div>
      </div>

      {/* Dual Segment Progress Bar */}
      <div className="h-5 w-full bg-surface-container-low rounded-full overflow-hidden flex p-1 border border-black/5">
        <div className="bg-primary rounded-l-full transition-all duration-500" style={{ width: `${newPercent}%` }} title={`New: ${newCount} (${newPercent}%)`} />
        <div className="bg-tertiary rounded-r-full transition-all duration-500" style={{ width: `${returningPercent}%` }} title={`Returning: ${returningCount} (${returningPercent}%)`} />
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2">
        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-primary inline-block"></span>
            <span className="text-xs font-label-bold text-on-surface-variant">New Players</span>
          </div>
          <p className="font-bold text-xl text-primary">{newCount} <span className="text-xs font-normal text-on-surface-variant">({newPercent}%)</span></p>
          <p className="text-[11px] text-on-surface-variant">First reservation in period</p>
        </div>

        <div className="p-4 bg-tertiary/5 rounded-2xl border border-tertiary/20 space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-tertiary inline-block"></span>
            <span className="text-xs font-label-bold text-on-surface-variant">Returning Players</span>
          </div>
          <p className="font-bold text-xl text-tertiary">{returningCount} <span className="text-xs font-normal text-on-surface-variant">({returningPercent}%)</span></p>
          <p className="text-[11px] text-on-surface-variant">Repeat match reservations</p>
        </div>
      </div>
    </div>
  );
};

// --- MAIN EXECUTIVE DASHBOARD COMPONENT ---

export const ReportsPage = () => {
  const { bookings, customers } = useBooking();
  const [activeTab, setActiveTab] = useState('Revenue');
  const [dateFilter, setDateFilter] = useState('All');

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Synchronized Filtered Dataset (Used by KPI Cards, Charts, Secondary Metrics, and CSV Exporter)
  const filteredBookings = useMemo(() => {
    if (dateFilter === 'All') return bookings;

    if (dateFilter === 'Today') {
      return bookings.filter(b => (b.dateStr === todayStr || (typeof b.date === 'string' && b.date.startsWith(todayStr))));
    }

    if (dateFilter === 'ThisWeek') {
      const pastWeek = new Date(now.getTime() - 7 * 86400000);
      return bookings.filter(b => new Date(b.createdAt || b.date) >= pastWeek);
    }

    if (dateFilter === 'ThisMonth') {
      const pastMonth = new Date(now.getTime() - 30 * 86400000);
      return bookings.filter(b => new Date(b.createdAt || b.date) >= pastMonth);
    }

    return bookings;
  }, [bookings, dateFilter, todayStr, now]);

  // Executive KPI Calculations
  const totalGrossRevenue = useMemo(() => {
    return filteredBookings
      .filter(b => b.status !== 'Cancelled' && b.status !== 'Rejected')
      .reduce((sum, b) => sum + (b.totalAmount || ((b.slots?.length || b.timeSlots?.length || 1) * 354)), 0);
  }, [filteredBookings]);

  const revenueToday = useMemo(() => {
    return bookings
      .filter(b => (b.dateStr === todayStr || (typeof b.date === 'string' && b.date.startsWith(todayStr))) && b.status !== 'Cancelled' && b.status !== 'Rejected')
      .reduce((sum, b) => sum + (b.totalAmount || ((b.slots?.length || b.timeSlots?.length || 1) * 354)), 0);
  }, [bookings, todayStr]);

  const revenueThisWeek = useMemo(() => {
    const pastWeek = new Date(now.getTime() - 7 * 86400000);
    return bookings
      .filter(b => new Date(b.createdAt || b.date) >= pastWeek && b.status !== 'Cancelled' && b.status !== 'Rejected')
      .reduce((sum, b) => sum + (b.totalAmount || ((b.slots?.length || b.timeSlots?.length || 1) * 354)), 0);
  }, [bookings, now]);

  const revenueLast30Days = useMemo(() => {
    const pastMonth = new Date(now.getTime() - 30 * 86400000);
    return bookings
      .filter(b => new Date(b.createdAt || b.date) >= pastMonth && b.status !== 'Cancelled' && b.status !== 'Rejected')
      .reduce((sum, b) => sum + (b.totalAmount || ((b.slots?.length || b.timeSlots?.length || 1) * 354)), 0);
  }, [bookings, now]);

  const totalBookingsCount = filteredBookings.length;
  const todayBookingsCount = useMemo(() => {
    return bookings.filter(b => (b.dateStr === todayStr || (typeof b.date === 'string' && b.date.startsWith(todayStr)))).length;
  }, [bookings, todayStr]);

  const weekBookingsCount = useMemo(() => {
    const pastWeek = new Date(now.getTime() - 7 * 86400000);
    return bookings.filter(b => new Date(b.createdAt || b.date) >= pastWeek).length;
  }, [bookings, now]);

  const monthBookingsCount = useMemo(() => {
    const pastMonth = new Date(now.getTime() - 30 * 86400000);
    return bookings.filter(b => new Date(b.createdAt || b.date) >= pastMonth).length;
  }, [bookings, now]);

  // Chart 1: Revenue Trend — Last 30 Days (Rolling 30 days)
  const revenueTrendData = useMemo(() => {
    const map = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000).toISOString().split('T')[0];
      map[d] = 0;
    }
    filteredBookings.forEach(b => {
      if (b.status !== 'Cancelled' && b.status !== 'Rejected') {
        const dStr = typeof b.date === 'string' ? b.date.split('T')[0] : b.dateStr;
        if (map[dStr] !== undefined) {
          map[dStr] += (b.totalAmount || ((b.slots?.length || b.timeSlots?.length || 1) * 354));
        }
      }
    });
    return Object.entries(map).map(([date, revenue]) => ({ date, revenue })).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredBookings, now]);

  // Chart 2: Bookings by Day of Week
  const dayOfWeekData = useMemo(() => {
    const daysMap = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    filteredBookings.forEach(b => {
      if (b.status !== 'Cancelled' && b.status !== 'Rejected') {
        const d = new Date(b.date || b.createdAt);
        if (!isNaN(d.getTime())) {
          const dayName = dayNames[d.getDay()];
          if (daysMap[dayName] !== undefined) {
            daysMap[dayName] += 1;
          }
        }
      }
    });

    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({ day, count: daysMap[day] }));
  }, [filteredBookings]);

  // Chart 3: Peak Booking Hours (Chronologically ordered time slots)
  const peakHoursData = useMemo(() => {
    const slotMap = {};
    TIME_SLOTS.forEach(slot => { slotMap[slot] = 0; });

    filteredBookings.forEach(b => {
      if (b.status !== 'Cancelled' && b.status !== 'Rejected') {
        const slotsList = Array.isArray(b.slots) ? b.slots : (Array.isArray(b.timeSlots) ? b.timeSlots : []);
        slotsList.forEach(slot => {
          if (slotMap[slot] !== undefined) {
            slotMap[slot] += 1;
          }
        });
      }
    });

    return TIME_SLOTS.map(slot => ({ slot, count: slotMap[slot] }));
  }, [filteredBookings]);

  // Chart 4: Customer Retention & Growth Breakdown
  const { newCustomersCount, returningCustomersCount } = useMemo(() => {
    let newCount = 0;
    let returningCount = 0;

    customers.forEach(c => {
      const customerBookings = filteredBookings.filter(b => 
        (b.customerId === c.id || b.customerPhone === c.phone || b.mobileNumber === c.phone)
      );
      if (customerBookings.length === 1) {
        newCount += 1;
      } else if (customerBookings.length > 1) {
        returningCount += 1;
      }
    });

    return { newCustomersCount: newCount, returningCustomersCount: returningCount };
  }, [customers, filteredBookings]);

  // Secondary Compact Payment Method Insight
  const paymentMethodBreakdown = useMemo(() => {
    let payNowCount = 0;
    let payAtSpotCount = 0;

    filteredBookings.forEach(b => {
      if (b.status !== 'Cancelled' && b.status !== 'Rejected') {
        if (b.paymentMethod === 'Pay Now') payNowCount += 1;
        else payAtSpotCount += 1;
      }
    });

    return { payNowCount, payAtSpotCount };
  }, [filteredBookings]);

  // CSV Exporter (Uses synchronized filtered dataset & structured filenames)
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";

    if (activeTab === 'Revenue') {
      csvContent += "Date,Revenue (INR)\n";
      revenueTrendData.forEach(row => {
        csvContent += `${row.date},${row.revenue}\n`;
      });
    } else if (activeTab === 'Bookings') {
      csvContent += "Time Slot,Booking Count\n";
      peakHoursData.forEach(row => {
        csvContent += `"${row.slot}",${row.count}\n`;
      });
    } else if (activeTab === 'Customers') {
      csvContent += "Customer Name,Phone Number,Total Bookings,Tier Status\n";
      customers.forEach(c => {
        const name = (c.name || 'N/A').replace(/,/g, '');
        const phone = c.phone || 'N/A';
        const total = c.totalBookings || 1;
        const tier = total > 1 ? 'Returning Player' : 'New Player';
        csvContent += `${name},${phone},${total},${tier}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Elite_Pitch_${activeTab}_Report_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-fade-in text-on-surface">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-3xl font-extrabold text-on-surface">Reports & Business Intelligence</h1>
          <p className="text-on-surface-variant font-body-md text-sm mt-1">
            Executive revenue trends, peak booking hours, and player retention analytics.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="min-h-[44px] px-6 py-3 bg-primary text-white font-label-bold text-xs rounded-2xl shadow-lg shadow-primary/25 hover:bg-primary-dark hover:scale-[1.02] transition-all flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-lg">download</span>
          Export {activeTab} CSV
        </button>
      </div>

      {/* Navigation Tabs & Date Filter Toolbar */}
      <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto">
          {['Revenue', 'Bookings', 'Customers'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`min-h-[44px] px-5 py-2.5 rounded-2xl text-xs font-label-bold transition-all flex-shrink-0 ${
                activeTab === tab ? 'bg-primary text-white shadow-md shadow-primary/20 font-bold' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-variant'
              }`}
            >
              {tab} Intelligence
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto w-full md:w-auto">
          {['All', 'Today', 'ThisWeek', 'ThisMonth'].map((filter) => (
            <button
              key={filter}
              onClick={() => setDateFilter(filter)}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-label-bold transition-all flex-shrink-0 ${
                dateFilter === filter ? 'bg-surface-dark text-white font-bold' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-variant'
              }`}
            >
              {filter === 'ThisWeek' ? 'This Week' : filter === 'ThisMonth' ? 'This Month (30d)' : filter}
            </button>
          ))}
        </div>
      </div>

      {/* EXECUTIVE KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {activeTab === 'Revenue' && (
          <>
            <StatCard title="Filtered Gross Revenue" count={`₹${totalGrossRevenue}`} subtitle="Confirmed bookings in filter" icon="payments" iconBg="bg-primary/10" iconColor="text-primary" />
            <StatCard title="Revenue Today" count={`₹${revenueToday}`} subtitle="Today's confirmed income" icon="today" iconBg="bg-primary/10" iconColor="text-primary" />
            <StatCard title="Revenue This Week" count={`₹${revenueThisWeek}`} subtitle="Past 7 days income" icon="date_range" iconBg="bg-tertiary-container/30" iconColor="text-tertiary" />
            <StatCard title="Revenue Last 30 Days" count={`₹${revenueLast30Days}`} subtitle="30 days rolling total" icon="calendar_month" iconBg="bg-secondary-container" iconColor="text-secondary" />
          </>
        )}
        {activeTab === 'Bookings' && (
          <>
            <StatCard title="Filtered Total Bookings" count={totalBookingsCount} subtitle="Reservations in filter" icon="event_available" iconBg="bg-primary/10" iconColor="text-primary" />
            <StatCard title="Today's Bookings" count={todayBookingsCount} subtitle="Scheduled for today" icon="today" iconBg="bg-primary/10" iconColor="text-primary" />
            <StatCard title="This Week's Bookings" count={weekBookingsCount} subtitle="Past 7 days count" icon="date_range" iconBg="bg-tertiary-container/30" iconColor="text-tertiary" />
            <StatCard title="Last 30 Days Bookings" count={monthBookingsCount} subtitle="Past 30 days count" icon="calendar_month" iconBg="bg-secondary-container" iconColor="text-secondary" />
          </>
        )}
        {activeTab === 'Customers' && (
          <>
            <StatCard title="Total Players" count={customers.length} subtitle="Registered customer profiles" icon="groups" iconBg="bg-primary/10" iconColor="text-primary" />
            <StatCard title="New Players" count={newCustomersCount} subtitle="Single-booking players" icon="person_add" iconBg="bg-primary/10" iconColor="text-primary" />
            <StatCard title="Returning Players" count={returningCustomersCount} subtitle="Repeat match players" icon="published_with_changes" iconBg="bg-tertiary-container/30" iconColor="text-tertiary" />
            <StatCard title="Active Last 30 Days" count={customers.length} subtitle="Active player base" icon="history" iconBg="bg-secondary-container" iconColor="text-secondary" />
          </>
        )}
      </div>

      {/* COMPACT PAYMENT METHOD SECONDARY INSIGHT */}
      <div className="bg-white p-5 rounded-3xl border border-black/5 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">account_balance_wallet</span>
          <span className="font-bold text-on-surface">Payment Method Breakdown:</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-emerald-50 text-emerald-900 px-3 py-1.5 rounded-xl font-label-bold border border-emerald-200/60">
            Pay Now (Online): <strong>{paymentMethodBreakdown.payNowCount}</strong>
          </span>
          <span className="bg-amber-50 text-amber-900 px-3 py-1.5 rounded-xl font-label-bold border border-amber-200/60">
            Pay at Spot: <strong>{paymentMethodBreakdown.payAtSpotCount}</strong>
          </span>
        </div>
      </div>

      {/* VISUAL EXECUTIVE CHARTS GRID */}

      {/* CHART 1: REVENUE TREND (LAST 30 DAYS) */}
      {activeTab === 'Revenue' && (
        <div className="space-y-8">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-black/5 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-bold text-lg text-on-surface">Revenue Trend — Last 30 Days</h2>
                <p className="text-xs text-on-surface-variant">Daily gross income performance across the last 30 calendar days</p>
              </div>
              <span className="bg-primary/10 text-primary text-xs font-label-bold px-3 py-1 rounded-full">
                Rolling 30-Day View
              </span>
            </div>
            <RevenueTrendChart data={revenueTrendData} />
          </div>
        </div>
      )}

      {/* CHART 2 & 3: BOOKINGS BY DAY OF WEEK & PEAK HOURS */}
      {activeTab === 'Bookings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-black/5 shadow-sm space-y-6">
            <div>
              <h2 className="font-bold text-lg text-on-surface">Bookings by Day of Week</h2>
              <p className="text-xs text-on-surface-variant">Weekly distribution to identify peak reservation days</p>
            </div>
            <DayOfWeekChart data={dayOfWeekData} />
          </div>

          <div className="bg-white p-6 md:p-8 rounded-3xl border border-black/5 shadow-sm space-y-6">
            <div>
              <h2 className="font-bold text-lg text-on-surface">Peak Booking Hours</h2>
              <p className="text-xs text-on-surface-variant">Chronological slot demand from 06:00 AM to 12:00 AM</p>
            </div>
            <PeakHoursChart data={peakHoursData} />
          </div>
        </div>
      )}

      {/* CHART 4: CUSTOMER GROWTH & RETENTION */}
      {activeTab === 'Customers' && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-black/5 shadow-sm space-y-6">
          <div>
            <h2 className="font-bold text-lg text-on-surface">Customer Growth & Retention</h2>
            <p className="text-xs text-on-surface-variant">Analysis of new vs repeat players in the selected filter period</p>
          </div>
          <CustomerRetentionChart newCount={newCustomersCount} returningCount={returningCustomersCount} />
        </div>
      )}

      {/* SECONDARY COLLAPSIBLE DETAILED DATA TABLE SECTION */}
      <details className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm space-y-4 group">
        <summary className="font-bold text-sm text-on-surface cursor-pointer select-none flex justify-between items-center">
          <span>View Detailed Raw Data Dataset</span>
          <span className="material-symbols-outlined transition-transform group-open:rotate-180">expand_more</span>
        </summary>
        <div className="pt-4 overflow-x-auto rounded-2xl border border-black/5">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container-low border-b border-black/5 text-on-surface-variant font-label-bold text-xs uppercase">
              <tr>
                <th className="p-4">Date / Slot</th>
                <th className="p-4 text-right">Metric Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {activeTab === 'Revenue' && revenueTrendData.map((row) => (
                <tr key={row.date} className="hover:bg-surface-container-lowest transition-colors">
                  <td className="p-4 font-bold text-on-surface">{row.date}</td>
                  <td className="p-4 font-bold text-primary text-right">₹{row.revenue}</td>
                </tr>
              ))}
              {activeTab === 'Bookings' && peakHoursData.map((row) => (
                <tr key={row.slot} className="hover:bg-surface-container-lowest transition-colors">
                  <td className="p-4 font-medium text-on-surface">{row.slot}</td>
                  <td className="p-4 font-bold text-primary text-right">{row.count} booking(s)</td>
                </tr>
              ))}
              {activeTab === 'Customers' && customers.map((c) => (
                <tr key={c.id} className="hover:bg-surface-container-lowest transition-colors">
                  <td className="p-4 font-bold text-on-surface">{c.name} ({c.phone})</td>
                  <td className="p-4 font-bold text-primary text-right">{c.totalBookings || 1} match(es)</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
};
