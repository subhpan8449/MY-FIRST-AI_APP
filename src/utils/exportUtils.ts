import { Booking, Expense, HousekeepingTask, StaffMember, CustomerServiceRequest } from '../types';

export function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportBookingsToCSV(bookings: Booking[]) {
  const headers = [
    'Booking Reference',
    'Room Name',
    'Guest Name',
    'Guest Email',
    'Guest Phone',
    'Check-in Date',
    'Check-out Date',
    'Nights',
    'Adults',
    'Children',
    'Total Amount (INR)',
    'Status',
    'Payment Status',
    'Offer Code',
    'Created At'
  ];

  const rows = bookings.map(b => [
    `"${b.bookingReference}"`,
    `"${b.roomName}"`,
    `"${b.guestName}"`,
    `"${b.guestEmail}"`,
    `"${b.guestPhone}"`,
    `"${b.checkInDate}"`,
    `"${b.checkOutDate}"`,
    b.nights,
    b.adults,
    b.children,
    b.totalAmount,
    `"${b.status}"`,
    `"${b.paymentStatus}"`,
    `"${b.offerCode || 'None'}"`,
    `"${b.createdAt}"`
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadCSV(`devashish-homestay-bookings-${new Date().toISOString().split('T')[0]}.csv`, csv);
}

export function exportExpensesToCSV(expenses: Expense[]) {
  const headers = ['ID', 'Date', 'Category', 'Description', 'Amount (INR)', 'Entered By', 'Receipt URL'];

  const rows = expenses.map(e => [
    `"${e.id}"`,
    `"${e.date}"`,
    `"${e.category}"`,
    `"${e.description.replace(/"/g, '""')}"`,
    e.amount,
    `"${e.enteredBy}"`,
    `"${e.receiptUrl || ''}"`
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadCSV(`devashish-expenses-${new Date().toISOString().split('T')[0]}.csv`, csv);
}

export function exportHousekeepingToCSV(tasks: HousekeepingTask[]) {
  const headers = ['Task ID', 'Room Number', 'Task Type', 'Priority', 'Deadline', 'Status', 'Assigned Staff', 'Inspection Passed', 'Created At'];

  const rows = tasks.map(t => [
    `"${t.id}"`,
    `"${t.roomNumber}"`,
    `"${t.taskType}"`,
    `"${t.priority}"`,
    `"${t.deadline}"`,
    `"${t.status}"`,
    `"${t.assignedStaffName || 'Unassigned'}"`,
    t.inspectionPassed ? 'Passed' : 'Pending',
    `"${t.createdAt}"`
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadCSV(`devashish-housekeeping-${new Date().toISOString().split('T')[0]}.csv`, csv);
}

export function exportStaffToCSV(staff: StaffMember[]) {
  const headers = ['Staff ID', 'Name', 'Phone', 'Email', 'Designation', 'Status', 'Completed Tasks'];

  const rows = staff.map(s => [
    `"${s.id}"`,
    `"${s.name}"`,
    `"${s.phone}"`,
    `"${s.email || ''}"`,
    `"${s.designation}"`,
    s.active ? 'Active' : 'Inactive',
    s.completedTasksCount || 0
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadCSV(`devashish-staff-roster-${new Date().toISOString().split('T')[0]}.csv`, csv);
}

export function exportServiceRequestsToCSV(requests: CustomerServiceRequest[]) {
  const headers = ['Request ID', 'Room Number', 'Guest Name', 'Category', 'Service Type', 'Priority', 'Status', 'Assigned Staff', 'Rating', 'Created At'];

  const rows = requests.map(r => [
    `"${r.id}"`,
    `"${r.roomNumber}"`,
    `"${r.guestName}"`,
    `"${r.category}"`,
    `"${r.serviceType}"`,
    `"${r.priority}"`,
    `"${r.status}"`,
    `"${r.assignedStaffName || 'Unassigned'}"`,
    r.rating || 'Unrated',
    `"${r.createdAt}"`
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadCSV(`devashish-service-requests-${new Date().toISOString().split('T')[0]}.csv`, csv);
}
