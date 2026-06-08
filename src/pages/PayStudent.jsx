import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { DEMO_MODE, mockStudents } from '../lib/mockData'
import { ArrowLeft, CreditCard, CheckCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

/**
 * Shows the owner's UPI QR code for a specific student to pay.
 * Accessed from the Fees page when clicking "Pay via UPI" button.
 */
export default function PayStudent() {
  const { studentId } = useParams()
  const { ownerProfile } = useAuth()
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (ownerProfile) fetchStudent()
  }, [ownerProfile, studentId])

  async function fetchStudent() {
    if (DEMO_MODE) {
      const found = mockStudents.find(s => s.id === studentId)
      setStudent(found || null)
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('students')
      .select('id, name, student_id, phone')
      .eq('id', studentId)
      .eq('owner_id', ownerProfile.id)
      .single()

    setStudent(data)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/fees" className="p-2 -ml-2 hover:bg-canvas-soft-2 rounded-xl transition-colors active:scale-95">
          <ArrowLeft size={20} className="text-body" />
        </Link>
        <h1 className="text-lg font-semibold tracking-[-0.4px] text-ink">Collect Payment</h1>
      </div>

      {student && (
        <div className="bg-canvas rounded-2xl border border-hairline p-5 shadow-card text-center">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gradient-develop-start/20 to-gradient-develop-end/20 flex items-center justify-center mx-auto mb-3">
            <CreditCard size={20} className="text-link" />
          </div>
          <h2 className="text-base font-semibold text-ink">{student.name}</h2>
          <p className="text-xs text-mute font-mono">{student.student_id}</p>
          <p className="text-sm text-body mt-2">
            Amount: <span className="font-semibold text-ink">₹{ownerProfile.monthly_fee || '—'}</span>
          </p>
        </div>
      )}

      {/* UPI QR Display */}
      <div className="bg-canvas rounded-2xl border border-hairline p-6 shadow-card text-center">
        <h3 className="text-sm font-semibold text-ink mb-1">Scan to Pay</h3>
        <p className="text-xs text-mute mb-4">Ask the student to scan this QR code</p>

        {ownerProfile?.upi_qr_url ? (
          <div className="inline-block p-4 bg-canvas-soft rounded-xl border border-hairline">
            <img
              src={ownerProfile.upi_qr_url}
              alt="UPI QR Code"
              className="w-48 h-48 object-contain rounded-lg"
            />
          </div>
        ) : (
          <div className="p-8 bg-canvas-soft-2 rounded-xl border border-dashed border-hairline">
            <p className="text-sm text-mute">No UPI QR uploaded</p>
            <Link to="/settings" className="text-xs text-link font-medium hover:text-link-deep mt-1 inline-block">
              Upload in Settings
            </Link>
          </div>
        )}

        <p className="text-xs text-mute mt-4">
          After student pays, go back and tap "Record Payment" to confirm.
        </p>
      </div>

      {/* Confirmation reminder */}
      <div className="flex items-start gap-3 p-4 bg-success-soft/30 rounded-xl border border-success/10">
        <CheckCircle size={16} className="text-success mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-ink">After payment received</p>
          <p className="text-xs text-body mt-0.5">
            Go to Fees → find {student?.name} → tap "Record Pay" to extend their membership by 30 days.
          </p>
        </div>
      </div>
    </div>
  )
}
