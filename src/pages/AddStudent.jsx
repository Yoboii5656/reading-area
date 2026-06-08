import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { DEMO_MODE } from '../lib/mockData'
import { Camera, ArrowLeft, User, Upload, Check } from 'lucide-react'

export default function AddStudent() {
  const { ownerProfile } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [aadhaarFront, setAadhaarFront] = useState(null)
  const [aadhaarBack, setAadhaarBack] = useState(null)
  const photoRef = useRef()

  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    aadhaar_number: '',
    seat_preference: '',
  })

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (file) {
      setPhoto(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  async function uploadFile(file, path) {
    const { error } = await supabase.storage.from('student-files').upload(path, file, { upsert: true })
    if (error) throw error
    const { data: urlData } = supabase.storage.from('student-files').getPublicUrl(path)
    return urlData.publicUrl
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (DEMO_MODE) {
      setTimeout(() => {
        setLoading(false)
        navigate('/students')
      }, 800)
      return
    }

    if (!ownerProfile?.id) {
      setError('Owner profile not loaded. Please try again.')
      setLoading(false)
      return
    }

    try {
      const { count } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', ownerProfile.id)
      const studentId = `RA-${String((count || 0) + 1).padStart(4, '0')}`
      const basePath = `${ownerProfile.id}/${studentId}`

      let photoUrl = null, aadhaarFrontUrl = null, aadhaarBackUrl = null
      if (photo) photoUrl = await uploadFile(photo, `${basePath}/photo.jpg`)
      if (aadhaarFront) aadhaarFrontUrl = await uploadFile(aadhaarFront, `${basePath}/aadhaar-front.jpg`)
      if (aadhaarBack) aadhaarBackUrl = await uploadFile(aadhaarBack, `${basePath}/aadhaar-back.jpg`)

      const { data, error: insertError } = await supabase
        .from('students')
        .insert({
          owner_id: ownerProfile.id,
          student_id: studentId,
          name: form.name,
          phone: form.phone,
          address: form.address,
          aadhaar_number: form.aadhaar_number,
          photo_url: photoUrl,
          aadhaar_front_url: aadhaarFrontUrl,
          aadhaar_back_url: aadhaarBackUrl,
          seat_preference: form.seat_preference,
          joined_at: new Date().toISOString().split('T')[0],
          is_active: true,
        })
        .select()
        .single()

      if (insertError) throw insertError
      navigate(`/students/${data.id}`)
    } catch (err) {
      setError(err.message || 'Failed to add student')
    }
    setLoading(false)
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/students" className="p-2 -ml-2 hover:bg-canvas-soft-2 rounded-xl transition-colors active:scale-95">
          <ArrowLeft size={20} className="text-body" />
        </Link>
        <h1 className="text-lg font-semibold tracking-[-0.4px] text-ink">New Student</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Photo Upload */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => photoRef.current?.click()}
            className="group relative w-24 h-24 rounded-2xl bg-canvas-soft-2 border-2 border-dashed border-hairline flex items-center justify-center overflow-hidden hover:border-link/40 hover:bg-link/5 transition-all"
          >
            {photoPreview ? (
              <img src={photoPreview} alt="Student" className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Camera size={22} className="text-mute group-hover:text-link transition-colors" />
                <span className="text-[10px] font-medium text-mute group-hover:text-link">Add Photo</span>
              </div>
            )}
            {photoPreview && (
              <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-success flex items-center justify-center">
                <Check size={10} className="text-white" />
              </div>
            )}
          </button>
          <input ref={photoRef} type="file" accept="image/*" capture="user" onChange={handlePhotoChange} className="hidden" />
        </div>

        {/* Form Fields */}
        <div className="bg-canvas rounded-2xl border border-hairline p-5 shadow-card space-y-4">
          <div>
            <label htmlFor="name" className="block text-xs font-medium text-body mb-1.5">Full Name *</label>
            <input
              id="name" name="name" value={form.name} onChange={handleChange} required
              className="w-full h-11 px-3.5 border border-hairline rounded-xl text-sm bg-canvas text-ink placeholder:text-mute/60 focus:outline-none focus:ring-2 focus:ring-link/20 focus:border-link transition-all"
              placeholder="Student's full name"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-xs font-medium text-body mb-1.5">Phone Number *</label>
            <input
              id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange} required
              className="w-full h-11 px-3.5 border border-hairline rounded-xl text-sm bg-canvas text-ink placeholder:text-mute/60 focus:outline-none focus:ring-2 focus:ring-link/20 focus:border-link transition-all"
              placeholder="9876543210" inputMode="numeric"
            />
          </div>

          <div>
            <label htmlFor="address" className="block text-xs font-medium text-body mb-1.5">Address</label>
            <textarea
              id="address" name="address" value={form.address} onChange={handleChange} rows={2}
              className="w-full px-3.5 py-2.5 border border-hairline rounded-xl text-sm bg-canvas text-ink placeholder:text-mute/60 focus:outline-none focus:ring-2 focus:ring-link/20 focus:border-link resize-none transition-all"
              placeholder="Full address"
            />
          </div>

          <div>
            <label htmlFor="aadhaar_number" className="block text-xs font-medium text-body mb-1.5">Aadhaar Number</label>
            <input
              id="aadhaar_number" name="aadhaar_number" value={form.aadhaar_number} onChange={handleChange}
              className="w-full h-11 px-3.5 border border-hairline rounded-xl text-sm bg-canvas text-ink placeholder:text-mute/60 focus:outline-none focus:ring-2 focus:ring-link/20 focus:border-link transition-all"
              placeholder="1234 5678 9012" maxLength={14} inputMode="numeric"
            />
          </div>

          <div>
            <label htmlFor="seat_preference" className="block text-xs font-medium text-body mb-1.5">Seat Preference</label>
            <input
              id="seat_preference" name="seat_preference" value={form.seat_preference} onChange={handleChange}
              className="w-full h-11 px-3.5 border border-hairline rounded-xl text-sm bg-canvas text-ink placeholder:text-mute/60 focus:outline-none focus:ring-2 focus:ring-link/20 focus:border-link transition-all"
              placeholder="e.g. Window side, Row 3"
            />
          </div>
        </div>

        {/* Aadhaar Document Upload */}
        <div className="bg-canvas rounded-2xl border border-hairline p-5 shadow-card">
          <h3 className="text-xs font-semibold text-body mb-3">Aadhaar Card Photos</h3>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-hairline rounded-xl bg-canvas-soft/50 cursor-pointer hover:border-link/40 hover:bg-link/5 transition-all">
              <input type="file" accept="image/*" capture="environment" onChange={(e) => setAadhaarFront(e.target.files[0])} className="hidden" />
              {aadhaarFront ? (
                <div className="flex flex-col items-center gap-1">
                  <Check size={18} className="text-success" />
                  <span className="text-[10px] font-medium text-success">Front Added</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Upload size={18} className="text-mute" />
                  <span className="text-[10px] font-medium text-mute">Front Side</span>
                </div>
              )}
            </label>
            <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-hairline rounded-xl bg-canvas-soft/50 cursor-pointer hover:border-link/40 hover:bg-link/5 transition-all">
              <input type="file" accept="image/*" capture="environment" onChange={(e) => setAadhaarBack(e.target.files[0])} className="hidden" />
              {aadhaarBack ? (
                <div className="flex flex-col items-center gap-1">
                  <Check size={18} className="text-success" />
                  <span className="text-[10px] font-medium text-success">Back Added</span>
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

        {error && (
          <p className="text-error text-sm bg-error-soft/50 p-3 rounded-xl border border-error/20 text-center">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !form.name || !form.phone}
          className="w-full h-12 bg-primary text-on-primary text-sm font-medium rounded-xl hover:bg-ink/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
              Adding Student...
            </span>
          ) : 'Add Student'}
        </button>
      </form>
    </div>
  )
}
