import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LogIn, LogOut, CheckCircle, BookOpen } from 'lucide-react'

export default function ScanEntry() {
  const { ownerId } = useParams()
  const [studentId, setStudentId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  async function handleAction(action) {
    setError('')
    setLoading(true)
    setResult(null)

    try {
      const { data: student, error: findError } = await supabase
        .from('students')
        .select('id, name, student_id')
        .eq('owner_id', ownerId)
        .eq('student_id', studentId.toUpperCase())
        .eq('is_active', true)
        .single()

      if (findError || !student) {
        setError('Student ID not found. Please check and try again.')
        setLoading(false)
        return
      }

      const today = new Date().toISOString().split('T')[0]
      const now = new Date().toISOString()

      if (action === 'entry') {
        const { data: existing } = await supabase
          .from('attendance_logs')
          .select('id')
          .eq('student_id', student.id)
          .eq('date', today)
          .is('exit_time', null)
          .limit(1)

        if (existing && existing.length > 0) {
          setError('You are already marked as inside. Please exit first.')
          setLoading(false)
          return
        }

        await supabase.from('attendance_logs').insert({
          student_id: student.id,
          owner_id: ownerId,
          date: today,
          entry_time: now,
          method: 'qr_shared',
        })

        setResult({
          type: 'entry',
          name: student.name,
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        })
      } else {
        const { data: openLog } = await supabase
          .from('attendance_logs')
          .select('id, entry_time')
          .eq('student_id', student.id)
          .eq('date', today)
          .is('exit_time', null)
          .order('entry_time', { ascending: false })
          .limit(1)
          .single()

        if (!openLog) {
          setError('No active entry found. Please mark entry first.')
          setLoading(false)
          return
        }

        const duration = Math.round((Date.now() - new Date(openLog.entry_time).getTime()) / (1000 * 60))
        const hours = Math.floor(duration / 60)
        const mins = duration % 60

        await supabase
          .from('attendance_logs')
          .update({ exit_time: now, duration_minutes: duration })
          .eq('id', openLog.id)

        setResult({
          type: 'exit',
          name: student.name,
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
          duration: `${hours}h ${mins}m`,
        })
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  // Result screen
  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5 bg-gradient-mesh">
        <div className="w-full max-w-sm text-center animate-scale-in">
          <div className={`w-20 h-20 mx-auto mb-5 rounded-3xl flex items-center justify-center ${
            result.type === 'entry'
              ? 'bg-gradient-to-br from-gradient-develop-start/20 to-gradient-develop-end/20'
              : 'bg-gradient-to-br from-violet/20 to-highlight-pink/20'
          }`}>
            <CheckCircle size={36} className={result.type === 'entry' ? 'text-link' : 'text-violet'} />
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.8px] text-ink">
            {result.type === 'entry' ? `Welcome, ${result.name}!` : `Goodbye, ${result.name}!`}
          </h1>
          <p className="text-sm text-body mt-2">
            {result.type === 'entry'
              ? `Entry logged at ${result.time}`
              : `You studied for ${result.duration} today. Great work!`
            }
          </p>
          <button
            onClick={() => { setResult(null); setStudentId('') }}
            className="mt-8 h-10 px-6 text-sm font-medium border border-hairline rounded-xl hover:bg-canvas-soft-2 hover:border-hairline-strong transition-all active:scale-[0.97]"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 bg-gradient-mesh">
      <div className="w-full max-w-sm animate-slide-up">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="relative w-14 h-14 mx-auto mb-4">
            <div className="absolute inset-0 bg-gradient-to-br from-gradient-develop-start to-gradient-preview-end rounded-2xl rotate-6 opacity-20" />
            <div className="relative w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-card">
              <BookOpen size={22} className="text-on-primary" />
            </div>
          </div>
          <h1 className="text-xl font-semibold tracking-[-0.6px] text-ink">Reading Area</h1>
          <p className="text-sm text-body mt-0.5">Log your entry or exit</p>
        </div>

        {/* Input Card */}
        <div className="bg-canvas rounded-2xl p-6 shadow-card border border-hairline/50">
          <label htmlFor="studentId" className="block text-sm font-medium text-ink mb-2">
            Your Student ID
          </label>
          <input
            id="studentId"
            type="text"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="RA-0042"
            className="w-full h-13 px-4 border border-hairline rounded-xl text-base bg-canvas text-ink placeholder:text-mute/40 focus:outline-none focus:ring-2 focus:ring-link/20 focus:border-link transition-all text-center font-mono font-medium tracking-widest uppercase"
            autoComplete="off"
          />

          {error && (
            <p className="text-error text-xs mt-3 text-center bg-error-soft/50 p-2 rounded-lg">
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 mt-5">
            <button
              onClick={() => handleAction('entry')}
              disabled={loading || !studentId}
              className="flex items-center justify-center gap-2 h-12 bg-primary text-on-primary text-sm font-medium rounded-xl hover:bg-ink/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
              ) : (
                <><LogIn size={16} /> Entry</>
              )}
            </button>
            <button
              onClick={() => handleAction('exit')}
              disabled={loading || !studentId}
              className="flex items-center justify-center gap-2 h-12 border-2 border-primary text-primary text-sm font-medium rounded-xl hover:bg-primary/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : (
                <><LogOut size={16} /> Exit</>
              )}
            </button>
          </div>
        </div>

        <p className="text-xs text-mute text-center mt-5 leading-relaxed max-w-[260px] mx-auto">
          Enter the Student ID from your printed card and tap Entry or Exit.
        </p>
      </div>
    </div>
  )
}
