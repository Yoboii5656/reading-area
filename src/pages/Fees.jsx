import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { DEMO_MODE, mockStudents, mockFeePayments } from '../lib/mockData'
import { Search, AlertTriangle, IndianRupee, X, MessageCircle, QrCode, ChevronDown, ChevronUp, History } from 'lucide-react'

export default function Fees() {
  const { ownerProfile } = useAuth()
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showPayModal, setShowPayModal] = useState(null)
  const [payForm, setPayForm] = useState({ amount: '', method: 'cash', note: '', fromDate: '', toDate: '' })
  const [paying, setPaying] = useState(false)
  const [expandedStudent, setExpandedStudent] = useState(null)
  const [paymentHistory, setPaymentHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    if (ownerProfile) fetchStudentsWithFees()
  }, [ownerProfile])

  async function fetchStudentsWithFees() {
    if (DEMO_MODE) {
      const enriched = mockStudents.map(s => {
        const payment = mockFeePayments.find(p => p.student_id === s.id)
        return { ...s, lastPayment: payment || null, status: getStatus(payment?.valid_until) }
      })
      const order = { expired: 0, expiring: 1, 'no-payment': 2, active: 3 }
      enriched.sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3))
      setStudents(enriched)
      setLoading(false)
      return
    }

    const { data: studentData } = await supabase
      .from('students')
      .select('id, name, student_id, phone')
      .eq('owner_id', ownerProfile.id)
      .eq('is_active', true)
      .order('name')

    if (!studentData) { setLoading(false); return }

    const { data: payments } = await supabase
      .from('fee_payments')
      .select('student_id, valid_until, amount, paid_on')
      .eq('owner_id', ownerProfile.id)
      .order('paid_on', { ascending: false })

    const paymentMap = {}
    for (const p of (payments || [])) {
      if (!paymentMap[p.student_id]) paymentMap[p.student_id] = p
    }

    const enriched = studentData.map(s => ({
      ...s,
      lastPayment: paymentMap[s.id] || null,
      status: getStatus(paymentMap[s.id]?.valid_until),
    }))
    const order = { expired: 0, expiring: 1, 'no-payment': 2, active: 3 }
    enriched.sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3))
    setStudents(enriched)
    setLoading(false)
  }

  function getStatus(validUntil) {
    if (!validUntil) return 'no-payment'
    const today = new Date().toISOString().split('T')[0]
    const week = new Date()
    week.setDate(week.getDate() + 7)
    if (validUntil < today) return 'expired'
    if (validUntil <= week.toISOString().split('T')[0]) return 'expiring'
    return 'active'
  }

  async function handleRecordPayment(e) {
    e.preventDefault()
    setPaying(true)
    const amount = parseFloat(payForm.amount)
    const paidFrom = payForm.fromDate
    const validUntil = payForm.toDate

    if (DEMO_MODE) {
      setStudents(prev => prev.map(s =>
        s.id === showPayModal.id
          ? { ...s, lastPayment: { amount, paid_on: paidFrom, valid_until: validUntil }, status: 'active' }
          : s
      ))
      setShowPayModal(null)
      setPaying(false)
      return
    }

    await supabase.from('fee_payments').insert({
      student_id: showPayModal.id,
      owner_id: ownerProfile.id,
      amount,
      paid_on: paidFrom,
      valid_until: validUntil,
      payment_method: payForm.method,
      note: payForm.note,
      recorded_by: ownerProfile.id,
    })
    setShowPayModal(null)
    setPaying(false)
    fetchStudentsWithFees()
  }

  function sendWhatsAppReminder(student) {
    const message = encodeURIComponent(
      `Hi ${student.name}, your reading area membership is expiring soon. Please pay ₹${ownerProfile.monthly_fee || ''} to continue. — ${ownerProfile.reading_area_name}`
    )
    window.open(`https://wa.me/91${student.phone}?text=${message}`, '_blank')
  }

  async function togglePaymentHistory(studentId) {
    if (expandedStudent === studentId) {
      setExpandedStudent(null)
      setPaymentHistory([])
      return
    }

    setExpandedStudent(studentId)
    setLoadingHistory(true)

    if (DEMO_MODE) {
      const history = mockFeePayments.filter(p => p.student_id === studentId)
      setPaymentHistory(history)
      setLoadingHistory(false)
      return
    }

    const { data } = await supabase
      .from('fee_payments')
      .select('*')
      .eq('student_id', studentId)
      .eq('owner_id', ownerProfile.id)
      .order('paid_on', { ascending: false })

    setPaymentHistory(data || [])
    setLoadingHistory(false)
  }

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.student_id.toLowerCase().includes(search.toLowerCase())
  )

  const statusConfig = {
    active: { label: 'Active', dot: 'bg-success', badge: 'text-success bg-success/10' },
    expiring: { label: 'Expiring', dot: 'bg-warning', badge: 'text-warning bg-warning-soft' },
    expired: { label: 'Expired', dot: 'bg-error', badge: 'text-error bg-error-soft' },
    'no-payment': { label: 'No Payment', dot: 'bg-mute', badge: 'text-mute bg-canvas-soft-2' },
  }

  const expiredCount = students.filter(s => s.status === 'expired').length
  const expiringCount = students.filter(s => s.status === 'expiring').length
  const activeCount = students.filter(s => s.status === 'active').length

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-[22px] font-semibold tracking-[-0.6px] text-ink">Fees</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-canvas rounded-xl border border-hairline p-3.5 text-center shadow-card">
          <p className="text-2xl font-bold tracking-tight text-error">{expiredCount}</p>
          <p className="text-[10px] font-medium text-mute uppercase tracking-wide mt-0.5">Expired</p>
        </div>
        <div className="bg-canvas rounded-xl border border-hairline p-3.5 text-center shadow-card">
          <p className="text-2xl font-bold tracking-tight text-warning">{expiringCount}</p>
          <p className="text-[10px] font-medium text-mute uppercase tracking-wide mt-0.5">Expiring</p>
        </div>
        <div className="bg-canvas rounded-xl border border-hairline p-3.5 text-center shadow-card">
          <p className="text-2xl font-bold tracking-tight text-success">{activeCount}</p>
          <p className="text-[10px] font-medium text-mute uppercase tracking-wide mt-0.5">Active</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search student..."
          className="w-full h-11 pl-10 pr-4 border border-hairline rounded-xl text-sm bg-canvas text-ink placeholder:text-mute/60 focus:outline-none focus:ring-2 focus:ring-link/20 focus:border-link shadow-card transition-all"
        />
      </div>

      {/* Student Fee List */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-canvas rounded-xl animate-shimmer" />)}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((student) => (
            <div
              key={student.id}
              className="bg-canvas rounded-xl border border-hairline shadow-card hover:shadow-card-hover transition-shadow overflow-hidden"
            >
              <div
                className="p-4 cursor-pointer"
                onClick={() => togglePaymentHistory(student.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ${statusConfig[student.status].dot}`} />
                    <div>
                      <p className="text-sm font-medium text-ink">{student.name}</p>
                      <p className="text-[11px] text-mute font-mono">{student.student_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusConfig[student.status].badge}`}>
                      {statusConfig[student.status].label}
                    </span>
                    {expandedStudent === student.id ? (
                      <ChevronUp size={14} className="text-mute" />
                    ) : (
                      <ChevronDown size={14} className="text-mute" />
                    )}
                  </div>
                </div>

                {student.lastPayment && (
                  <p className="text-xs text-mute mb-3 pl-[18px]">
                    ₹{student.lastPayment.amount} · {new Date(student.lastPayment.paid_on).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    {' → '}
                    {new Date(student.lastPayment.valid_until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                )}

                <div className="flex gap-2 pl-[18px]" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0]
                      const nextMonth = new Date()
                      nextMonth.setDate(nextMonth.getDate() + 30)
                      const toDate = nextMonth.toISOString().split('T')[0]
                      setShowPayModal(student)
                      setPayForm({ amount: ownerProfile.monthly_fee || '', method: 'cash', note: '', fromDate: today, toDate: toDate })
                    }}
                    className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium bg-primary text-on-primary rounded-lg hover:bg-ink/90 transition-all active:scale-[0.97]"
                  >
                    <IndianRupee size={11} />
                    Record Pay
                  </button>
                  <Link
                    to={`/fees/pay/${student.id}`}
                    className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium border border-hairline rounded-lg hover:bg-canvas-soft-2 hover:border-hairline-strong transition-all active:scale-[0.97]"
                  >
                    <QrCode size={11} />
                    UPI
                  </Link>
                  {(student.status === 'expired' || student.status === 'expiring') && student.phone && (
                    <button
                      onClick={() => sendWhatsAppReminder(student)}
                      className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium border border-hairline rounded-lg hover:bg-canvas-soft-2 hover:border-hairline-strong transition-all active:scale-[0.97]"
                    >
                      <MessageCircle size={11} />
                      Remind
                    </button>
                  )}
                </div>
              </div>

              {/* Payment History Dropdown */}
              {expandedStudent === student.id && (
                <div className="border-t border-hairline bg-canvas-soft-2/50 px-4 py-3 animate-fade-in">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <History size={12} className="text-mute" />
                    <p className="text-[11px] font-semibold text-mute uppercase tracking-wide">Payment History</p>
                  </div>

                  {loadingHistory ? (
                    <div className="space-y-2">
                      {[1,2].map(i => <div key={i} className="h-10 bg-canvas rounded-lg animate-shimmer" />)}
                    </div>
                  ) : paymentHistory.length === 0 ? (
                    <p className="text-xs text-mute py-2">No payment records found.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {paymentHistory.map((payment, idx) => (
                        <div
                          key={payment.id || idx}
                          className="flex items-center justify-between bg-canvas rounded-lg border border-hairline px-3 py-2.5"
                        >
                          <div>
                            <p className="text-sm font-medium text-ink">₹{payment.amount}</p>
                            <p className="text-[11px] text-mute">
                              {new Date(payment.paid_on).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              {' → '}
                              {new Date(payment.valid_until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-medium text-mute uppercase bg-canvas-soft-2 px-1.5 py-0.5 rounded">
                              {payment.payment_method || '—'}
                            </span>
                            {payment.note && (
                              <p className="text-[10px] text-mute mt-0.5 max-w-[120px] truncate">{payment.note}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-canvas rounded-2xl w-full max-w-sm p-6 shadow-modal animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-semibold text-ink">Record Payment</h3>
                <p className="text-xs text-mute mt-0.5">{showPayModal.name} · {showPayModal.student_id}</p>
              </div>
              <button
                onClick={() => setShowPayModal(null)}
                className="p-1.5 hover:bg-canvas-soft-2 rounded-lg transition-colors"
              >
                <X size={18} className="text-mute" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Amount (₹)</label>
                <input
                  type="number"
                  value={payForm.amount}
                  onChange={(e) => setPayForm(p => ({ ...p, amount: e.target.value }))}
                  required
                  className="w-full h-12 px-4 border border-hairline rounded-xl text-lg font-semibold bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-link/20 focus:border-link transition-all text-center"
                  inputMode="numeric"
                  placeholder="500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-body mb-1.5">From Date</label>
                  <input
                    type="date"
                    value={payForm.fromDate}
                    onChange={(e) => setPayForm(p => ({ ...p, fromDate: e.target.value }))}
                    required
                    className="w-full h-10 px-3 border border-hairline rounded-xl text-sm bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-link/20 focus:border-link transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-body mb-1.5">To Date</label>
                  <input
                    type="date"
                    value={payForm.toDate}
                    onChange={(e) => setPayForm(p => ({ ...p, toDate: e.target.value }))}
                    required
                    className="w-full h-10 px-3 border border-hairline rounded-xl text-sm bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-link/20 focus:border-link transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {['cash', 'upi'].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPayForm(p => ({ ...p, method: m }))}
                      className={`h-10 text-sm font-medium rounded-xl border-2 transition-all ${
                        payForm.method === m
                          ? 'border-primary bg-primary text-on-primary'
                          : 'border-hairline text-body hover:border-hairline-strong'
                      }`}
                    >
                      {m === 'cash' ? '💵 Cash' : '📱 UPI'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Note (optional)</label>
                <input
                  type="text"
                  value={payForm.note}
                  onChange={(e) => setPayForm(p => ({ ...p, note: e.target.value }))}
                  className="w-full h-10 px-3.5 border border-hairline rounded-xl text-sm bg-canvas text-ink placeholder:text-mute/60 focus:outline-none focus:ring-2 focus:ring-link/20 focus:border-link transition-all"
                  placeholder="e.g. paid half this month"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(null)}
                  className="flex-1 h-11 text-sm font-medium border border-hairline rounded-xl hover:bg-canvas-soft-2 transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paying || !payForm.amount}
                  className="flex-1 h-11 text-sm font-medium bg-primary text-on-primary rounded-xl hover:bg-ink/90 transition-all disabled:opacity-40 active:scale-[0.98]"
                >
                  {paying ? 'Saving...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
