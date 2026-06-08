import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { DEMO_MODE, mockStudents } from '../lib/mockData'
import { Search, Plus, User, ChevronRight } from 'lucide-react'

export default function Students() {
  const { ownerProfile } = useAuth()
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (ownerProfile) fetchStudents()
  }, [ownerProfile])

  async function fetchStudents() {
    if (DEMO_MODE) {
      setStudents(mockStudents)
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('students')
      .select('*')
      .eq('owner_id', ownerProfile.id)
      .eq('is_active', true)
      .order('name')

    setStudents(data || [])
    setLoading(false)
  }

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.student_id.toLowerCase().includes(search.toLowerCase())
  )

  // Generate consistent color for avatar
  function getAvatarGradient(name) {
    const gradients = [
      'from-gradient-develop-start/20 to-gradient-develop-end/20',
      'from-violet/20 to-highlight-pink/20',
      'from-gradient-ship-start/20 to-gradient-ship-end/20',
      'from-cyan/20 to-gradient-develop-start/20',
      'from-warning/20 to-gradient-ship-end/20',
    ]
    const index = name.charCodeAt(0) % gradients.length
    return gradients[index]
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.6px] text-ink">Students</h1>
          <p className="text-xs text-mute mt-0.5">{students.length} registered</p>
        </div>
        <Link
          to="/students/add"
          className="flex items-center gap-1.5 h-9 px-4 bg-primary text-on-primary text-xs font-medium rounded-xl hover:bg-ink/90 transition-all active:scale-[0.97]"
        >
          <Plus size={14} strokeWidth={2.5} />
          Add Student
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or ID..."
          className="w-full h-11 pl-10 pr-4 border border-hairline rounded-xl text-sm bg-canvas text-ink placeholder:text-mute/60 focus:outline-none focus:ring-2 focus:ring-link/20 focus:border-link shadow-card transition-all"
        />
      </div>

      {/* Student List */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-16 bg-canvas rounded-xl animate-shimmer" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14">
          <div className="w-16 h-16 rounded-2xl bg-canvas-soft-2 flex items-center justify-center mx-auto mb-3">
            <User size={28} className="text-mute" />
          </div>
          <p className="text-sm font-medium text-body">
            {search ? 'No students found' : 'No students yet'}
          </p>
          <p className="text-xs text-mute mt-1">
            {search ? 'Try a different search term' : 'Add your first student to get started'}
          </p>
          {!search && (
            <Link
              to="/students/add"
              className="inline-flex items-center gap-1 text-sm text-link font-medium hover:text-link-deep mt-3"
            >
              <Plus size={14} /> Add student
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-canvas rounded-xl border border-hairline overflow-hidden shadow-card">
          {filtered.map((student, i) => (
            <Link
              key={student.id}
              to={`/students/${student.id}`}
              className={`flex items-center gap-3.5 px-4 py-3.5 hover:bg-canvas-soft/50 transition-colors active:bg-canvas-soft ${
                i !== filtered.length - 1 ? 'border-b border-hairline/60' : ''
              }`}
            >
              {student.photo_url ? (
                <img
                  src={student.photo_url}
                  alt={student.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-canvas-soft-2"
                />
              ) : (
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient(student.name)} flex items-center justify-center`}>
                  <span className="text-xs font-semibold text-body">
                    {student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">{student.name}</p>
                <p className="text-[11px] text-mute font-mono mt-0.5">{student.student_id}</p>
              </div>
              <ChevronRight size={16} className="text-hairline-strong" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
