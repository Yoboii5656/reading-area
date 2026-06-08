// Mock data for demo mode — lets you preview all pages without Supabase

export const DEMO_MODE = false

export const mockStudents = [
  {
    id: 'stu-001',
    owner_id: 'demo-owner-001',
    student_id: 'RA-0001',
    name: 'Rahul Sharma',
    phone: '9876543001',
    address: '45 Nehru Nagar, Indore',
    aadhaar_number: '****-****-1234',
    photo_url: null,
    seat_preference: 'Window side, Row 2',
    joined_at: '2026-02-10',
    is_active: true,
  },
  {
    id: 'stu-002',
    owner_id: 'demo-owner-001',
    student_id: 'RA-0002',
    name: 'Priya Patel',
    phone: '9876543002',
    address: '12 MG Road, Indore',
    aadhaar_number: '****-****-5678',
    photo_url: null,
    seat_preference: 'Back row',
    joined_at: '2026-02-15',
    is_active: true,
  },
  {
    id: 'stu-003',
    owner_id: 'demo-owner-001',
    student_id: 'RA-0003',
    name: 'Amit Verma',
    phone: '9876543003',
    address: '78 Vijay Nagar, Indore',
    aadhaar_number: '****-****-9012',
    photo_url: null,
    seat_preference: null,
    joined_at: '2026-03-01',
    is_active: true,
  },
  {
    id: 'stu-004',
    owner_id: 'demo-owner-001',
    student_id: 'RA-0004',
    name: 'Sneha Gupta',
    phone: '9876543004',
    address: '22 Sapna Sangeeta, Indore',
    aadhaar_number: '****-****-3456',
    photo_url: null,
    seat_preference: 'Front row',
    joined_at: '2026-03-10',
    is_active: true,
  },
  {
    id: 'stu-005',
    owner_id: 'demo-owner-001',
    student_id: 'RA-0005',
    name: 'Vikram Singh',
    phone: '9876543005',
    address: '90 Palasia, Indore',
    aadhaar_number: '****-****-7890',
    photo_url: null,
    seat_preference: 'Middle',
    joined_at: '2026-04-01',
    is_active: true,
  },
]

// Today's date helpers
const today = new Date().toISOString().split('T')[0]
const now = new Date()

function hoursAgo(h) {
  const d = new Date(now.getTime() - h * 60 * 60 * 1000)
  return d.toISOString()
}

export const mockAttendanceLogs = [
  {
    id: 'att-001',
    student_id: 'stu-001',
    owner_id: 'demo-owner-001',
    date: today,
    entry_time: hoursAgo(3),
    exit_time: null,
    duration_minutes: null,
    method: 'qr_shared',
    students: { name: 'Rahul Sharma', student_id: 'RA-0001' },
  },
  {
    id: 'att-002',
    student_id: 'stu-002',
    owner_id: 'demo-owner-001',
    date: today,
    entry_time: hoursAgo(2),
    exit_time: null,
    duration_minutes: null,
    method: 'manual',
    students: { name: 'Priya Patel', student_id: 'RA-0002' },
  },
  {
    id: 'att-003',
    student_id: 'stu-004',
    owner_id: 'demo-owner-001',
    date: today,
    entry_time: hoursAgo(1.5),
    exit_time: null,
    duration_minutes: null,
    method: 'qr_shared',
    students: { name: 'Sneha Gupta', student_id: 'RA-0004' },
  },
  {
    id: 'att-004',
    student_id: 'stu-003',
    owner_id: 'demo-owner-001',
    date: today,
    entry_time: hoursAgo(5),
    exit_time: hoursAgo(2),
    duration_minutes: 180,
    method: 'manual',
    students: { name: 'Amit Verma', student_id: 'RA-0003' },
  },
  {
    id: 'att-005',
    student_id: 'stu-005',
    owner_id: 'demo-owner-001',
    date: today,
    entry_time: hoursAgo(4),
    exit_time: hoursAgo(1),
    duration_minutes: 180,
    method: 'qr_shared',
    students: { name: 'Vikram Singh', student_id: 'RA-0005' },
  },
]

// Fee payments with varied statuses
const daysAgo = (d) => {
  const date = new Date()
  date.setDate(date.getDate() - d)
  return date.toISOString().split('T')[0]
}
const daysFromNow = (d) => {
  const date = new Date()
  date.setDate(date.getDate() + d)
  return date.toISOString().split('T')[0]
}

export const mockFeePayments = [
  {
    id: 'fee-001',
    student_id: 'stu-001',
    owner_id: 'demo-owner-001',
    amount: 500,
    paid_on: daysAgo(10),
    valid_until: daysFromNow(20),
    payment_method: 'upi',
    note: null,
  },
  {
    id: 'fee-002',
    student_id: 'stu-002',
    owner_id: 'demo-owner-001',
    amount: 500,
    paid_on: daysAgo(25),
    valid_until: daysFromNow(5),
    payment_method: 'cash',
    note: null,
  },
  {
    id: 'fee-003',
    student_id: 'stu-003',
    owner_id: 'demo-owner-001',
    amount: 500,
    paid_on: daysAgo(40),
    valid_until: daysAgo(10),
    payment_method: 'upi',
    note: 'Paid via GPay',
  },
  {
    id: 'fee-004',
    student_id: 'stu-004',
    owner_id: 'demo-owner-001',
    amount: 250,
    paid_on: daysAgo(5),
    valid_until: daysFromNow(25),
    payment_method: 'cash',
    note: 'Paid half this month',
  },
  // stu-005 has no payment
]

export function getMockStudentAttendance(studentId) {
  const logs = []
  for (let i = 0; i < 8; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i - 1)
    const dateStr = d.toISOString().split('T')[0]
    const entry = new Date(d)
    entry.setHours(9, Math.floor(Math.random() * 30), 0)
    const exit = new Date(entry)
    exit.setHours(entry.getHours() + 3 + Math.floor(Math.random() * 3))
    const duration = Math.round((exit - entry) / (1000 * 60))

    logs.push({
      id: `hist-att-${studentId}-${i}`,
      student_id: studentId,
      date: dateStr,
      entry_time: entry.toISOString(),
      exit_time: exit.toISOString(),
      duration_minutes: duration,
      method: i % 2 === 0 ? 'qr_shared' : 'manual',
    })
  }
  return logs
}

export function getMockStudentPayments(studentId) {
  return mockFeePayments.filter(p => p.student_id === studentId)
}
