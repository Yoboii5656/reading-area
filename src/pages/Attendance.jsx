import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { DEMO_MODE, mockAttendanceLogs, mockStudents } from '../lib/mockData'
import { LogIn, LogOut, QrCode, Clock, Search, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

export default function Attendance() {
  const { ownerProfile } = useAuth()
  const [todayLogs, setTodayLogs] = useState([])
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showDoorQR, setShowDoorQR] = useState(false)
  const [marking, setMarking] = useState(null)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (ownerProfile) {
      fetchTodayLogs()
      fetchStudents()
    }
  }, [ownerProfile])

  async function fetchTodayLogs() {
    if (DEMO_MODE) {
      setTodayLogs(mockAttendanceLogs)
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('attendance_logs')
      .select('*, students(name, student_id)')
      .eq('owner_id', ownerProfile.id)
      .eq('date', today)
      .order('entry_time', { ascending: false })

    setTodayLogs(data || [])
    setLoading(false)
  }

  async function fetchStudents() {
    if (DEMO_MODE) {
      setStudents(mockStudents.map(s => ({ id: s.id, name: s.name, student_id: s.student_id })))
      return
    }

    const { data } = await supabase
      .from('students')
      .select('id, name, student_id')
      .eq('owner_id', ownerProfile.id)
      .eq('is_active', true)
      .order('name')

    setStudents(data || [])
  }

  async function markEntry(studentId) {
    setMarking(studentId)

    if (DEMO_MODE) {
      const student = mockStudents.find(s => s.id === studentId)
      const newLog = {
        id: `att-new-${Date.now()}`,
        student_id: studentId,
        owner_id: ownerProfile.id,
        date: today,
        entry_time: new Date().toISOString(),
        exit_time: null,
        duration_minutes: null,
        method: 'manual',
        students: { name: student?.name, student_id: student?.student_id },
      }
      setTodayLogs(prev => [newLog, ...prev])
      setMarking(null)
      setSearch('')
      return
    }

    const now = new Date().toISOString()
    await supabase.from('attendance_logs').insert({
      student_id: studentId,
      owner_id: ownerProfile.id,
      date: today,
      entry_time: now,
      method: 'manual',
    })
    await fetchTodayLogs()
    setMarking(null)
    setSearch('')
  }

  async function markExit(logId, entryTime) {
    setMarking(logId)

    if (DEMO_MODE) {
      const now = new Date()
      const entry = new Date(entryTime)
      const duration = Math.round((now - entry) / (1000 * 60))
      setTodayLogs(prev => prev.map(l =>
        l.id === logId ? { ...l, exit_time: now.toISOString(), duration_minutes: duration } : l
      ))
      setMarking(null)
      return
    }

    const now = new Date()
    const entry = new Date(entryTime)
    const duration = Math.round((now - entry) / (1000 * 60))

    await supabase
      .from('attendance_logs')
      .update({ exit_time: now.toISOString(), duration_minutes: duration })
      .eq('id', logId)

    await fetchTodayLogs()
    setMarking(null)
  }

  const insideLogs = todayLogs.filter(l => l.entry_time && !l.exit_time)
  const completedLogs = todayLogs.filter(l => l.exit_time)

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.student_id.toLowerCase().includes(search.toLowerCase())
  )

  const doorQRUrl = `${window.location.origin}/scan/${ownerProfile.id}`

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.6px] text-ink">Attendance</h1>
          <p className="text-xs text-mute mt-0.5">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
        </div>
        <button
          onClick={() => setShowDoorQR(!showDoorQR)}
          className={`flex items-center gap-1.5 h-9 px-3.5 text-xs font-medium rounded-xl transition-all active:scale-[0.97] ${
            showDoorQR
              ? 'bg-primary text-on-primary'
              : 'border border-hairline text-body hover:border-hairline-strong hover:shadow-card'
          }`}
        >
          <QrCode size={14} />
          Door QR
        </button>
      </div>

      {/* Door QR Code Modal */}
      {showDoorQR && (
        <div className="bg-canvas rounded-2xl border border-hairline p-6 text-center shadow-card animate-scale-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-ink">Door Entry QR Code</h3>
            <button onClick={() => setShowDoorQR(false)} className="p-1 hover:bg-canvas-soft-2 rounded-md">
              <X size={16} className="text-mute" />
            </button>
          </div>
          <div className="inline-block p-5 bg-canvas rounded-xl border border-hairline shadow-card">
            <QRCodeSVG value={doorQRUrl} size={180} level="M" />
          </div>
          <p className="text-xs text-mute mt-4 max-w-[240px] mx-auto leading-relaxed">
            Print and display this at your entrance. Students scan to log entry/exit — no app needed.
          </p>
        </div>
      )}

      {/* Currently Inside */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
          <h2 className="text-xs font-semibold text-mute uppercase tracking-wider">
            Inside Now · {insideLogs.length}
          </h2>
        </div>
        {insideLogs.length === 0 ? (
          <div className="bg-canvas rounded-xl border border-hairline p-8 text-center">
            <p className="text-sm text-mute">No one inside right now</p>
          </div>
        ) : (
          <div className="bg-canvas rounded-xl border border-hairline overflow-hidden shadow-card">
            {insideLogs.map((log, i) => (
              <div
                key={log.id}
                className={`flex items-center justify-between px-4 py-3.5 ${
                  i !== insideLogs.length - 1 ? 'border-b border-hairline/60' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-success">
                      {log.students?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">{log.students?.name}</p>
                    <p className="text-[11px] text-mute flex items-center gap-1">
                      <Clock size={9} />
                      {new Date(log.entry_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => markExit(log.id, log.entry_time)}
                  disabled={marking === log.id}
                  className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-error border border-error/20 rounded-lg hover:bg-error-soft/50 transition-all disabled:opacity-50 active:scale-[0.97]"
                >
                  <LogOut size={12} />
                  Exit
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mark Entry Section */}
      <div>
        <h2 className="text-xs font-semibold text-mute uppercase tracking-wider mb-3">Mark Entry</h2>
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type student name or ID..."
            className="w-full h-11 pl-10 pr-4 border border-hairline rounded-xl text-sm bg-canvas text-ink placeholder:text-mute/60 focus:outline-none focus:ring-2 focus:ring-link/20 focus:border-link shadow-card transition-all"
          />
        </div>
        {search && (
          <div className="mt-2 bg-canvas rounded-xl border border-hairline overflow-hidden shadow-card max-h-52 overflow-y-auto animate-scale-in">
            {filteredStudents.length === 0 ? (
              <p className="px-4 py-3 text-sm text-mute">No students match</p>
            ) : (
              filteredStudents.map((s, i) => {
                const isInside = insideLogs.some(l => l.student_id === s.id)
                return (
                  <button
                    key={s.id}
                    onClick={() => !isInside && markEntry(s.id)}
                    disabled={isInside || marking === s.id}
                    className={`w-full flex items-center justify-between px-4 py-3 hover:bg-canvas-soft/50 transition-colors disabled:opacity-50 text-left ${
                      i !== filteredStudents.length - 1 ? 'border-b border-hairline/60' : ''
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-ink">{s.name}</p>
                      <p className="text-[11px] text-mute font-mono">{s.student_id}</p>
                    </div>
                    {isInside ? (
                      <span className="text-[11px] font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">
                        Already inside
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium text-link">
                        <LogIn size={12} /> Mark
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Completed Today */}
      {completedLogs.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-mute uppercase tracking-wider mb-3">
            Completed · {completedLogs.length}
          </h2>
          <div className="bg-canvas rounded-xl border border-hairline overflow-hidden shadow-card">
            {completedLogs.map((log, i) => (
              <div
                key={log.id}
                className={`px-4 py-3 flex items-center justify-between ${
                  i !== completedLogs.length - 1 ? 'border-b border-hairline/60' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-canvas-soft-2 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-mute">
                      {log.students?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-ink">{log.students?.name}</p>
                    <p className="text-[11px] text-mute font-mono">{log.students?.student_id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-body">
                    {new Date(log.entry_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    {' → '}
                    {new Date(log.exit_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-[11px] text-mute font-medium">
                    {Math.floor(log.duration_minutes / 60)}h {log.duration_minutes % 60}m
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
