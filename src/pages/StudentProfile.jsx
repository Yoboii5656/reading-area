import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { DEMO_MODE, mockStudents, getMockStudentAttendance, getMockStudentPayments } from '../lib/mockData'
import { ArrowLeft, Phone, MapPin, CreditCard, Calendar, QrCode, User, Clock } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

export default function StudentProfile() {
  const { id } = useParams()
  const { ownerProfile } = useAuth()
  const [student, setStudent] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showQR, setShowQR] = useState(false)

  useEffect(() => {
    if (ownerProfile) fetchStudent()
  }, [ownerProfile, id])

  async function fetchStudent() {
    if (DEMO_MODE) {
      const found = mockStudents.find(s => s.id === id)
      setStudent(found || null)
      setAttendance(found ? getMockStudentAttendance(id) : [])
      setPayments(found ? getMockStudentPayments(id) : [])
      setLoading(false)
      return
    }

    const { data: studentData } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .eq('owner_id', ownerProfile.id)
      .single()

    if (studentData) {
      setStudent(studentData)
      const { data: attendanceData } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('student_id', id)
        .order('date', { ascending: false })
        .limit(10)
      setAttendance(attendanceData || [])

      const { data: paymentData } = await supabase
        .from('fee_payments')
        .select('*')
        .eq('student_id', id)
        .order('paid_on', { ascending: false })
        .limit(10)
      setPayments(paymentData || [])
    }
    setLoading(false)
  }

  function getLastPaymentValidity() {
    if (payments.length === 0) return null
    return payments[0].valid_until
  }

  function getMembershipStatus() {
    const validity = getLastPaymentValidity()
    if (!validity) return 'no-payment'
    const today = new Date().toISOString().split('T')[0]
    const weekLater = new Date()
    weekLater.setDate(weekLater.getDate() + 7)
    if (validity < today) return 'expired'
    if (validity <= weekLater.toISOString().split('T')[0]) return 'expiring'
    return 'active'
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-20 bg-canvas-soft-2 rounded animate-shimmer" />
        <div className="h-48 bg-canvas rounded-2xl animate-shimmer" />
        <div className="h-32 bg-canvas rounded-xl animate-shimmer" />
      </div>
    )
  }

  if (!student) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-canvas-soft-2 flex items-center justify-center mx-auto mb-3">
          <User size={28} className="text-mute" />
        </div>
        <p className="text-sm font-medium text-body">Student not found</p>
        <Link to="/students" className="text-sm text-link font-medium hover:text-link-deep mt-2 inline-block">
          ← Back to students
        </Link>
      </div>
    )
  }

  const status = getMembershipStatus()
  const statusConfig = {
    active: { label: 'Active', class: 'bg-success/10 text-success border-success/20' },
    expiring: { label: 'Expiring Soon', class: 'bg-warning-soft text-warning border-warning/20' },
    expired: { label: 'Expired', class: 'bg-error-soft text-error border-error/20' },
    'no-payment': { label: 'No Payment', class: 'bg-canvas-soft-2 text-mute border-hairline' },
  }

  const qrData = JSON.stringify({
    type: 'student',
    id: student.student_id,
    ownerId: ownerProfile.id,
  })

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/students" className="p-2 -ml-2 hover:bg-canvas-soft-2 rounded-xl transition-colors active:scale-95">
          <ArrowLeft size={20} className="text-body" />
        </Link>
        <h1 className="text-lg font-semibold tracking-[-0.4px] text-ink">Student Profile</h1>
      </div>

      {/* Profile Card */}
      <div className="bg-canvas rounded-2xl border border-hairline overflow-hidden shadow-card">
        {/* Top section with gradient */}
        <div className="relative h-20 bg-gradient-to-br from-gradient-develop-start/10 via-violet/5 to-gradient-preview-end/10">
          <button
            onClick={() => setShowQR(!showQR)}
            className="absolute top-3 right-3 p-2 bg-canvas/80 backdrop-blur-sm rounded-lg border border-hairline/50 hover:bg-canvas transition-colors"
            aria-label="Show QR code"
          >
            <QrCode size={16} className="text-body" />
          </button>
        </div>

        <div className="px-5 pb-5 -mt-8">
          {/* Avatar */}
          {student.photo_url ? (
            <img src={student.photo_url} alt={student.name} className="w-16 h-16 rounded-2xl object-cover border-4 border-canvas shadow-card" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-canvas-soft-2 border-4 border-canvas flex items-center justify-center shadow-card">
              <span className="text-lg font-bold text-mute">
                {student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}

          <div className="mt-3">
            <h2 className="text-lg font-semibold text-ink tracking-[-0.4px]">{student.name}</h2>
            <p className="text-xs font-mono text-mute mt-0.5">{student.student_id}</p>
            <span className={`inline-block mt-2 text-[10px] font-semibold px-2.5 py-1 rounded-full border ${statusConfig[status].class}`}>
              {statusConfig[status].label}
            </span>
          </div>

          {/* QR Code */}
          {showQR && (
            <div className="mt-4 pt-4 border-t border-hairline/60 flex justify-center animate-scale-in">
              <div className="p-4 bg-canvas-soft rounded-xl border border-hairline">
                <QRCodeSVG value={qrData} size={140} level="M" />
              </div>
            </div>
          )}

          {/* Details */}
          <div className="mt-4 pt-4 border-t border-hairline/60 space-y-2.5">
            {student.phone && (
              <div className="flex items-center gap-2.5 text-sm text-body">
                <div className="w-7 h-7 rounded-lg bg-canvas-soft-2 flex items-center justify-center flex-shrink-0">
                  <Phone size={13} className="text-mute" />
                </div>
                <a href={`tel:${student.phone}`} className="hover:text-link transition-colors">{student.phone}</a>
              </div>
            )}
            {student.address && (
              <div className="flex items-center gap-2.5 text-sm text-body">
                <div className="w-7 h-7 rounded-lg bg-canvas-soft-2 flex items-center justify-center flex-shrink-0">
                  <MapPin size={13} className="text-mute" />
                </div>
                <span>{student.address}</span>
              </div>
            )}
            {getLastPaymentValidity() && (
              <div className="flex items-center gap-2.5 text-sm text-body">
                <div className="w-7 h-7 rounded-lg bg-canvas-soft-2 flex items-center justify-center flex-shrink-0">
                  <CreditCard size={13} className="text-mute" />
                </div>
                <span>Valid until {new Date(getLastPaymentValidity()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            )}
            <div className="flex items-center gap-2.5 text-sm text-body">
              <div className="w-7 h-7 rounded-lg bg-canvas-soft-2 flex items-center justify-center flex-shrink-0">
                <Calendar size={13} className="text-mute" />
              </div>
              <span>Joined {new Date(student.joined_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Attendance */}
      <div>
        <h3 className="text-xs font-semibold text-mute uppercase tracking-wider mb-3">Attendance History</h3>
        {attendance.length === 0 ? (
          <div className="bg-canvas rounded-xl border border-hairline p-6 text-center">
            <Clock size={20} className="mx-auto text-mute mb-2" />
            <p className="text-sm text-mute">No attendance records yet</p>
          </div>
        ) : (
          <div className="bg-canvas rounded-xl border border-hairline overflow-hidden shadow-card">
            {attendance.map((log, i) => (
              <div
                key={log.id}
                className={`px-4 py-3 flex items-center justify-between ${
                  i !== attendance.length - 1 ? 'border-b border-hairline/60' : ''
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-canvas-soft-2 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-mute">
                      {new Date(log.date).toLocaleDateString('en-IN', { day: 'numeric' })}
                    </span>
                  </div>
                  <span className="text-sm text-ink">
                    {new Date(log.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-body font-medium">
                    {log.entry_time && new Date(log.entry_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    {log.exit_time && ` → ${new Date(log.exit_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
                  </p>
                  {log.duration_minutes && (
                    <p className="text-[11px] text-mute">{Math.floor(log.duration_minutes / 60)}h {log.duration_minutes % 60}m</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment History */}
      <div>
        <h3 className="text-xs font-semibold text-mute uppercase tracking-wider mb-3">Payment History</h3>
        {payments.length === 0 ? (
          <div className="bg-canvas rounded-xl border border-hairline p-6 text-center">
            <CreditCard size={20} className="mx-auto text-mute mb-2" />
            <p className="text-sm text-mute">No payments recorded</p>
          </div>
        ) : (
          <div className="bg-canvas rounded-xl border border-hairline overflow-hidden shadow-card">
            {payments.map((payment, i) => (
              <div
                key={payment.id}
                className={`px-4 py-3 flex items-center justify-between ${
                  i !== payments.length - 1 ? 'border-b border-hairline/60' : ''
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                    <IndianRupee size={13} className="text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">₹{payment.amount}</p>
                    <p className="text-[11px] text-mute">
                      {payment.payment_method === 'upi' ? '📱' : '💵'} {payment.payment_method} · {new Date(payment.paid_on).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-mute font-medium">
                  → {new Date(payment.valid_until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function IndianRupee(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M6 3h12"/><path d="M6 8h12"/><path d="m6 13 8.5 8"/><path d="M6 13h3"/><path d="M9 13c6.667 0 6.667-10 0-10"/>
    </svg>
  )
}
