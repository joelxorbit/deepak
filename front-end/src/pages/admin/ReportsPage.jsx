import React, { useState, useMemo } from 'react';
import { useBooking } from '../../context/BookingContext';
import { TIME_SLOTS } from '../../utils/bookingUtils';
import { getTodayString } from '../../utils/dateUtils';

// --- TIME WINDOW GROUPINGS (20 Slots grouped into 7 Strategic Blocks) ---
const TIME_WINDOWS = [
  { id: 'early_morning', label: 'Early Morning', range: '04:00 AM - 07:00 AM', slots: ['04:00 AM - 05:00 AM', '05:00 AM - 06:00 AM', '06:00 AM - 07:00 AM'] },
  { id: 'morning_prime', label: 'Morning Prime', range: '07:00 AM - 10:00 AM', slots: ['07:00 AM - 08:00 AM', '08:00 AM - 09:00 AM', '09:00 AM - 10:00 AM'] },
  { id: 'midday', label: 'Midday', range: '10:00 AM - 01:00 PM', slots: ['10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM', '12:00 PM - 01:00 PM'] },
  { id: 'afternoon', label: 'Afternoon', range: '01:00 PM - 04:00 PM', slots: ['01:00 PM - 02:00 PM', '02:00 PM - 03:00 PM', '03:00 PM - 04:00 PM'] },
  { id: 'evening_prime', label: 'Evening Prime', range: '04:00 PM - 07:00 PM', slots: ['04:00 PM - 05:00 PM', '05:00 PM - 06:00 PM', '06:00 PM - 07:00 PM'] },
  { id: 'night_peak', label: 'Night Peak', range: '07:00 PM - 10:00 PM', slots: ['07:00 PM - 08:00 PM', '08:00 PM - 09:00 PM', '09:00 PM - 10:00 PM'] },
  { id: 'late_night', label: 'Late Night', range: '10:00 PM - 12:00 AM', slots: ['10:00 PM - 11:00 PM', '11:00 PM - 12:00 AM'] }
];

