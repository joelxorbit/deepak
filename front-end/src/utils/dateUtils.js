// Helper functions for date formatting, display, and comparisons

export const getTodayString = () => {
  return new Date().toISOString().split('T')[0];
};

export const getFormattedDateString = (dateObj) => {
  const d = dateObj ? new Date(dateObj) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

export const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
  return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const compareDates = (date1, date2) => {
  return new Date(date1).getTime() - new Date(date2).getTime();
};
