import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { DEMO_MODE, mockAttendanceLogs, mockStudents } from '../lib/mockData'
import { LogIn, LogOut, QrCode, Clock, Search, X, Pencil, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

export default function Attendance() {
  const { ownerProfile } = useAuth()
  const [todayLogs, setTodayLogs] = useState([])
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showDoorQR, setShowDoorQR] = useState(false)
  const [marking, setMarking] = useState(null)
  const [editLog, setEditLog] = useState(null)
  const [editExitTime, setEditExitTime] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [historyLogs, setHistoryLogs] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const isToday = selectedDate === today

  async function handleEditSave(e) {
    e.preventDefault()
    if (!editLog || !editExitTime) return
    setEditSaving(true)

    const [hours, minutes] = editExitTime.split(':').map(Number)
    const entryDate = new Date(editLog.entry_time)
    const exitTime = new Date(entryDate)
    exitTime.setHours(hours, minutes, 0, 0)

    // If exit time is before entry, something is wrong — clamp to entry
    if (exitTime <= entryDate) {
      exitTime.setTime(entryDate.getTime() + 60000) // at least 1 min
    }

    const durationMinutes = Math.round((exitTime.getTime() - entryDate.getTime()) / (1000 * 60))

    if (DEMO_MODE) {
      setTodayLogs(prev => prev.map(l =>
        l.id === editLog.id
          ? { ...l, exit_time: exitTime.toISOString(), duration_minutes: durationMinutes, method: 'manual' }
          : l
      ))
    } else {
      await supabase
        .from('attendance_logs')
        .update({
          exit_time: exitTime.toISOString(),
          duration_minutes: durationMinutes,
          method: 'manual', // Mark as manually corrected
        })
        .eq('id', editLog.id)

      await fetchTodayLogs()
    }

    setEditLog(null)
    setEditExitTime('')
    setEditSaving(false)
  }

  useEffect(() => {
    if (ownerProfile) {
      fetchTodayLogs()
      fetchStudents()
    }
  }, [ownerProfile])

  useEffect(() => {
    if (ownerProfile && !isToday) {
      fetchHistoryLogs(selectedDate)
    }
  }, [selectedDate, ownerProfile])

  async function fetchHistoryLogs(date) {
    setHistoryLoading(true)
    if (DEMO_MODE) {
      setHistoryLogs(mockAttendanceLogs)
      setHistoryLoading(false)
      return
    }

    const { data } = await supabase
      .from('attendance_logs')
      .select('*, students(name, student_id)')
      .eq('owner_id', ownerProfile.id)
      .eq('date', date)
      .order('entry_time', { ascending: false })

    setHistoryLogs(data || [])
    setHistoryLoading(false)
  }

  function changeDate(offset) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + offset)
    if (d <= new Date()) {
      setSelectedDate(d.toISOString().split('T')[0])
    }
  }

  function downloadCSV() {
    const logs = isToday ? todayLogs : historyLogs
    if (logs.length === 0) return

    const headers = ['Student Name', 'Student ID', 'Date', 'Entry Time', 'Exit Time', 'Duration (minutes)', 'Method']
    const rows = logs.map(log => [
      log.students?.name || '',
      log.students?.student_id || '',
      log.date || selectedDate,
      log.entry_time ? new Date(log.entry_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '',
      log.exit_time ? new Date(log.exit_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Still inside',
      log.duration_minutes != null ? log.duration_minutes : '',
      log.method || '',
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `attendance-${selectedDate}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

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
          <p className="text-xs text-mute mt-0.5">{new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadCSV}
            disabled={(isToday ? todayLogs : historyLogs).length === 0}
            className="flex items-center gap-1.5 h-9 px-3.5 text-xs font-medium rounded-xl border border-hairline text-body hover:border-hairline-strong hover:shadow-card transition-all active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none"
            title="Download attendance CSV"
          >
            <Download size={14} />
            Download
          </button>
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
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => changeDate(-1)}
          className="p-2 rounded-lg hover:bg-canvas-soft-2 transition-colors text-mute hover:text-body"
        >
          <ChevronLeft size={18} />
        </button>
        <input
          type="date"
          value={selectedDate}
          max={today}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="h-9 px-3 border border-hairline rounded-xl text-sm bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-link/20 focus:border-link transition-all"
        />
        <button
          onClick={() => changeDate(1)}
          disabled={selectedDate === today}
          className="p-2 rounded-lg hover:bg-canvas-soft-2 transition-colors text-mute hover:text-body disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronRight size={18} />
        </button>
        {!isToday && (
          <button
            onClick={() => setSelectedDate(today)}
            className="text-xs font-medium text-link hover:underline"
          >
            Today
          </button>
        )}
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

      {/* Currently Inside - only show for today */}
      {isToday && (
      <>
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
      </>
      )}

      {/* Previous Day History */}
      {!isToday && (
        <div>
          <h2 className="text-xs font-semibold text-mute uppercase tracking-wider mb-3">
            Attendance · {historyLogs.length} records
          </h2>
          {historyLoading ? (
            <div className="bg-canvas rounded-xl border border-hairline p-8 text-center">
              <p className="text-sm text-mute">Loading...</p>
            </div>
          ) : historyLogs.length === 0 ? (
            <div className="bg-canvas rounded-xl border border-hairline p-8 text-center">
              <p className="text-sm text-mute">No attendance records for this date</p>
            </div>
          ) : (
            <div className="bg-canvas rounded-xl border border-hairline overflow-hidden shadow-card">
              {historyLogs.map((log, i) => (
                <div
                  key={log.id}
                  className={`px-4 py-3 flex items-center justify-between ${
                    i !== historyLogs.length - 1 ? 'border-b border-hairline/60' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-canvas-soft-2 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-mute">
                        {log.students?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm text-ink">{log.students?.name}</p>
                        {log.method === 'auto_closed' && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-warning-soft text-warning border border-warning/20">
                            Auto-closed
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-mute font-mono">{log.students?.student_id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-body">
                      {log.entry_time ? new Date(log.entry_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      {' → '}
                      {log.exit_time ? new Date(log.exit_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'No exit'}
                    </p>
                    {log.duration_minutes != null && (
                      <p className="text-[11px] text-mute font-medium">
                        {Math.floor(log.duration_minutes / 60)}h {log.duration_minutes % 60}m
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Completed Today */}
      {isToday && completedLogs.length > 0 && (
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
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm text-ink">{log.students?.name}</p>
                      {log.method === 'auto_closed' && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-warning-soft text-warning border border-warning/20">
                          Auto-closed
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-mute font-mono">{log.students?.student_id}</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-2">
                  <div>
                    <p className="text-xs text-body">
                      {new Date(log.entry_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      {' → '}
                      {new Date(log.exit_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-[11px] text-mute font-medium">
                      {Math.floor(log.duration_minutes / 60)}h {log.duration_minutes % 60}m
                    </p>
                  </div>
                  {log.method === 'auto_closed' && (
                    <button
                      onClick={() => setEditLog(log)}
                      className="p-1.5 text-mute hover:text-body hover:bg-canvas-soft-2 rounded-md transition-colors"
                      aria-label="Edit session"
                    >
                      <Pencil size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Auto-Closed Session Modal */}
      {editLog && (
        <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-canvas rounded-2xl w-full max-w-sm p-6 shadow-modal animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-ink">Edit Session</h3>
                <p className="text-xs text-mute mt-0.5">
                  {editLog.students?.name} · {new Date(editLog.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </p>
              </div>
              <button onClick={() => setEditLog(null)} className="p-1.5 hover:bg-canvas-soft-2 rounded-lg">
                <X size={18} className="text-mute" />
              </button>
            </div>

            <p className="text-xs text-warning bg-warning-soft/50 p-2 rounded-lg mb-4">
              This session was auto-closed because the student forgot to scan exit.
            </p>

            <form onSubmit={handleEditSave} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Actual Exit Time</label>
                <input
                  type="time"
                  value={editExitTime}
                  onChange={(e) => setEditExitTime(e.target.value)}
                  className="w-full h-11 px-3.5 border border-hairline rounded-xl text-sm bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-link/20 focus:border-link transition-all"
                />
              </div>
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditLog(null)}
                  className="flex-1 h-10 text-sm font-medium border border-hairline rounded-xl hover:bg-canvas-soft-2 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="flex-1 h-10 text-sm font-medium bg-primary text-on-primary rounded-xl hover:bg-ink/90 transition-all disabled:opacity-50"
                >
                  {editSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
