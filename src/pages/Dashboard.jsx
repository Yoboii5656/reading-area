import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { DEMO_MODE, mockAttendanceLogs, mockStudents, mockFeePayments } from '../lib/mockData'
import { Users, UserPlus, LogIn, CreditCard, Clock, AlertTriangle, ArrowRight, Zap } from 'lucide-react'

export default function Dashboard() {
  const { ownerProfile } = useAuth()
  const [stats, setStats] = useState({
    currentlyInside: 0,
    todayEntries: 0,
    totalStudents: 0,
    expiringCount: 0,
  })
  const [liveStudents, setLiveStudents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (ownerProfile) fetchDashboardData()
  }, [ownerProfile])

  async function fetchDashboardData() {
    if (DEMO_MODE) {
      const insideLogs = mockAttendanceLogs.filter(l => l.entry_time && !l.exit_time)
      const totalEntries = mockAttendanceLogs.filter(l => l.entry_time).length
      const today = new Date().toISOString().split('T')[0]
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)
      const expiring = mockFeePayments.filter(p =>
        p.valid_until >= today && p.valid_until <= nextWeek.toISOString().split('T')[0]
      )

      setStats({
        currentlyInside: insideLogs.length,
        todayEntries: totalEntries,
        totalStudents: mockStudents.length,
        expiringCount: expiring.length,
      })

      setLiveStudents(insideLogs.map(l => ({
        id: l.student_id,
        name: l.students?.name || 'Unknown',
        studentId: l.students?.student_id || '',
        entryTime: l.entry_time,
      })))

      setLoading(false)
      return
    }

    const today = new Date().toISOString().split('T')[0]
    const ownerId = ownerProfile.id

    const { data: todayLogs } = await supabase
      .from('attendance_logs')
      .select('*, students(name, student_id)')
      .eq('owner_id', ownerId)
      .eq('date', today)

    const insideLogs = (todayLogs || []).filter(l => l.entry_time && !l.exit_time)
    const totalEntries = (todayLogs || []).filter(l => l.entry_time).length

    const { count: totalStudents } = await supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', ownerId)
      .eq('is_active', true)

    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    const { count: expiringCount } = await supabase
      .from('fee_payments')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', ownerId)
      .lte('valid_until', nextWeek.toISOString().split('T')[0])
      .gte('valid_until', today)

    setStats({
      currentlyInside: insideLogs.length,
      todayEntries: totalEntries,
      totalStudents: totalStudents || 0,
      expiringCount: expiringCount || 0,
    })

    setLiveStudents(insideLogs.map(l => ({
      id: l.student_id,
      name: l.students?.name || 'Unknown',
      studentId: l.students?.student_id || '',
      entryTime: l.entry_time,
    })))

    setLoading(false)
  }

  function formatTime(timestamp) {
    if (!timestamp) return ''
    return new Date(timestamp).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  function getElapsed(entryTime) {
    const diff = Date.now() - new Date(entryTime).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m`
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-canvas-soft-2 rounded-md animate-shimmer" />
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-28 bg-canvas rounded-xl animate-shimmer" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-mute font-medium">Good {getGreeting()}</p>
          <h1 className="text-[22px] font-semibold tracking-[-0.6px] text-ink mt-0.5">
            {ownerProfile.reading_area_name}
          </h1>
        </div>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gradient-develop-start to-gradient-develop-end flex items-center justify-center">
          <span className="text-white text-sm font-semibold">
            {ownerProfile.name?.charAt(0)?.toUpperCase() || 'R'}
          </span>
        </div>
      </div>

      {/* Hero Stats Card */}
      <div className="relative overflow-hidden bg-primary rounded-2xl p-5 text-on-primary">
        {/* Decorative gradient orb */}
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br from-gradient-develop-start/30 to-gradient-preview-end/20 blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-gradient-to-tr from-cyan/20 to-transparent blur-xl" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-cyan rounded-full animate-pulse" />
            <span className="text-xs font-medium text-on-primary/70 uppercase tracking-wider">Live Now</span>
          </div>
          <p className="text-[42px] font-bold tracking-[-2px] leading-none">
            {stats.currentlyInside}
          </p>
          <p className="text-sm text-on-primary/60 mt-1">
            student{stats.currentlyInside !== 1 ? 's' : ''} studying right now
          </p>
        </div>

        <div className="relative flex items-center gap-4 mt-5 pt-4 border-t border-white/10">
          <div className="flex-1">
            <p className="text-xl font-semibold">{stats.todayEntries}</p>
            <p className="text-xs text-on-primary/50">entries today</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex-1">
            <p className="text-xl font-semibold">{stats.totalStudents}</p>
            <p className="text-xs text-on-primary/50">total students</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex-1">
            <p className="text-xl font-semibold text-warning">{stats.expiringCount}</p>
            <p className="text-xs text-on-primary/50">expiring soon</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xs font-semibold text-mute uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-2.5">
          <Link
            to="/attendance"
            className="group flex flex-col items-center gap-2 p-4 bg-canvas rounded-xl border border-hairline hover:shadow-card-hover hover:border-hairline-strong transition-all duration-200 active:scale-[0.97]"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gradient-develop-start/10 to-gradient-develop-end/10 flex items-center justify-center group-hover:from-gradient-develop-start/20 group-hover:to-gradient-develop-end/20 transition-colors">
              <LogIn size={18} className="text-link" />
            </div>
            <span className="text-xs font-medium text-ink">Mark Entry</span>
          </Link>
          <Link
            to="/students/add"
            className="group flex flex-col items-center gap-2 p-4 bg-canvas rounded-xl border border-hairline hover:shadow-card-hover hover:border-hairline-strong transition-all duration-200 active:scale-[0.97]"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet/10 to-highlight-pink/10 flex items-center justify-center group-hover:from-violet/20 group-hover:to-highlight-pink/20 transition-colors">
              <UserPlus size={18} className="text-violet" />
            </div>
            <span className="text-xs font-medium text-ink">Add Student</span>
          </Link>
          <Link
            to="/fees"
            className="group flex flex-col items-center gap-2 p-4 bg-canvas rounded-xl border border-hairline hover:shadow-card-hover hover:border-hairline-strong transition-all duration-200 active:scale-[0.97]"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gradient-ship-start/10 to-gradient-ship-end/10 flex items-center justify-center group-hover:from-gradient-ship-start/20 group-hover:to-gradient-ship-end/20 transition-colors">
              <CreditCard size={18} className="text-warning" />
            </div>
            <span className="text-xs font-medium text-ink">Collect Fee</span>
          </Link>
        </div>
      </div>

      {/* Live Students Inside */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-mute uppercase tracking-wider">Students Inside</h2>
          <Link to="/attendance" className="flex items-center gap-0.5 text-xs text-link font-medium hover:text-link-deep transition-colors">
            View all <ArrowRight size={12} />
          </Link>
        </div>
        {liveStudents.length === 0 ? (
          <div className="bg-canvas rounded-xl border border-hairline p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-canvas-soft-2 flex items-center justify-center mx-auto mb-3">
              <Users size={20} className="text-mute" />
            </div>
            <p className="text-sm text-mute">No students inside right now</p>
            <p className="text-xs text-mute/60 mt-0.5">They'll appear here once they scan in</p>
          </div>
        ) : (
          <div className="bg-canvas rounded-xl border border-hairline overflow-hidden shadow-card">
            {liveStudents.map((s, i) => (
              <Link
                key={s.id}
                to={`/students/${s.id}`}
                className={`flex items-center justify-between px-4 py-3.5 hover:bg-canvas-soft/50 transition-colors active:bg-canvas-soft ${
                  i !== liveStudents.length - 1 ? 'border-b border-hairline/60' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-canvas-soft-2 to-hairline flex items-center justify-center">
                    <span className="text-xs font-semibold text-body">
                      {s.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">{s.name}</p>
                    <p className="text-[11px] text-mute font-mono">{s.studentId}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-body font-medium">{formatTime(s.entryTime)}</p>
                  <p className="text-[11px] text-mute flex items-center justify-end gap-0.5">
                    <Clock size={9} />
                    {getElapsed(s.entryTime)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Alerts */}
      {stats.expiringCount > 0 && (
        <Link
          to="/fees"
          className="flex items-center gap-3 p-4 bg-warning-soft/50 rounded-xl border border-warning/20 hover:border-warning/40 transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={16} className="text-warning" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-ink">{stats.expiringCount} membership{stats.expiringCount > 1 ? 's' : ''} expiring</p>
            <p className="text-xs text-body">Tap to review and send reminders</p>
          </div>
          <ArrowRight size={16} className="text-mute" />
        </Link>
      )}
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