// --- 1. INTERACTIVE BOOKING ACTIVITY TIMELINE (ZERO-DEPENDENCY SVG) ---
const BookingActivityChart = ({ data = [], mode = 'count' }) => {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="py-12 text-center text-on-surface-variant text-xs">
        No booking activity recorded for this period.
      </div>
    );
  }

  const maxValue = Math.max(
    ...data.map(d => mode === 'count' ? d.total : (d.confirmedVal + d.completedVal + d.pendingVal + d.cancelledVal)),
    mode === 'count' ? 5 : 2000
  );

  const width = 800;
  const height = 240;
  const paddingX = 45;
  const paddingY = 35;
  const barWidth = Math.max(Math.min((width - 2 * paddingX) / data.length - 8, 38), 12);

  return (
    <div className="w-full relative">
      <div className="overflow-x-auto pb-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[620px] h-auto overflow-visible select-none">
          {/* Y-Axis Gridlines & Value Labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = height - paddingY - ratio * (height - 2 * paddingY);
            const val = Math.round(ratio * maxValue);
            return (
              <g key={i}>
                <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" strokeWidth="1" />
                <text x={paddingX - 8} y={y + 4} textAnchor="end" className="text-[10px] fill-on-surface-variant font-mono">
                  {mode === 'count' ? val : `₹${val}`}
                </text>
              </g>
            );
          })}

          {/* Stacked Bars by Outcome */}
          {data.map((d, index) => {
            const x = paddingX + (index / Math.max(data.length - 1, 1)) * (width - 2 * paddingX) - barWidth / 2;
            const usableH = height - 2 * paddingY;

            const confVal = mode === 'count' ? d.confirmed : d.confirmedVal;
            const compVal = mode === 'count' ? d.completed : d.completedVal;
            const pendVal = mode === 'count' ? d.pending : d.pendingVal;
            const cancVal = mode === 'count' ? d.cancelled : d.cancelledVal;

            const confH = (confVal / maxValue) * usableH;
            const compH = (compVal / maxValue) * usableH;
            const pendH = (pendVal / maxValue) * usableH;
            const cancH = (cancVal / maxValue) * usableH;

            let currentY = height - paddingY;

            return (
              <g
                key={index}
                className="cursor-pointer group"
                onMouseEnter={() => setHoverIndex(index)}
                onMouseLeave={() => setHoverIndex(null)}
              >
                {/* Background column highlight on hover */}
                {hoverIndex === index && (
                  <rect
                    x={x - 4}
                    y={paddingY}
                    width={barWidth + 8}
                    height={usableH}
                    fill="#10b981"
                    fillOpacity="0.08"
                    rx="6"
                  />
                )}

                {/* Confirmed Segment (Emerald) */}
                {confH > 0 && (
                  <rect
                    x={x}
                    y={(currentY -= confH)}
                    width={barWidth}
                    height={confH}
                    fill="#10b981"
                    rx="3"
                    className="transition-all duration-200 group-hover:brightness-110"
                  />
                )}

                {/* Completed Segment (Sky Blue) */}
                {compH > 0 && (
                  <rect
                    x={x}
                    y={(currentY -= compH)}
                    width={barWidth}
                    height={compH}
                    fill="#0284c7"
                    rx="3"
                    className="transition-all duration-200 group-hover:brightness-110"
                  />
                )}

                {/* Pending Segment (Amber) */}
                {pendH > 0 && (
                  <rect
                    x={x}
                    y={(currentY -= pendH)}
                    width={barWidth}
                    height={pendH}
                    fill="#f59e0b"
                    rx="3"
                    className="transition-all duration-200 group-hover:brightness-110"
                  />
                )}

                {/* Cancelled Segment (Rose) */}
                {cancH > 0 && (
                  <rect
                    x={x}
                    y={(currentY -= cancH)}
                    width={barWidth}
                    height={cancH}
                    fill="#f43f5e"
                    rx="3"
                    className="transition-all duration-200 group-hover:brightness-110"
                  />
                )}

                {/* X-Axis Date/Slot Label */}
                <text
                  x={x + barWidth / 2}
                  y={height - paddingY + 16}
                  textAnchor="middle"
                  className="text-[10px] fill-on-surface-variant font-medium"
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Interactive Tooltip Card */}
      {hoverIndex !== null && data[hoverIndex] && (
        <div className="absolute top-1 right-3 bg-surface-dark text-white p-3.5 rounded-2xl shadow-xl text-xs space-y-1.5 z-20 border border-white/10 min-w-[190px] animate-fade-in pointer-events-none">
          <div className="flex justify-between items-center border-b border-white/10 pb-1">
            <span className="font-bold text-emerald-400">{data[hoverIndex].label}</span>
            <span className="text-[10px] text-white/70">{data[hoverIndex].fullDate || ''}</span>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Confirmed:
            </span>
            <span className="font-bold">{data[hoverIndex].confirmed} ({mode === 'count' ? '' : `₹${data[hoverIndex].confirmedVal}`})</span>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500"></span> Completed:
            </span>
            <span className="font-bold">{data[hoverIndex].completed} ({mode === 'count' ? '' : `₹${data[hoverIndex].completedVal}`})</span>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> Pending:
            </span>
            <span className="font-bold">{data[hoverIndex].pending} ({mode === 'count' ? '' : `₹${data[hoverIndex].pendingVal}`})</span>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span> Cancelled:
            </span>
            <span className="font-bold">{data[hoverIndex].cancelled} ({mode === 'count' ? '' : `₹${data[hoverIndex].cancelledVal}`})</span>
          </div>
          <div className="border-t border-white/10 pt-1 flex justify-between font-bold text-xs">
            <span>Total Bookings:</span>
            <span className="text-emerald-400">{data[hoverIndex].total}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// --- 2. DAY-OF-WEEK VOLUME SVG BAR CHART ---
const DayOfWeekChart = ({ data = [], peakDay = '' }) => {
  const maxCount = Math.max(...data.map(d => d.count), 5);

  return (
    <div className="w-full space-y-3">
      <div className="grid grid-cols-7 gap-2 items-end h-40 pt-4 pb-2 border-b border-black/5">
        {data.map((d, i) => {
          const heightPercent = Math.max((d.count / maxCount) * 100, 6);
          const isPeak = d.day === peakDay && d.count > 0;

          return (
            <div key={i} className="flex flex-col items-center h-full justify-end group relative">
              {/* Tooltip on hover */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-surface-dark text-white text-[11px] font-bold px-2 py-0.5 rounded-lg pointer-events-none shadow-md z-10 whitespace-nowrap">
                {d.day}: {d.count} booking(s)
              </div>
              <div
                className={`w-full max-w-[34px] rounded-t-xl transition-all duration-300 relative flex justify-center items-start pt-1 ${
                  isPeak ? 'bg-primary shadow-md shadow-primary/25' : 'bg-primary/20 hover:bg-primary/50'
                }`}
                style={{ height: `${heightPercent}%` }}
              >
                <span className={`text-[10px] font-bold ${isPeak ? 'text-white' : 'text-primary'}`}>
                  {d.count > 0 ? d.count : ''}
                </span>
              </div>
              <span className={`text-xs font-label-bold mt-2 ${isPeak ? 'text-primary font-extrabold' : 'text-on-surface-variant'}`}>
                {d.day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- MAIN TURF BUSINESS COMMAND CENTER COMPONENT ---
export const ReportsPage = () => {
  const { bookings = [], customers = [], blockedSlots = [] } = useBooking();

  // Filter State
  const [dateFilter, setDateFilter] = useState('ThisWeek');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [activityMode, setActivityMode] = useState('count'); // 'count' or 'value'
  const [rawTab, setRawTab] = useState('Bookings');

  const now = new Date();
  const todayStr = getTodayString();

  // Total operational slots per day
  const TOTAL_OPERATIONAL_SLOTS = TIME_SLOTS.length; // 20 hourly slots (04:00 AM - 12:00 AM)

  // 1. Synchronized Filtered Dataset
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const bDateStr = b.dateStr || (typeof b.date === 'string' ? b.date.split('T')[0] : '');

      if (dateFilter === 'Today') {
        return bDateStr === todayStr;
      }

      if (dateFilter === 'ThisWeek') {
        const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
        return bDateStr >= weekAgo && bDateStr <= todayStr;
      }

      if (dateFilter === 'ThisMonth') {
        const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];
        return bDateStr >= monthAgo && bDateStr <= todayStr;
      }

      if (dateFilter === 'Custom') {
        if (customStartDate && bDateStr < customStartDate) return false;
        if (customEndDate && bDateStr > customEndDate) return false;
        return true;
      }

      return true;
    });
  }, [bookings, dateFilter, customStartDate, customEndDate, todayStr, now]);

  // 2. Today's Live Status & Capacity Utilization
  const todayStatus = useMemo(() => {
    const todayBookings = bookings.filter(b => {
      const d = b.dateStr || (typeof b.date === 'string' ? b.date.split('T')[0] : '');
      return d === todayStr && b.status !== 'Cancelled' && b.status !== 'Rejected';
    });

    let bookedSlotsSet = new Set();
    todayBookings.forEach(b => {
      const slots = Array.isArray(b.slots) ? b.slots : (Array.isArray(b.timeSlots) ? b.timeSlots : []);
      slots.forEach(s => bookedSlotsSet.add(s));
    });

    // Blocked slots for today
    let blockedSlotsSet = new Set();
    blockedSlots.forEach(block => {
      const bDate = block.date || block.dateStr;
      if (bDate === todayStr) {
        if (Array.isArray(block.slots)) {
          block.slots.forEach(s => blockedSlotsSet.add(s));
        } else if (block.slot) {
          blockedSlotsSet.add(block.slot);
        }
      }
    });

    const bookedCount = bookedSlotsSet.size;
    const blockedCount = blockedSlotsSet.size;
    const availableCount = Math.max(0, TOTAL_OPERATIONAL_SLOTS - bookedCount - blockedCount);
    const utilizationPct = Math.min(100, Math.round((bookedCount / TOTAL_OPERATIONAL_SLOTS) * 100));

    let benchmarkLabel = 'Off-Peak Pace';
    let benchmarkBadge = 'bg-amber-100 text-amber-800 border-amber-200';
    if (utilizationPct >= 70) {
      benchmarkLabel = 'High Demand Day';
      benchmarkBadge = 'bg-emerald-100 text-emerald-800 border-emerald-200';
    } else if (utilizationPct >= 40) {
      benchmarkLabel = 'Healthy Utilization';
      benchmarkBadge = 'bg-blue-100 text-blue-800 border-blue-200';
    }

    return {
      bookedCount,
      blockedCount,
      availableCount,
      utilizationPct,
      benchmarkLabel,
      benchmarkBadge
    };
  }, [bookings, blockedSlots, todayStr, TOTAL_OPERATIONAL_SLOTS]);

  // 3. Booking Activity Timeline Data
  const activityTimelineData = useMemo(() => {
    if (dateFilter === 'Today') {
      // Group today's activity by the 7 strategic time blocks
      return TIME_WINDOWS.map(tw => {
        let confirmed = 0;
        let completed = 0;
        let pending = 0;
        let cancelled = 0;
        let confirmedVal = 0;
        let completedVal = 0;
        let pendingVal = 0;
        let cancelledVal = 0;

        filteredBookings.forEach(b => {
          const slots = Array.isArray(b.slots) ? b.slots : (Array.isArray(b.timeSlots) ? b.timeSlots : []);
          const hasMatch = slots.some(s => tw.slots.includes(s));
          if (hasMatch) {
            const val = b.totalAmount || b.subtotal || 0;
            if (b.status === 'Completed') {
              completed += 1;
              completedVal += val;
            } else if (b.status === 'Cancelled' || b.status === 'Rejected') {
              cancelled += 1;
              cancelledVal += val;
            } else if (b.status === 'Pending') {
              pending += 1;
              pendingVal += val;
            } else {
              confirmed += 1;
              confirmedVal += val;
            }
          }
        });

        const total = confirmed + completed + pending + cancelled;
        return {
          label: tw.label,
          fullDate: tw.range,
          confirmed,
          completed,
          pending,
          cancelled,
          confirmedVal,
          completedVal,
          pendingVal,
          cancelledVal,
          total
        };
      });
    }

    // Default: Multi-day timeline (rolling up to 7 or 30 days)
    const dayCount = dateFilter === 'ThisMonth' ? 14 : 7;
    const timeline = [];

    for (let i = dayCount - 1; i >= 0; i--) {
      const dObj = new Date(now.getTime() - i * 86400000);
      const dStr = dObj.toISOString().split('T')[0];
      const shortLabel = dObj.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });

      let confirmed = 0;
      let completed = 0;
      let pending = 0;
      let cancelled = 0;
      let confirmedVal = 0;
      let completedVal = 0;
      let pendingVal = 0;
      let cancelledVal = 0;

      filteredBookings.forEach(b => {
        const bDate = b.dateStr || (typeof b.date === 'string' ? b.date.split('T')[0] : '');
        if (bDate === dStr) {
          const val = b.totalAmount || b.subtotal || 0;
          if (b.status === 'Completed') {
            completed += 1;
            completedVal += val;
          } else if (b.status === 'Cancelled' || b.status === 'Rejected') {
            cancelled += 1;
            cancelledVal += val;
          } else if (b.status === 'Pending') {
            pending += 1;
            pendingVal += val;
          } else {
            confirmed += 1;
            confirmedVal += val;
          }
        }
      });

      const total = confirmed + completed + pending + cancelled;
      timeline.push({
        label: shortLabel,
        fullDate: dStr,
        confirmed,
        completed,
        pending,
        cancelled,
        confirmedVal,
        completedVal,
        pendingVal,
        cancelledVal,
        total
      });
    }

    return timeline;
  }, [filteredBookings, dateFilter, now]);

  // 4. Time Window Heatmap & Peak Demand Distribution
  const timeWindowStats = useMemo(() => {
    const totalSlotsBooked = filteredBookings
      .filter(b => b.status !== 'Cancelled' && b.status !== 'Rejected')
      .reduce((sum, b) => {
        const slots = Array.isArray(b.slots) ? b.slots : (Array.isArray(b.timeSlots) ? b.timeSlots : []);
        return sum + slots.length;
      }, 0) || 1;

    const stats = TIME_WINDOWS.map(tw => {
      let count = 0;
      filteredBookings.forEach(b => {
        if (b.status !== 'Cancelled' && b.status !== 'Rejected') {
          const slots = Array.isArray(b.slots) ? b.slots : (Array.isArray(b.timeSlots) ? b.timeSlots : []);
          slots.forEach(s => {
            if (tw.slots.includes(s)) count += 1;
          });
        }
      });

      const percentage = Math.round((count / totalSlotsBooked) * 100);
      return {
        ...tw,
        count,
        percentage
      };
    });

    const maxCount = Math.max(...stats.map(s => s.count), 0);
    const peakWindow = stats.find(s => s.count === maxCount && s.count > 0);

    return { stats, peakWindow, totalSlotsBooked };
  }, [filteredBookings]);

  // 5. Day of Week Pattern (Mon to Sun)
  const dayOfWeekStats = useMemo(() => {
    const dayMap = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    filteredBookings.forEach(b => {
      if (b.status !== 'Cancelled' && b.status !== 'Rejected') {
        const d = new Date(b.date || b.createdAt);
        if (!isNaN(d.getTime())) {
          const name = dayNames[d.getDay()];
          if (dayMap[name] !== undefined) {
            dayMap[name] += 1;
          }
        }
      }
    });

    const list = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
      day,
      count: dayMap[day]
    }));

    const maxDay = list.reduce((max, cur) => cur.count > max.count ? cur : max, { day: 'Mon', count: 0 });
    const weekdayCount = dayMap.Mon + dayMap.Tue + dayMap.Wed + dayMap.Thu + dayMap.Fri;
    const weekendCount = dayMap.Sat + dayMap.Sun;
    const total = weekdayCount + weekendCount || 1;

    return {
      list,
      peakDay: maxDay.count > 0 ? maxDay.day : '',
      weekdayCount,
      weekendCount,
      weekdayPct: Math.round((weekdayCount / total) * 100),
      weekendPct: Math.round((weekendCount / total) * 100)
    };
  }, [filteredBookings]);

  // 6. Customer Behaviour & Frequency Distribution
  const customerAnalytics = useMemo(() => {
    // Unique customers in filtered bookings
    const customerMap = {};

    filteredBookings.forEach(b => {
      const key = b.customerId || b.customerPhone || b.mobileNumber || b.customerName || 'Anonymous';
      if (!customerMap[key]) {
        customerMap[key] = {
          name: b.customerName || 'Guest Player',
          phone: b.customerPhone || b.mobileNumber || 'N/A',
          bookingsCount: 0,
          totalSpent: 0
        };
      }
      customerMap[key].bookingsCount += 1;
      if (b.status !== 'Cancelled' && b.status !== 'Rejected') {
        customerMap[key].totalSpent += (b.totalAmount || b.subtotal || 0);
      }
    });

    const activeCustomerProfiles = Object.values(customerMap);
    const totalActive = activeCustomerProfiles.length || 1;

    let newCount = 0; // 1 booking
    let casualCount = 0; // 2 bookings
    let regularCount = 0; // 3-5 bookings
    let vipCount = 0; // 6+ bookings

    activeCustomerProfiles.forEach(c => {
      if (c.bookingsCount === 1) newCount += 1;
      else if (c.bookingsCount === 2) casualCount += 1;
      else if (c.bookingsCount >= 3 && c.bookingsCount <= 5) regularCount += 1;
      else if (c.bookingsCount >= 6) vipCount += 1;
    });

    const returningCount = casualCount + regularCount + vipCount;
    const repeatRate = Math.round((returningCount / totalActive) * 100);
    const avgBookingsPerCustomer = (filteredBookings.length / totalActive).toFixed(1);

    return {
      totalActive,
      newCount,
      returningCount,
      casualCount,
      regularCount,
      vipCount,
      repeatRate,
      avgBookingsPerCustomer,
      activeCustomerProfiles
    };
  }, [filteredBookings]);

  // 7. Booking Pipeline & Conversion Funnel
  const pipelineStats = useMemo(() => {
    const totalRequests = filteredBookings.length;
    const confirmed = filteredBookings.filter(b => b.status !== 'Cancelled' && b.status !== 'Rejected').length;
    const paid = filteredBookings.filter(b =>
      (b.paymentStatus === 'Fully Paid' || b.paymentStatus === 'Advance Paid' || b.paymentOption === 'ADVANCE' || b.paymentOption === 'FULL' || b.paymentMethod === 'Pay Now') &&
      b.status !== 'Cancelled' && b.status !== 'Rejected'
    ).length;
    const completed = filteredBookings.filter(b => b.status === 'Completed').length;
    const cancelled = filteredBookings.filter(b => b.status === 'Cancelled' || b.status === 'Rejected').length;

    const base = totalRequests || 1;
    const confirmationRate = Math.round((confirmed / base) * 100);
    const paymentRate = Math.round((paid / base) * 100);
    const completionRate = Math.round((completed / base) * 100);
    const cancellationRate = Math.round((cancelled / base) * 100);

    return {
      totalRequests,
      confirmed,
      paid,
      completed,
      cancelled,
      confirmationRate,
      paymentRate,
      completionRate,
      cancellationRate
    };
  }, [filteredBookings]);

  // 8. Cancellations & Payment Breakdown
  const financialBehaviour = useMemo(() => {
    let lostRevenue = 0;
    let fullyPaidCount = 0;
    let advancePaidCount = 0;
    let cashPendingCount = 0;

    let fullyPaidAmount = 0;
    let advancePaidAmount = 0;
    let pendingBalanceAmount = 0;
    let totalGrossRevenue = 0;
    let totalDiscounts = 0;

    filteredBookings.forEach(b => {
      const amount = b.totalAmount || b.subtotal || 0;
      const discount = b.discountAmount || 0;
      totalDiscounts += discount;

      if (b.status === 'Cancelled' || b.status === 'Rejected') {
        lostRevenue += amount;
      } else {
        totalGrossRevenue += amount;
        const isAdvance = b.paymentOption === 'ADVANCE' || b.paymentStatus === 'Advance Paid' || b.paymentMethod === 'Advance Paid';
        const isFull = b.paymentOption === 'FULL' || b.paymentStatus === 'Fully Paid' || b.paymentMethod === 'Fully Paid' || b.paymentStatus === 'Paid' || b.paymentMethod === 'Pay Now';

        if (isFull) {
          fullyPaidCount += 1;
          fullyPaidAmount += amount;
        } else if (isAdvance) {
          advancePaidCount += 1;
          const adv = b.advanceAmount || (amount > 0 ? Math.round(amount * 0.4) : 0);
          advancePaidAmount += adv;
          pendingBalanceAmount += Math.max(0, amount - adv);
        } else {
          cashPendingCount += 1;
          pendingBalanceAmount += amount;
        }
      }
    });

    const collectedTotal = fullyPaidAmount + advancePaidAmount;
    const collectionPct = totalGrossRevenue > 0 ? Math.min(100, Math.round((collectedTotal / totalGrossRevenue) * 100)) : 100;

    return {
      lostRevenue,
      fullyPaidCount,
      advancePaidCount,
      cashPendingCount,
      fullyPaidAmount,
      advancePaidAmount,
      pendingBalanceAmount,
      totalGrossRevenue,
      totalDiscounts,
      collectedTotal,
      collectionPct
    };
  }, [filteredBookings]);

  // 9. Dynamic Business Recommendations & Insights
  const dynamicRecommendations = useMemo(() => {
    const insights = [];

    // A. Peak Window Insight
    if (timeWindowStats.peakWindow && timeWindowStats.peakWindow.count > 0) {
      insights.push({
        type: 'Peak Demand',
        badge: 'Top Performer',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: 'trending_up',
        title: `${timeWindowStats.peakWindow.label} (${timeWindowStats.peakWindow.range}) dominates turf traffic`,
        description: `This window accounts for ${timeWindowStats.peakWindow.percentage}% of all match slots. Consider enforcing premium rate rules or non-refundable slot policies for this window.`,
        action: 'Configure Peak Rate Rules'
      });
    }

    // B. Off-Peak Daytime Utilization Insight
    const midday = timeWindowStats.stats.find(s => s.id === 'midday');
    const afternoon = timeWindowStats.stats.find(s => s.id === 'afternoon');
    const lowDaytime = (midday && midday.percentage < 10) || (afternoon && afternoon.percentage < 10);

    if (lowDaytime) {
      insights.push({
        type: 'Off-Peak Opportunity',
        badge: 'Growth Opportunity',
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: 'lightbulb',
        title: 'Midday and afternoon slots are underutilized',
        description: 'Daytime slots (10:00 AM - 04:00 PM) have high spare capacity. Launch promotional happy-hour rates or partner with local academies for morning/afternoon practice sessions.',
        action: 'Promote Off-Peak Slots'
      });
    }

    // C. Retention & Repeat Players
    if (customerAnalytics.repeatRate >= 40) {
      insights.push({
        type: 'Player Loyalty',
        badge: 'Healthy Retention',
        badgeClass: 'bg-primary/10 text-primary border-primary/20',
        icon: 'stars',
        title: `Strong player loyalty with ${customerAnalytics.repeatRate}% repeat reservation rate`,
        description: `You have ${customerAnalytics.returningCount} returning players. Introducing a 5-match team subscription or tournament league can lock in recurring monthly turf revenue.`,
        action: 'Launch Loyalty Pass'
      });
    } else {
      insights.push({
        type: 'Player Acquisition',
        badge: 'Nurture Leads',
        badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        icon: 'person_add',
        title: `High acquisition of new players (${customerAnalytics.newCount} single bookings)`,
        description: 'Most bookings are from first-time visitors. Send automated post-match re-engagement coupons to convert them into weekly regular squads.',
        action: 'Issue Repeat Coupons'
      });
    }

    // D. Lost Revenue & Cancellation Warning
    if (pipelineStats.cancellationRate > 10 || financialBehaviour.lostRevenue > 0) {
      insights.push({
        type: 'Revenue Leakage',
        badge: 'Attention Needed',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
        icon: 'warning',
        title: `₹${financialBehaviour.lostRevenue.toLocaleString('en-IN')} lost to cancellations (${pipelineStats.cancellationRate}% cancellation rate)`,
        description: `${pipelineStats.cancelled} bookings were cancelled or rejected. Tighten advance payment thresholds to reduce last-minute no-shows.`,
        action: 'Review Cancellation Policy'
      });
    }

    return insights;
  }, [timeWindowStats, customerAnalytics, pipelineStats, financialBehaviour]);

  // Contextual CSV Exporter
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Booking ID,Customer Name,Phone,Date,Time Slots,Status,Payment Status,Total Amount (INR)\n";

    filteredBookings.forEach(b => {
      const id = b.id || 'N/A';
      const name = (b.customerName || 'N/A').replace(/,/g, '');
      const phone = b.customerPhone || b.mobileNumber || 'N/A';
      const date = b.dateStr || (typeof b.date === 'string' ? b.date.split('T')[0] : 'N/A');
      const slots = Array.isArray(b.slots) ? b.slots.join(' | ') : (Array.isArray(b.timeSlots) ? b.timeSlots.join(' | ') : 'N/A');
      const status = b.status || 'Confirmed';
      const pStatus = b.paymentStatus || 'Pending';
      const amount = b.totalAmount || b.subtotal || 0;

      csvContent += `"${id}","${name}","${phone}","${date}","${slots}","${status}","${pStatus}",${amount}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Elite_Pitch_Booking_Insights_${dateFilter}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-fade-in text-on-surface">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse inline-block"></span>
            <span className="text-xs font-label-bold text-primary tracking-wider uppercase">Turf Command Center</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-3xl font-extrabold text-on-surface mt-1">
            Booking Insights
          </h1>
          <p className="text-on-surface-variant font-body-md text-sm mt-1 max-w-2xl">
            Understand how your turf is being used, when demand is highest, and where bookings are being lost.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="min-h-[44px] px-6 py-3 bg-primary text-white font-label-bold text-xs rounded-2xl shadow-lg shadow-primary/25 hover:bg-primary-dark hover:scale-[1.02] transition-all flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-lg">download</span>
          Export Intelligence CSV
        </button>
      </div>

      {/* 2. FILTER BAR */}
      <div className="bg-white p-5 rounded-3xl border border-black/5 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {[
            { id: 'Today', label: 'Today' },
            { id: 'ThisWeek', label: 'This Week' },
            { id: 'ThisMonth', label: 'This Month' },
            { id: 'Custom', label: 'Custom' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setDateFilter(tab.id)}
              className={`min-h-[42px] px-5 py-2 rounded-2xl text-xs font-label-bold transition-all flex-shrink-0 ${
                dateFilter === tab.id
                  ? 'bg-primary text-white shadow-md shadow-primary/20 font-bold'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-variant'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Inline Custom Date Range Picker */}
        {dateFilter === 'Custom' && (
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto bg-surface-container-low p-2 rounded-2xl border border-black/5 animate-fade-in">
            <span className="text-xs font-medium text-on-surface-variant pl-2">Range:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={e => setCustomStartDate(e.target.value)}
              className="bg-white text-on-surface px-3 py-1.5 rounded-xl text-xs border border-black/10 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="text-xs text-on-surface-variant">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={e => setCustomEndDate(e.target.value)}
              className="bg-white text-on-surface px-3 py-1.5 rounded-xl text-xs border border-black/10 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}

        <div className="text-xs text-on-surface-variant font-medium">
          Showing <strong>{filteredBookings.length}</strong> reservation records
        </div>
      </div>

      {/* 3. CURRENT TURF STATUS (TODAY'S LIVE METRICS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Today's Slot Schedule Meter */}
        <div className="bg-white/95 p-6 rounded-3xl border border-black/5 shadow-sm space-y-4 relative overflow-hidden group">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-label-bold uppercase tracking-wider text-on-surface-variant">
                Today's Slot Schedule
              </span>
            </div>
            <span className="text-[11px] font-mono font-medium px-2.5 py-1 bg-surface-container-low rounded-xl text-on-surface-variant">
              {todayStr}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="font-display-lg text-4xl font-extrabold text-on-surface">
              {todayStatus.bookedCount}
            </span>
            <span className="text-sm font-medium text-on-surface-variant">
              / {TOTAL_OPERATIONAL_SLOTS} Slots Booked Today
            </span>
          </div>

          {/* Segmented Progress Meter */}
          <div className="h-4 w-full bg-surface-container-low rounded-full overflow-hidden flex p-0.5 border border-black/5">
            <div
              className="bg-emerald-500 rounded-l-full transition-all duration-500"
              style={{ width: `${(todayStatus.bookedCount / TOTAL_OPERATIONAL_SLOTS) * 100}%` }}
              title={`Booked: ${todayStatus.bookedCount}`}
            />
            <div
              className="bg-amber-500 transition-all duration-500"
              style={{ width: `${(todayStatus.blockedCount / TOTAL_OPERATIONAL_SLOTS) * 100}%` }}
              title={`Blocked: ${todayStatus.blockedCount}`}
            />
            <div
              className="bg-slate-200 rounded-r-full transition-all duration-500"
              style={{ width: `${(todayStatus.availableCount / TOTAL_OPERATIONAL_SLOTS) * 100}%` }}
              title={`Available: ${todayStatus.availableCount}`}
            />
          </div>

          {/* Segment Legend */}
          <div className="flex flex-wrap items-center justify-between text-xs pt-1 border-t border-black/5">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Booked: <strong>{todayStatus.bookedCount}</strong>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Maintenance: <strong>{todayStatus.blockedCount}</strong>
            </span>
            <span className="flex items-center gap-1.5 font-medium text-on-surface-variant">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> Open: <strong>{todayStatus.availableCount}</strong>
            </span>
          </div>
        </div>

        {/* Card 2: Turf Capacity Utilization % */}
        <div className="bg-white/95 p-6 rounded-3xl border border-black/5 shadow-sm space-y-4 relative overflow-hidden group">
          <div className="flex justify-between items-center">
            <span className="text-xs font-label-bold uppercase tracking-wider text-on-surface-variant">
              Turf Capacity Utilization
            </span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${todayStatus.benchmarkBadge}`}>
              {todayStatus.benchmarkLabel}
            </span>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="font-display-lg text-4xl font-extrabold text-primary">
              {todayStatus.utilizationPct}%
            </span>
            <span className="text-xs text-on-surface-variant font-medium">
              capacity absorbed today
            </span>
          </div>

          {/* Large Capacity Progress Bar */}
          <div className="h-3 w-full bg-surface-container-low rounded-full overflow-hidden border border-black/5">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${todayStatus.utilizationPct}%` }}
            />
          </div>

          <p className="text-xs text-on-surface-variant leading-relaxed">
            {todayStatus.utilizationPct > 60
              ? 'Peak performance today. Almost all evening and prime-time slots have been locked.'
              : 'Spare capacity available today. Consider sending an alert for open evening slots.'}
          </p>
        </div>
      </div>

      {/* 4. BOOKING ACTIVITY TIMELINE (HERO OPERATIONAL CHART) */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-black/5 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-lg text-on-surface">Booking Activity Timeline</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Daily reservation volumes segmented by outcome (Confirmed, Completed, Pending, Cancelled)
            </p>
          </div>

          {/* Toggle Controls & Legend */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex bg-surface-container-low p-1 rounded-2xl border border-black/5 text-xs font-label-bold">
              <button
                onClick={() => setActivityMode('count')}
                className={`px-3 py-1.5 rounded-xl transition-all ${activityMode === 'count' ? 'bg-white shadow text-primary font-bold' : 'text-on-surface-variant'}`}
              >
                Slot Count
              </button>
              <button
                onClick={() => setActivityMode('value')}
                className={`px-3 py-1.5 rounded-xl transition-all ${activityMode === 'value' ? 'bg-white shadow text-primary font-bold' : 'text-on-surface-variant'}`}
              >
                Booking Value (₹)
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Confirmed</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span> Completed</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Pending</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Cancelled</span>
            </div>
          </div>
        </div>

        <BookingActivityChart data={activityTimelineData} mode={activityMode} />
      </div>

      {/* 5. DEMAND & TIME BEHAVIOUR (2-COLUMN GRID) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Column A: Time Window Demand Heatmap */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-black/5 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-bold text-lg text-on-surface">Time Window Demand Heatmap</h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Demand distribution across 7 strategic time blocks
              </p>
            </div>
            {timeWindowStats.peakWindow && (
              <span className="text-[11px] font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                Peak: {timeWindowStats.peakWindow.label}
              </span>
            )}
          </div>

          <div className="space-y-3.5">
            {timeWindowStats.stats.map(tw => {
              const isPeak = timeWindowStats.peakWindow && timeWindowStats.peakWindow.id === tw.id && tw.count > 0;
              return (
                <div key={tw.id} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-on-surface">{tw.label}</span>
                      <span className="text-[11px] text-on-surface-variant ml-2 font-mono">({tw.range})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-on-surface">{tw.count} slot(s)</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                        isPeak
                          ? 'bg-primary text-white'
                          : tw.percentage > 15
                          ? 'bg-emerald-100 text-emerald-800'
                          : tw.percentage > 5
                          ? 'bg-blue-50 text-blue-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {tw.percentage}%
                      </span>
                    </div>
                  </div>

                  <div className="h-2.5 w-full bg-surface-container-low rounded-full overflow-hidden border border-black/5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isPeak ? 'bg-primary' : tw.percentage > 15 ? 'bg-emerald-400' : 'bg-primary/40'
                      }`}
                      style={{ width: `${Math.max(tw.percentage, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column B: Day-of-Week Volume & Pattern */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-black/5 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-bold text-lg text-on-surface">Weekly Booking Cadence</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Reservation volume by day of week highlighting demand surges
                </p>
              </div>
              {dayOfWeekStats.peakDay && (
                <span className="text-[11px] font-bold px-2.5 py-1 bg-primary text-white rounded-full shadow-sm shadow-primary/20">
                  Peak Day: {dayOfWeekStats.peakDay}
                </span>
              )}
            </div>

            <DayOfWeekChart data={dayOfWeekStats.list} peakDay={dayOfWeekStats.peakDay} />
          </div>

          {/* Weekday vs Weekend Comparison Strip */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-black/5">
            <div className="p-4 bg-surface-container-low rounded-2xl space-y-1">
              <span className="text-xs font-label-bold text-on-surface-variant">Weekdays (Mon - Fri)</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-on-surface">{dayOfWeekStats.weekdayCount}</span>
                <span className="text-xs font-semibold text-primary">({dayOfWeekStats.weekdayPct}%)</span>
              </div>
              <p className="text-[11px] text-on-surface-variant">{(dayOfWeekStats.weekdayCount / 5).toFixed(1)} avg bookings/day</p>
            </div>

            <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl space-y-1">
              <span className="text-xs font-label-bold text-primary">Weekends (Sat - Sun)</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-primary">{dayOfWeekStats.weekendCount}</span>
                <span className="text-xs font-semibold text-primary">({dayOfWeekStats.weekendPct}%)</span>
              </div>
              <p className="text-[11px] text-on-surface-variant">{(dayOfWeekStats.weekendCount / 2).toFixed(1)} avg bookings/day</p>
            </div>
          </div>
        </div>
      </div>

      {/* 6. CUSTOMER BEHAVIOUR & PLAYER RETENTION */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-black/5 shadow-sm space-y-6">
        <div>
          <h2 className="font-bold text-lg text-on-surface">Customer Behaviour & Player Retention</h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Ratio of first-time explorers vs repeat squads and match frequency tiers
          </p>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-surface-container-low rounded-2xl border border-black/5 space-y-1">
            <span className="text-xs font-label-bold text-on-surface-variant">New Players</span>
            <div className="text-2xl font-bold text-on-surface">{customerAnalytics.newCount}</div>
            <p className="text-[11px] text-on-surface-variant">First match in filtered period</p>
          </div>

          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 space-y-1">
            <span className="text-xs font-label-bold text-primary">Returning Players</span>
            <div className="text-2xl font-bold text-primary">{customerAnalytics.returningCount}</div>
            <p className="text-[11px] text-on-surface-variant">2 or more reservations</p>
          </div>

          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200/60 space-y-1">
            <span className="text-xs font-label-bold text-emerald-800">Repeat Booking Rate</span>
            <div className="text-2xl font-bold text-emerald-700">{customerAnalytics.repeatRate}%</div>
            <p className="text-[11px] text-on-surface-variant">Of active players return</p>
          </div>

          <div className="p-4 bg-surface-container-low rounded-2xl border border-black/5 space-y-1">
            <span className="text-xs font-label-bold text-on-surface-variant">Avg Bookings / Player</span>
            <div className="text-2xl font-bold text-on-surface">{customerAnalytics.avgBookingsPerCustomer}</div>
            <p className="text-[11px] text-on-surface-variant">Matches per player profile</p>
          </div>
        </div>

        {/* Customer Frequency Distribution Bar */}
        <div className="space-y-3 pt-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-on-surface">Player Frequency Distribution</span>
            <span className="text-on-surface-variant">{customerAnalytics.totalActive} Total Active Player Profiles</span>
          </div>

          {/* Segmented Distribution Bar */}
          <div className="h-4 w-full bg-surface-container-low rounded-full overflow-hidden flex p-0.5 border border-black/5">
            <div
              className="bg-slate-400 rounded-l-full transition-all duration-500"
              style={{ width: `${(customerAnalytics.newCount / customerAnalytics.totalActive) * 100}%` }}
              title={`1 Booking: ${customerAnalytics.newCount}`}
            />
            <div
              className="bg-blue-400 transition-all duration-500"
              style={{ width: `${(customerAnalytics.casualCount / customerAnalytics.totalActive) * 100}%` }}
              title={`2 Bookings: ${customerAnalytics.casualCount}`}
            />
            <div
              className="bg-emerald-500 transition-all duration-500"
              style={{ width: `${(customerAnalytics.regularCount / customerAnalytics.totalActive) * 100}%` }}
              title={`3-5 Bookings: ${customerAnalytics.regularCount}`}
            />
            <div
              className="bg-primary rounded-r-full transition-all duration-500"
              style={{ width: `${(customerAnalytics.vipCount / customerAnalytics.totalActive) * 100}%` }}
              title={`6+ Bookings: ${customerAnalytics.vipCount}`}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
              <span>1 Match (One-Time): <strong>{customerAnalytics.newCount}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
              <span>2 Matches (Casual): <strong>{customerAnalytics.casualCount}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>3-5 Matches (Regular): <strong>{customerAnalytics.regularCount}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
              <span>6+ Matches (VIP Squad): <strong>{customerAnalytics.vipCount}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* 7. BOOKING PIPELINE & CONVERSION FUNNEL */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-black/5 shadow-sm space-y-6">
        <div>
          <h2 className="font-bold text-lg text-on-surface">Booking Pipeline & Outcomes Funnel</h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Progression from initial customer inquiries to completed matches and drop-offs
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Stage 1: Requests */}
          <div className="p-4 bg-surface-container-low rounded-2xl border border-black/5 space-y-2 relative">
            <div className="text-[11px] font-label-bold uppercase text-on-surface-variant">1. Total Requests</div>
            <div className="text-2xl font-bold text-on-surface">{pipelineStats.totalRequests}</div>
            <div className="text-[11px] text-on-surface-variant font-medium">100% Pipeline Base</div>
          </div>

          {/* Stage 2: Confirmed */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200/60 rounded-2xl space-y-2 relative">
            <div className="text-[11px] font-label-bold uppercase text-emerald-800">2. Confirmed</div>
            <div className="text-2xl font-bold text-emerald-700">{pipelineStats.confirmed}</div>
            <div className="text-[11px] text-emerald-800 font-bold">{pipelineStats.confirmationRate}% Confirmation</div>
          </div>

          {/* Stage 3: Paid */}
          <div className="p-4 bg-blue-50/70 border border-blue-200/60 rounded-2xl space-y-2 relative">
            <div className="text-[11px] font-label-bold uppercase text-blue-800">3. Paid (Adv/Full)</div>
            <div className="text-2xl font-bold text-blue-700">{pipelineStats.paid}</div>
            <div className="text-[11px] text-blue-800 font-bold">{pipelineStats.paymentRate}% Payment Rate</div>
          </div>

          {/* Stage 4: Completed */}
          <div className="p-4 bg-primary/10 border border-primary/25 rounded-2xl space-y-2 relative">
            <div className="text-[11px] font-label-bold uppercase text-primary">4. Completed</div>
            <div className="text-2xl font-bold text-primary">{pipelineStats.completed}</div>
            <div className="text-[11px] text-primary font-bold">{pipelineStats.completionRate}% Played</div>
          </div>

          {/* Stage 5: Cancelled */}
          <div className="p-4 bg-rose-50/70 border border-rose-200/60 rounded-2xl space-y-2 relative">
            <div className="text-[11px] font-label-bold uppercase text-rose-800">5. Drop-off / Cancel</div>
            <div className="text-2xl font-bold text-rose-700">{pipelineStats.cancelled}</div>
            <div className="text-[11px] text-rose-800 font-bold">{pipelineStats.cancellationRate}% Cancel Rate</div>
          </div>
        </div>
      </div>

      {/* 8. CANCELLATIONS & PAYMENT COLLECTION (2-COLUMN GRID) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Cancellation Deep-Dive */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-black/5 shadow-sm space-y-6">
          <div>
            <h2 className="font-bold text-lg text-on-surface">Cancellation Analysis</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Lost match volume and revenue leakage prevention
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-rose-50 border border-rose-200/60 rounded-2xl space-y-1">
              <span className="text-xs font-label-bold text-rose-800">Cancellation Rate</span>
              <div className="text-2xl font-bold text-rose-700">{pipelineStats.cancellationRate}%</div>
              <p className="text-[11px] text-on-surface-variant">{pipelineStats.cancelled} total lost reservations</p>
            </div>

            <div className="p-4 bg-rose-50 border border-rose-200/60 rounded-2xl space-y-1">
              <span className="text-xs font-label-bold text-rose-800">Lost Revenue</span>
              <div className="text-2xl font-bold text-rose-700">₹{financialBehaviour.lostRevenue.toLocaleString('en-IN')}</div>
              <p className="text-[11px] text-on-surface-variant">Potential booking value</p>
            </div>
          </div>

          <div className="p-4 bg-surface-container-low rounded-2xl border border-black/5 space-y-2 text-xs">
            <span className="font-bold text-on-surface block">Operational Mitigation:</span>
            <p className="text-on-surface-variant leading-relaxed">
              Require a mandatory non-refundable advance fee on peak weekend and night slots to minimize unfulfilled reservations and secure slot value upfront.
            </p>
          </div>
        </div>

        {/* Right: Payment Status Breakdown */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-black/5 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-bold text-lg text-on-surface">Payment Collection Health</h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Online prepaid vs desk balance collection status
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
              {financialBehaviour.collectionPct}% Collected
            </span>
          </div>

          {/* Collection Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span>Online Collections: ₹{financialBehaviour.collectedTotal.toLocaleString('en-IN')}</span>
              <span className="text-amber-700">Desk Pending: ₹{financialBehaviour.pendingBalanceAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="h-3 w-full bg-surface-container-low rounded-full overflow-hidden border border-black/5 flex">
              <div
                className="bg-primary transition-all duration-500"
                style={{ width: `${financialBehaviour.collectionPct}%` }}
              />
              <div
                className="bg-amber-400 transition-all duration-500"
                style={{ width: `${100 - financialBehaviour.collectionPct}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs pt-1">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/60 space-y-1">
              <span className="text-[11px] font-label-bold text-emerald-800 block">Fully Paid</span>
              <span className="font-bold text-base text-emerald-700">{financialBehaviour.fullyPaidCount}</span>
              <span className="text-[10px] text-on-surface-variant block">₹{financialBehaviour.fullyPaidAmount.toLocaleString('en-IN')}</span>
            </div>

            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200/60 space-y-1">
              <span className="text-[11px] font-label-bold text-blue-800 block">Advance Paid</span>
              <span className="font-bold text-base text-blue-700">{financialBehaviour.advancePaidCount}</span>
              <span className="text-[10px] text-on-surface-variant block">₹{financialBehaviour.advancePaidAmount.toLocaleString('en-IN')}</span>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 space-y-1">
              <span className="text-[11px] font-label-bold text-amber-800 block">Cash Pending</span>
              <span className="font-bold text-base text-amber-700">{financialBehaviour.cashPendingCount}</span>
              <span className="text-[10px] text-on-surface-variant block">₹{financialBehaviour.pendingBalanceAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 9. DYNAMIC BUSINESS INSIGHTS & RECOMMENDATIONS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">auto_awesome</span>
          <h2 className="font-bold text-lg text-on-surface">Dynamic Business Insights & Recommendations</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dynamicRecommendations.map((rec, i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm space-y-3 relative overflow-hidden group hover:border-primary/30 transition-all"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl">{rec.icon}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-label-bold text-on-surface-variant uppercase tracking-wider block">
                      {rec.type}
                    </span>
                  </div>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${rec.badgeClass}`}>
                  {rec.badge}
                </span>
              </div>

              <h3 className="font-bold text-sm text-on-surface leading-snug">
                {rec.title}
              </h3>

              <p className="text-xs text-on-surface-variant leading-relaxed">
                {rec.description}
              </p>

              <div className="pt-2 flex items-center justify-between border-t border-black/5 text-xs">
                <span className="text-[11px] font-semibold text-primary flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">tips_and_updates</span>
                  Actionable Strategy
                </span>
                <span className="font-bold text-on-surface text-[11px]">
                  {rec.action}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 10. SECONDARY REVENUE SUMMARY & EXPANDABLE RAW DATASET */}
      <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm space-y-4">
        {/* Compact Revenue Snapshot Strip */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-black/5 text-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">payments</span>
            <span className="font-bold text-on-surface text-sm">Filtered Gross Revenue:</span>
            <span className="text-xl font-extrabold text-primary ml-1">
              ₹{financialBehaviour.totalGrossRevenue.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3 py-1.5 bg-surface-container-low rounded-xl font-medium text-on-surface-variant">
              Discounts Applied: <strong>₹{financialBehaviour.totalDiscounts.toLocaleString('en-IN')}</strong>
            </span>
            <span className="px-3 py-1.5 bg-surface-container-low rounded-xl font-medium text-on-surface-variant">
              Avg Ticket: <strong>₹{filteredBookings.length > 0 ? Math.round(financialBehaviour.totalGrossRevenue / filteredBookings.length) : 0}</strong>
            </span>
          </div>
        </div>

        {/* Collapsible Detailed Dataset */}
        <details className="space-y-4 group">
          <summary className="font-bold text-xs uppercase tracking-wider text-on-surface-variant cursor-pointer select-none flex justify-between items-center hover:text-primary transition-colors py-2">
            <span>Explore Raw Operations Dataset ({filteredBookings.length} items)</span>
            <span className="material-symbols-outlined transition-transform group-open:rotate-180">expand_more</span>
          </summary>

          <div className="pt-2 space-y-3">
            {/* Inner Dataset Tabs */}
            <div className="flex gap-2 border-b border-black/5 pb-2">
              {['Bookings', 'Time Slots', 'Customer Profiles'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setRawTab(tab)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-label-bold transition-all ${
                    rawTab === tab ? 'bg-primary text-white font-bold' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-variant'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto rounded-2xl border border-black/5 max-h-96 overflow-y-auto">
              {rawTab === 'Bookings' && (
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-low sticky top-0 border-b border-black/5 text-on-surface-variant font-label-bold">
                    <tr>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Slots</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Payment</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {filteredBookings.map(b => (
                      <tr key={b.id || Math.random()} className="hover:bg-surface-container-lowest transition-colors">
                        <td className="p-3 font-bold text-on-surface">
                          {b.customerName || 'Guest'}
                          <span className="block text-[10px] text-on-surface-variant font-normal">{b.customerPhone || b.mobileNumber || ''}</span>
                        </td>
                        <td className="p-3 font-mono">{b.dateStr || (typeof b.date === 'string' ? b.date.split('T')[0] : '')}</td>
                        <td className="p-3 text-on-surface-variant">
                          {Array.isArray(b.slots) ? b.slots.join(', ') : (Array.isArray(b.timeSlots) ? b.timeSlots.join(', ') : '1 Slot')}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                            b.status === 'Completed' ? 'bg-sky-100 text-sky-800' :
                            b.status === 'Cancelled' ? 'bg-rose-100 text-rose-800' :
                            b.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            {b.status || 'Confirmed'}
                          </span>
                        </td>
                        <td className="p-3 text-on-surface-variant">{b.paymentStatus || 'Pending'}</td>
                        <td className="p-3 font-bold text-right text-primary">₹{b.totalAmount || b.subtotal || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {rawTab === 'Time Slots' && (
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-low sticky top-0 border-b border-black/5 text-on-surface-variant font-label-bold">
                    <tr>
                      <th className="p-3">Time Window</th>
                      <th className="p-3">Slot Range</th>
                      <th className="p-3 text-right">Booked Count</th>
                      <th className="p-3 text-right">Demand Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {timeWindowStats.stats.map(tw => (
                      <tr key={tw.id} className="hover:bg-surface-container-lowest transition-colors">
                        <td className="p-3 font-bold text-on-surface">{tw.label}</td>
                        <td className="p-3 font-mono text-on-surface-variant">{tw.range}</td>
                        <td className="p-3 font-bold text-right text-primary">{tw.count}</td>
                        <td className="p-3 font-bold text-right">{tw.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {rawTab === 'Customer Profiles' && (
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-low sticky top-0 border-b border-black/5 text-on-surface-variant font-label-bold">
                    <tr>
                      <th className="p-3">Customer Name</th>
                      <th className="p-3">Phone</th>
                      <th className="p-3 text-right">Reservations</th>
                      <th className="p-3 text-right">Total Spent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {customerAnalytics.activeCustomerProfiles.map((c, i) => (
                      <tr key={i} className="hover:bg-surface-container-lowest transition-colors">
                        <td className="p-3 font-bold text-on-surface">{c.name}</td>
                        <td className="p-3 font-mono text-on-surface-variant">{c.phone}</td>
                        <td className="p-3 font-bold text-right text-primary">{c.bookingsCount} match(es)</td>
                        <td className="p-3 font-bold text-right">₹{c.totalSpent.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </details>
      </div>
    </div>
  );
};
