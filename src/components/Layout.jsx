import { Outlet, NavLink } from 'react-router-dom'
import { Home, Users, ClipboardList, CreditCard, Settings } from 'lucide-react'

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/attendance', icon: ClipboardList, label: 'Attend' },
  { to: '/students', icon: Users, label: 'Students' },
  { to: '/fees', icon: CreditCard, label: 'Fees' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Layout() {
  return (
    <div className="min-h-screen bg-canvas-soft">
      {/* Main content area with bottom padding for nav */}
      <main className="w-full max-w-[480px] mx-auto px-5 pt-12 sm:pt-6 pb-24">
        <Outlet />
      </main>

      {/* Bottom Navigation - glass morphism style */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl bg-canvas/80 border-t border-hairline/60"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="w-full max-w-[480px] mx-auto flex justify-around items-center h-16 px-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center gap-0.5 w-14 h-12 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'text-primary'
                    : 'text-mute hover:text-body active:scale-95'
                }`
              }
              aria-label={label}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-5 h-[3px] bg-primary rounded-full" />
                  )}
                  <Icon size={20} strokeWidth={isActive ? 2 : 1.6} />
                  <span className={`text-[10px] leading-none ${isActive ? 'font-semibold' : 'font-medium'}`}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
