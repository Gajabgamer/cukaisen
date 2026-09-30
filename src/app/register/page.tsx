'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { pickMentorLine } from '@/lib/lore/mentorCopy'
import AuthShell from '@/components/jjk/AuthShell'

function Spinner() {
    return (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    )
}

function GoogleIcon() {
    return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
    )
}

function Field({ label, onTogglePassword, showPassword, ...props }: { label: string; onTogglePassword?: () => void; showPassword?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                {label}
            </label>
            <div className="relative">
                <input
                    {...props}
                    className="w-full px-4 py-3.5 rounded-2xl outline-none text-sm transition-all"
                    style={{ border: '1px solid var(--cn-border)', background: 'var(--cn-surface-2)', color: 'var(--cn-text-1)' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--neon-red)'; e.currentTarget.style.boxShadow = '0 0 14px rgba(255,31,75,0.45)' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--cn-border)'; e.currentTarget.style.boxShadow = 'none' }}
                />
                {onTogglePassword && (
                    <button
                        type="button"
                        onClick={onTogglePassword}
                        className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                        style={{ color: 'var(--cn-text-3)' }}
                    >
                        {showPassword ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.478 0-8.268-2.943-9.542-7z" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.05 10.05 0 015.5-5.5m7.458-1.5A10.05 10.05 0 0112 5c4.478 0 8.268 2.943 9.542 7-.306.974-.75 1.88-1.3 2.675m-7.2-2.675v.01M3 3l18 18" />
                            </svg>
                        )}
                    </button>
                )}
            </div>
        </div>
    )
}

export default function RegisterPage() {
    const router = useRouter()

    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [error, setError] = useState('')
    const [info, setInfo] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    // ── Email/Password registration via Neon Auth ─────────────────────────────
    const handleRegister = async (e: FormEvent) => {
        e.preventDefault()
        setError('')
        setInfo('')
        if (password !== confirmPassword) { setError('Passwords do not match'); return }
        if (password.length < 8) { setError('Password must be at least 8 characters'); return }

        setIsLoading(true)
        try {
            const { error: authError } = await authClient.signUp.email({
                email,
                password,
                name,
                callbackURL: '/profile',
            })
            if (authError) throw new Error(authError.message || 'Registration failed')

            setInfo('Account created! Check your inbox for the verification email.')
            setTimeout(() => { router.push('/profile'); router.refresh() }, 1200)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed')
        } finally {
            setIsLoading(false)
        }
    }

    // ── Google via Neon Auth ──────────────────────────────────────────────────
    const handleGoogle = async () => {
        setError('')
        setInfo('')
        setIsLoading(true)
        try {
            await authClient.signIn.social({ provider: 'google', callbackURL: '/map' })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Google sign-in failed.')
            setIsLoading(false)
        }
    }

    return (
        <AuthShell
            character="/jjk/chars/yuji_large.webp"
            aura="aura-red"
            kanji="入学"
            title="ENROLL"
            subtitle="NEW FIRST-YEAR // GRADE 4 SORCERER"
            quote="Grade 4, huh? Don't worry. I lost my technique and I'm still standing. You'll manage a campus map."
        >

                    <p className="mb-5 text-sm italic" style={{ color: 'var(--cn-text-3)' }} data-testid="auth-register-mentor-line">
                        {pickMentorLine('authRegister')}
                    </p>

                    {error && (
                        <div className="mb-5 flex items-start gap-2.5 rounded-2xl p-4 text-sm" style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)', color: 'var(--cn-accent-sukuna)' }}>
                            <span className="mt-0.5">⚠️</span> {error}
                        </div>
                    )}
                    {info && (
                        <div className="mb-5 flex items-start gap-2.5 rounded-2xl p-4 text-sm" style={{ background: 'var(--cn-accent-purple-glow)', border: '1px solid var(--cn-accent-purple)', color: 'var(--cn-text-1)' }}>
                            <span className="mt-0.5">📧</span> {info}
                        </div>
                    )}

                    <h2 className="jjk-font mb-6 text-2xl tracking-widest text-white">CREATE SORCERER ID</h2>

                    <form onSubmit={handleRegister} className="space-y-4">
                        <Field label="Full Name" type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Your full name" autoComplete="name" />
                        <Field label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@campus.edu" autoComplete="email" />
                        <Field label="Password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min. 8 characters" autoComplete="new-password" showPassword={showPassword} onTogglePassword={() => setShowPassword(!showPassword)} />
                        <Field label="Confirm Password" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="••••••••" autoComplete="new-password" showPassword={showConfirmPassword} onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)} />

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="neon-btn neon-btn-red mt-2 w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isLoading ? <><Spinner /> Binding vow...</> : '⚔ Create Account'}
                        </button>
                    </form>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="px-3 text-white/30">Or sign up with</span>
                        </div>
                    </div>

                    <button
                        onClick={handleGoogle}
                        type="button"
                        disabled={isLoading}
                        className="w-full py-3.5 text-white/80 font-medium rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-3 text-sm disabled:opacity-50"
                    >
                        <GoogleIcon />
                        {isLoading ? <><Spinner /> Connecting...</> : 'Continue with Google'}
                    </button>

                    <div className="mt-6 text-center">
                        <p className="text-white/40 text-sm">
                            Already have an account?{' '}
                            <Link href="/login" className="font-semibold text-cyan-300 transition-colors hover:text-cyan-200">Sign in</Link>
                        </p>
                    </div>
        </AuthShell>
    )
}
