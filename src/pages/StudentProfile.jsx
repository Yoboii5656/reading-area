import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { DEMO_MODE, mockStudents, getMockStudentAttendance, getMockStudentPayments } from '../lib/mockData'
import { svgToDataUrl } from '../lib/qrUtils'
import { ArrowLeft, Phone, MapPin, CreditCard, Calendar, QrCode, User, Clock, Download, Share2, Pencil, Upload, Check, X, Eye } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

export default function StudentProfile() {
  const { id } = useParams()
  const { ownerProfile } = useAuth()
  const [student, setStudent] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showQR, setShowQR] = useState(false)
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const qrRef = useRef(null)

  // Edit mode state
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')
  const [newAadhaarFront, setNewAadhaarFront] = useState(null)
  const [newAadhaarBack, setNewAadhaarBack] = useState(null)
  const [newPhoto, setNewPhoto] = useState(null)
  const [newPhotoPreview, setNewPhotoPreview] = useState(null)
  const photoEditRef = useRef()

  // Aadhaar viewer state
  const [viewingAadhaar, setViewingAadhaar] = useState(null) // 'front' | 'back' | null

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

  function startEditing() {
    setEditForm({
      name: student.name || '',
      phone: student.phone || '',
      address: student.address || '',
      aadhaar_number: student.aadhaar_number || '',
      seat_preference: student.seat_preference || '',
    })
    setNewAadhaarFront(null)
    setNewAadhaarBack(null)
    setNewPhoto(null)
    setNewPhotoPreview(null)
    setEditError('')
    setEditing(true)
  }

  function cancelEditing() {
    setEditing(false)
    setEditForm({})
    setNewAadhaarFront(null)
    setNewAadhaarBack(null)
    setNewPhoto(null)
    setNewPhotoPreview(null)
    setEditError('')
  }

  function handleEditChange(e) {
    setEditForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleNewPhotoChange(e) {
    const file = e.target.files[0]
    if (file) {
      setNewPhoto(file)
      setNewPhotoPreview(URL.createObjectURL(file))
    }
  }

  async function uploadFile(file, path) {
    const { error } = await supabase.storage.from('student-files').upload(path, file, { upsert: true })
    if (error) throw error
    const { data: urlData } = supabase.storage.from('student-files').getPublicUrl(path)
    return urlData.publicUrl
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    setEditError('')
    setEditLoading(true)

    if (DEMO_MODE) {
      setStudent(prev => ({ ...prev, ...editForm }))
      setEditing(false)
      setEditLoading(false)
      return
    }

    try {
      const basePath = `${ownerProfile.id}/${student.student_id}`
      const updates = { ...editForm }

      if (newPhoto) {
        updates.photo_url = await uploadFile(newPhoto, `${basePath}/photo.jpg`)
      }
      if (newAadhaarFront) {
        updates.aadhaar_front_url = await uploadFile(newAadhaarFront, `${basePath}/aadhaar-front.jpg`)
      }
      if (newAadhaarBack) {
        updates.aadhaar_back_url = await uploadFile(newAadhaarBack, `${basePath}/aadhaar-back.jpg`)
      }

      const { data, error: updateError } = await supabase
        .from('students')
        .update(updates)
        .eq('id', id)
        .eq('owner_id', ownerProfile.id)
        .select()
        .single()

      if (updateError) throw updateError
      setStudent(data)
      setEditing(false)
    } catch (err) {
      setEditError(err.message || 'Failed to update student')
    }
    setEditLoading(false)
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

  async function handleDownloadCard() {
    if (!student || !qrRef.current) return
    setGeneratingPDF(true)

    try {
      // Dynamically import PDF generation to keep initial bundle small
      const { generateStudentCardPDF, downloadPDF } = await import('../lib/generateStudentCard')

      // Capture QR as PNG data URL
      const svgEl = qrRef.current.querySelector('svg')
      let qrDataUrl = null
      if (svgEl) {
        qrDataUrl = await svgToDataUrl(svgEl, 200)
      }

      const validity = getLastPaymentValidity()
      const validUntilStr = validity
        ? new Date(validity).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : null

      const blob = await generateStudentCardPDF({
        student,
        ownerProfile,
        qrDataUrl,
        validUntil: validUntilStr,
      })

      downloadPDF(blob, `${student.student_id}-card.pdf`)
    } catch (err) {
      console.error('PDF generation failed:', err)
    }
    setGeneratingPDF(false)
  }

  async function handleShareCard() {
    if (!student) return
    if (navigator.share) {
      try {
        const { generateStudentCardPDF } = await import('../lib/generateStudentCard')
        const svgEl = qrRef.current?.querySelector('svg')
        let qrDataUrl = null
        if (svgEl) {
          qrDataUrl = await svgToDataUrl(svgEl, 200)
        }

        const validity = getLastPaymentValidity()
        const validUntilStr = validity
          ? new Date(validity).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
          : null

        const blob = await generateStudentCardPDF({
          student,
          ownerProfile,
          qrDataUrl,
          validUntil: validUntilStr,
        })

        const file = new File([blob], `${student.student_id}-card.pdf`, { type: 'application/pdf' })
        await navigator.share({
          title: `Student Card - ${student.name}`,
          files: [file],
        })
      } catch (err) {
        // Fallback to download
        handleDownloadCard()
      }
    } else {
      handleDownloadCard()
    }
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

  const qrValue = JSON.stringify({
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
        <h1 className="text-lg font-semibold tracking-[-0.4px] text-ink flex-1">Student Profile</h1>
        {!editing && (
          <button
            onClick={startEditing}
            className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium border border-hairline rounded-lg hover:bg-canvas-soft-2 hover:border-hairline-strong transition-all active:scale-[0.97]"
          >
            <Pencil size={12} />
            Edit
          </button>
        )}
      </div>

      {/* Aadhaar Image Viewer Modal */}
      {viewingAadhaar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm animate-fade-in" onClick={() => setViewingAadhaar(null)}>
          <div className="relative max-w-[90vw] max-h-[85vh] bg-canvas rounded-2xl border border-hairline shadow-card overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-hairline">
              <h3 className="text-sm font-semibold text-ink">
                Aadhaar Card — {viewingAadhaar === 'front' ? 'Front' : 'Back'}
              </h3>
              <button onClick={() => setViewingAadhaar(null)} className="p-1.5 hover:bg-canvas-soft-2 rounded-lg transition-colors">
                <X size={16} className="text-body" />
              </button>
            </div>
            <div className="p-4">
              <img
                src={viewingAadhaar === 'front' ? student.aadhaar_front_url : student.aadhaar_back_url}
                alt={`Aadhaar ${viewingAadhaar}`}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Form */}
      {editing && (
        <form onSubmit={handleSaveEdit} className="bg-canvas rounded-2xl border border-hairline p-5 shadow-card space-y-4 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-ink">Edit Student Details</h3>
            <button type="button" onClick={cancelEditing} className="p-1.5 hover:bg-canvas-soft-2 rounded-lg transition-colors">
              <X size={16} className="text-body" />
            </button>
          </div>

          {/* Photo Edit */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => photoEditRef.current?.click()}
              className="group relative w-20 h-20 rounded-2xl bg-canvas-soft-2 border-2 border-dashed border-hairline flex items-center justify-center overflow-hidden hover:border-link/40 hover:bg-link/5 transition-all"
            >
              {newPhotoPreview || student.photo_url ? (
                <img src={newPhotoPreview || student.photo_url} alt="Student" className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <div className="flex flex-col items-center gap-0.5">
                  <Upload size={18} className="text-mute group-hover:text-link" />
                  <span className="text-[9px] font-medium text-mute">Photo</span>
                </div>
              )}
              <div className="absolute inset-0 bg-ink/30 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-2xl transition-opacity">
                <Pencil size={14} className="text-white" />
              </div>
            </button>
            <input ref={photoEditRef} type="file" accept="image/*" capture="user" onChange={handleNewPhotoChange} className="hidden" />
          </div>

          <div>
            <label htmlFor="edit-name" className="block text-xs font-medium text-body mb-1.5">Full Name *</label>
            <input
              id="edit-name" name="name" value={editForm.name} onChange={handleEditChange} required
              className="w-full h-11 px-3.5 border border-hairline rounded-xl text-sm bg-canvas text-ink placeholder:text-mute/60 focus:outline-none focus:ring-2 focus:ring-link/20 focus:border-link transition-all"
            />
          </div>

          <div>
            <label htmlFor="edit-phone" className="block text-xs font-medium text-body mb-1.5">Phone Number *</label>
            <input
              id="edit-phone" name="phone" type="tel" value={editForm.phone} onChange={handleEditChange} required
              className="w-full h-11 px-3.5 border border-hairline rounded-xl text-sm bg-canvas text-ink placeholder:text-mute/60 focus:outline-none focus:ring-2 focus:ring-link/20 focus:border-link transition-all"
              inputMode="numeric"
            />
          </div>

          <div>
            <label htmlFor="edit-address" className="block text-xs font-medium text-body mb-1.5">Address</label>
            <textarea
              id="edit-address" name="address" value={editForm.address} onChange={handleEditChange} rows={2}
              className="w-full px-3.5 py-2.5 border border-hairline rounded-xl text-sm bg-canvas text-ink placeholder:text-mute/60 focus:outline-none focus:ring-2 focus:ring-link/20 focus:border-link resize-none transition-all"
            />
          </div>

          <div>
            <label htmlFor="edit-aadhaar" className="block text-xs font-medium text-body mb-1.5">Aadhaar Number</label>
            <input
              id="edit-aadhaar" name="aadhaar_number" value={editForm.aadhaar_number} onChange={handleEditChange}
              className="w-full h-11 px-3.5 border border-hairline rounded-xl text-sm bg-canvas text-ink placeholder:text-mute/60 focus:outline-none focus:ring-2 focus:ring-link/20 focus:border-link transition-all"
              placeholder="1234 5678 9012" maxLength={14} inputMode="numeric"
            />
          </div>

          <div>
            <label htmlFor="edit-seat" className="block text-xs font-medium text-body mb-1.5">Seat Preference</label>
            <input
              id="edit-seat" name="seat_preference" value={editForm.seat_preference} onChange={handleEditChange}
              className="w-full h-11 px-3.5 border border-hairline rounded-xl text-sm bg-canvas text-ink placeholder:text-mute/60 focus:outline-none focus:ring-2 focus:ring-link/20 focus:border-link transition-all"
              placeholder="e.g. Window side, Row 3"
            />
          </div>

          {/* Aadhaar Photos Upload */}
          <div>
            <h4 className="text-xs font-semibold text-body mb-2">Aadhaar Card Photos</h4>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-hairline rounded-xl bg-canvas-soft/50 cursor-pointer hover:border-link/40 hover:bg-link/5 transition-all">
                <input type="file" accept="image/*" capture="environment" onChange={(e) => setNewAadhaarFront(e.target.files[0])} className="hidden" />
                {newAadhaarFront ? (
                  <div className="flex flex-col items-center gap-1">
                    <Check size={18} className="text-success" />
                    <span className="text-[10px] font-medium text-success">New Front</span>
                  </div>
                ) : student.aadhaar_front_url ? (
                  <div className="flex flex-col items-center gap-1">
                    <Check size={18} className="text-link" />
                    <span className="text-[10px] font-medium text-link">Front Exists</span>
                    <span className="text-[9px] text-mute">Tap to replace</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Upload size={18} className="text-mute" />
                    <span className="text-[10px] font-medium text-mute">Front Side</span>
                  </div>
                )}
              </label>
              <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-hairline rounded-xl bg-canvas-soft/50 cursor-pointer hover:border-link/40 hover:bg-link/5 transition-all">
                <input type="file" accept="image/*" capture="environment" onChange={(e) => setNewAadhaarBack(e.target.files[0])} className="hidden" />
                {newAadhaarBack ? (
                  <div className="flex flex-col items-center gap-1">
                    <Check size={18} className="text-success" />
                    <span className="text-[10px] font-medium text-success">New Back</span>
                  </div>
                ) : student.aadhaar_back_url ? (
                  <div className="flex flex-col items-center gap-1">
                    <Check size={18} className="text-link" />
                    <span className="text-[10px] font-medium text-link">Back Exists</span>
                    <span className="text-[9px] text-mute">Tap to replace</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Upload size={18} className="text-mute" />
                    <span className="text-[10px] font-medium text-mute">Back Side</span>
                  </div>
                )}
              </label>
            </div>
          </div>

          {editError && (
            <p className="text-error text-sm bg-error-soft/50 p-3 rounded-xl border border-error/20 text-center">
              {editError}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={cancelEditing}
              className="flex-1 h-11 text-sm font-medium border border-hairline rounded-xl hover:bg-canvas-soft-2 transition-all active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editLoading || !editForm.name || !editForm.phone}
              className="flex-1 h-11 bg-primary text-on-primary text-sm font-medium rounded-xl hover:bg-ink/90 transition-all disabled:opacity-40 active:scale-[0.98]"
            >
              {editLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                  Saving...
                </span>
              ) : 'Save Changes'}
            </button>
          </div>
        </form>
      )}

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

          {/* QR Code (hidden ref for PDF generation, visible when toggled) */}
          <div ref={qrRef} className={showQR ? 'mt-4 pt-4 border-t border-hairline/60 flex justify-center animate-scale-in' : 'absolute -left-[9999px]'}>
            <div className="p-4 bg-canvas-soft rounded-xl border border-hairline">
              <QRCodeSVG value={qrValue} size={140} level="M" />
            </div>
          </div>

          {/* Card actions */}
          <div className="flex gap-2 mt-4 pt-4 border-t border-hairline/60">
            <button
              onClick={handleDownloadCard}
              disabled={generatingPDF}
              className="flex-1 flex items-center justify-center gap-1.5 h-9 text-xs font-medium bg-primary text-on-primary rounded-lg hover:bg-ink/90 transition-all active:scale-[0.97] disabled:opacity-50"
            >
              <Download size={13} />
              {generatingPDF ? 'Generating...' : 'Download Card'}
            </button>
            <button
              onClick={handleShareCard}
              className="flex items-center justify-center gap-1.5 h-9 px-3 text-xs font-medium border border-hairline rounded-lg hover:bg-canvas-soft-2 hover:border-hairline-strong transition-all active:scale-[0.97]"
            >
              <Share2 size={13} />
              Share
            </button>
          </div>

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

          {/* Aadhaar Card Photos Section */}
          {(student.aadhaar_front_url || student.aadhaar_back_url) && (
            <div className="mt-4 pt-4 border-t border-hairline/60">
              <h4 className="text-xs font-semibold text-mute uppercase tracking-wider mb-3">Aadhaar Card</h4>
              <div className="grid grid-cols-2 gap-3">
                {student.aadhaar_front_url && (
                  <button
                    onClick={() => setViewingAadhaar('front')}
                    className="relative group h-20 rounded-xl overflow-hidden border border-hairline hover:border-link/40 transition-all"
                  >
                    <img src={student.aadhaar_front_url} alt="Aadhaar Front" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/30 flex items-center justify-center transition-all">
                      <Eye size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <span className="absolute bottom-1 left-1 text-[9px] font-medium bg-canvas/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-body">Front</span>
                  </button>
                )}
                {student.aadhaar_back_url && (
                  <button
                    onClick={() => setViewingAadhaar('back')}
                    className="relative group h-20 rounded-xl overflow-hidden border border-hairline hover:border-link/40 transition-all"
                  >
                    <img src={student.aadhaar_back_url} alt="Aadhaar Back" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/30 flex items-center justify-center transition-all">
                      <Eye size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <span className="absolute bottom-1 left-1 text-[9px] font-medium bg-canvas/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-body">Back</span>
                  </button>
                )}
              </div>
            </div>
          )}
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
                    <CreditCard size={13} className="text-success" />
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
