'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

const navItems = [
    { href: '/admin', label: 'Dashboard', icon: '📊', exact: true },
    { href: '/admin/approvals', label: 'Approvals', icon: '✅' },
    { href: '/admin/places', label: 'All Places', icon: '📍' },
    { href: '/admin/categories', label: 'Categories', icon: '🏷️' },
    { href: '/admin/users', label: 'Users', icon: '👥' },
    { href: '/admin/manage-parking', label: 'Parking', icon: '🅿️' },
    { href: '/admin/feedback', label: 'Feedback', icon: '💬' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter()

    const handleLogout = async () => {
        await authClient.signOut().catch(() => null)
        await fetch('/api/auth/logout', { method: 'POST' })
        router.push('/login')
    }

    return (
        <div data-intensity="low" className="min-h-screen" style={{ background: 'var(--cn-bg)' }}>
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 bottom-0 w-60 z-40 flex flex-col"
                style={{ background: 'var(--cn-nav-bg)', borderRight: '1px solid var(--cn-nav-border)' }}>
                {/* Logo */}
                <div className="px-5 py-5" style={{ borderBottom: '1px solid var(--cn-border-soft)' }}>
                    <Link href="/map" className="flex items-center gap-3 group">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg overflow-hidden bg-white"
                            style={{ boxShadow: 'var(--cn-shadow-glow-purple)' }}>
                            <img src="/logo.svg" alt="CUKAISEN Logo" className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <p className="font-bold text-sm leading-tight group-hover:text-[var(--cn-accent-purple)] transition-colors" style={{ color: 'var(--cn-text-1)' }}>CUKAISEN</p>
                            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--cn-accent-admin)' }}>Admin Panel</p>
                        </div>
                    </Link>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {navItems.map(item => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group"
                            style={{ color: 'var(--cn-text-2)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--cn-text-1)'; e.currentTarget.style.background = 'var(--cn-surface-2)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--cn-text-2)'; e.currentTarget.style.background = 'transparent' }}
                        >
                            <span className="text-base">{item.icon}</span>
                            {item.label}
                        </Link>
                    ))}
                </nav>

                {/* Footer */}
                <div className="px-4 py-4 space-y-2" style={{ borderTop: '1px solid var(--cn-border-soft)' }}>
                    <Link href="/map"
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all"
                        style={{ color: 'var(--cn-text-3)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--cn-text-1)'; e.currentTarget.style.background = 'var(--cn-surface-2)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--cn-text-3)'; e.currentTarget.style.background = 'transparent' }}>
                        <span>🗺️</span> View Map
                    </Link>
                    <button onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all text-left"
                        style={{ color: 'var(--cn-accent-sukuna)', opacity: 0.75 }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(220,38,38,0.08)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.75'; e.currentTarget.style.background = 'transparent' }}>
                        <span>🚪</span> Sign Out
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="pl-60 min-h-screen">
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    )
}
