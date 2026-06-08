import { supabase } from './supabase'

/**
 * Auto-closes any open attendance sessions from previous days.
 * Called when the owner opens the app (Dashboard mount).
 * 
 * This is a client-side fallback for when pg_cron is not available.
 * Sessions are closed with exit_time = 11:59 PM of their entry date
 * and marked as 'auto_closed' so owners can identify and edit them.
 */
export async function autoCloseOpenSessions(ownerId) {
  const today = new Date().toISOString().split('T')[0]

  // Find all open sessions from days before today
  const { data: openSessions, error } = await supabase
    .from('attendance_logs')
    .select('id, entry_time, date')
    .eq('owner_id', ownerId)
    .is('exit_time', null)
    .lt('date', today)

  if (error || !openSessions || openSessions.length === 0) return 0

  // Close each session
  let closedCount = 0
  for (const session of openSessions) {
    const entryDate = new Date(session.entry_time)
    // Set exit to 11:59 PM of the same day
    const exitTime = new Date(entryDate)
    exitTime.setHours(23, 59, 0, 0)

    const durationMinutes = Math.round((exitTime.getTime() - entryDate.getTime()) / (1000 * 60))

    const { error: updateError } = await supabase
      .from('attendance_logs')
      .update({
        exit_time: exitTime.toISOString(),
        duration_minutes: durationMinutes,
        method: 'auto_closed',
      })
      .eq('id', session.id)

    if (!updateError) closedCount++
  }

  return closedCount
}
