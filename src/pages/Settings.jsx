import { useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { DEMO_MODE } from '../lib/mockData'
import { LogOut, Upload, Save, QrCode, Check, Building2, IndianRupee, MapPin } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

export default function Settings() {
  const { ownerProfile, signOut, setOwnerProfile } = useAuth()
  const [form, setForm] = useState({
    reading_area_name: ownerProfile?.reading_area_name || '',
    address: ownerProfile?.address || '',
    monthly_fee: ownerProfile?.monthly_fee || '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [upiUploading, setUpiUploading] = useState(false)
  const fileRef = useRef()

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)

    if (DEMO_MODE) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      setSaving(false)
      return
    }

    const { data, error } = await supabase
      .from('owners')
      .update({
        reading_area_name: form.reading_area_name,
        address: form.address,
        monthly_fee: parseFloat(form.monthly_fee) || 0,
      })
      .eq('id', ownerProfile.id)
      .select()
      .single()

    if (!error && data) {
      setOwnerProfile(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  async function handleUpiUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    if (DEMO_MODE) return
    setUpiUploading(true)

    const path = `${ownerProfile.id}/upi-qr.png`
    await supabase.storage.from('owner-files').upload(path, file, { upsert: true })
    const { data: urlData } = supabase.storage.from('owner-files').getPublicUrl(path)

    const { data } = await supabase
      .from('owners')
      .update({ upi_qr_url: urlData.publicUrl })
      .eq('id', ownerProfile.id)
      .select()
      .single()

    if (data) setOwnerProfile(data)
    setUpiUploading(false)
  }

  const doorQRUrl = `${window.location.origin}/scan/${ownerProfile?.id}`

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-[22px] font-semibold tracking-[-0.6px] text-ink">Settings</h1>

      {/* Profile Card */}
      <div className="bg-canvas rounded-2xl border border-hairline p-5 shadow-card">
        <div className="flex items-center gap-3 mb-5 pb-5 border-b border-hairline/60">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gradient-develop-start to-gradient-develop-end flex items-center justify-center">
            <span className="text-white font-bold text-base">
              {ownerProfile?.name?.charAt(0)?.toUpperCase() || 'R'}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">{ownerProfile?.name}</p>
            <p className="text-xs text-mute">{ownerProfile?.phone} · {ownerProfile?.plan} plan</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="reading_area_name" className="flex items-center gap-1.5 text-xs font-medium text-body mb-1.5">
              <Building2 size={12} /> Reading Area Name
            </label>
            <input
              id="reading_area_name"
              name="reading_area_name"
              value={form.reading_area_name}
              onChange={handleChange}
              className="w-full h-11 px-3.5 border border-hairline rounded-xl text-sm bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-link/20 focus:border-link transition-all"
            />
          </div>
          <div>
            <label htmlFor="address" className="flex items-center gap-1.5 text-xs font-medium text-body mb-1.5">
              <MapPin size={12} /> Address
            </label>
            <input
              id="address"
              name="address"
              value={form.address}
              onChange={handleChange}
              className="w-full h-11 px-3.5 border border-hairline rounded-xl text-sm bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-link/20 focus:border-link transition-all"
            />
          </div>
          <div>
            <label htmlFor="monthly_fee" className="flex items-center gap-1.5 text-xs font-medium text-body mb-1.5">
              <IndianRupee size={12} /> Monthly Fee
            </label>
            <input
              id="monthly_fee"
              name="monthly_fee"
              type="number"
              value={form.monthly_fee}
              onChange={handleChange}
              className="w-full h-11 px-3.5 border border-hairline rounded-xl text-sm bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-link/20 focus:border-link transition-all"
              inputMode="numeric"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className={`flex items-center justify-center gap-2 w-full h-11 text-sm font-medium rounded-xl transition-all active:scale-[0.98] ${
              saved
                ? 'bg-success/10 text-success border border-success/20'
                : 'bg-primary text-on-primary hover:bg-ink/90'
            }`}
          >
            {saved ? (
              <><Check size={14} /> Saved!</>
            ) : saving ? (
              <><div className="w-3.5 h-3.5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" /> Saving...</>
            ) : (
              <><Save size={14} /> Save Changes</>
            )}
          </button>
        </form>
      </div>

      {/* UPI QR Upload */}
      <div className="bg-canvas rounded-2xl border border-hairline p-5 shadow-card">
        <h2 className="text-sm font-semibold text-ink mb-1">Payment QR Code</h2>
        <p className="text-xs text-mute mb-4">
          Upload your GPay/PhonePe QR. Students scan this to pay fees directly.
        </p>
        {ownerProfile?.upi_qr_url && (
          <div className="mb-4 p-3 bg-canvas-soft rounded-xl border border-hairline inline-block">
            <img
              src={ownerProfile.upi_qr_url}
              alt="UPI QR"
              className="w-28 h-28 rounded-lg object-contain"
            />
          </div>
        )}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={upiUploading}
          className="flex items-center gap-1.5 h-9 px-4 text-xs font-medium border border-hairline rounded-xl hover:bg-canvas-soft-2 hover:border-hairline-strong transition-all disabled:opacity-50 active:scale-[0.97]"
        >
          <Upload size={13} />
          {upiUploading ? 'Uploading...' : ownerProfile?.upi_qr_url ? 'Replace QR' : 'Upload QR Image'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleUpiUpload} className="hidden" />
      </div>

      {/* Door QR */}
      <div className="bg-canvas rounded-2xl border border-hairline p-5 text-center shadow-card">
        <div className="flex items-center justify-center gap-2 mb-4">
          <QrCode size={16} className="text-body" />
          <h2 className="text-sm font-semibold text-ink">Door Entry QR</h2>
        </div>
        <div className="inline-block p-4 bg-canvas-soft rounded-xl border border-hairline">
          <QRCodeSVG value={doorQRUrl} size={160} level="M" />
        </div>
        <p className="text-xs text-mute mt-3 max-w-[220px] mx-auto leading-relaxed">
          Print and display at your entrance. Students scan to log attendance.
        </p>
      </div>

      {/* Sign Out */}
      <button
        onClick={signOut}
        className="flex items-center justify-center gap-2 w-full h-11 text-sm font-medium text-error border border-error/20 rounded-xl hover:bg-error-soft/50 transition-all active:scale-[0.98]"
      >
        <LogOut size={14} />
        Sign Out
      </button>

      <p className="text-[11px] text-mute text-center pb-4">
        Reading Area Manager v1.0 · {ownerProfile?.name}
      </p>
    </div>
  )
}
