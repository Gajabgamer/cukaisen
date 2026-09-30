'use client'

import { useId } from 'react'

/**
 * Back-view Grade 4 sorcerer: plain Jujutsu High uniform, messy hair, a
 * worn wooden staff and one paper talisman. Legs fade into a faint ghost
 * tail. Deliberately humble — no hat, no gold, just a flicker at the tip.
 */

const TAIL = {
    mid: 'M17 60 Q30 66 43 60 C42 74 38 86 32 98 C30 102 30 105 31 108 C26 98 22 86 20 76 C18 70 17 65 17 60 Z',
    right: 'M17 60 Q30 66 43 60 C43 74 40 87 36 98 C35 102 35 105 37 108 C30 99 24 87 21 76 C19 70 17 65 17 60 Z',
    left: 'M17 60 Q30 66 43 60 C41 74 36 85 28 97 C25 101 24 104 25 107 C22 97 20 85 19 75 C18 69 17 65 17 60 Z',
}

export default function WizardSprite({ className = '' }: { className?: string }) {
    const uid = useId().replace(/:/g, '')
    const tail = `tail-${uid}`

    return (
        <svg viewBox="0 0 60 110" className={className} role="img" aria-label="Grade 4 sorcerer (you)">
            <defs>
                <linearGradient id={tail} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#1c1f2e" />
                    <stop offset="0.45" stopColor="#2c3350" stopOpacity="0.8" />
                    <stop offset="1" stopColor="#9fe9ff" stopOpacity="0" />
                </linearGradient>
            </defs>

            {/* Faint ghost tail instead of legs */}
            <path d={TAIL.mid} fill={`url(#${tail})`}>
                <animate attributeName="d" dur="2.6s" repeatCount="indefinite"
                    values={`${TAIL.mid};${TAIL.right};${TAIL.mid};${TAIL.left};${TAIL.mid}`}
                    calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1" />
            </path>
            <path d="M24 72 Q21 84 25 94" fill="none" stroke="#9fe9ff" strokeWidth="0.9" strokeLinecap="round" opacity="0.35">
                <animate attributeName="d" dur="2s" repeatCount="indefinite" values="M24 72 Q21 84 25 94;M24 72 Q28 84 23 94;M24 72 Q21 84 25 94" />
            </path>

            {/* Worn wooden staff */}
            <line x1="44" y1="9" x2="48" y2="104" stroke="#6b4a2e" strokeWidth="2.4" strokeLinecap="round" />
            <line x1="44" y1="9" x2="48" y2="104" stroke="#8c6a45" strokeWidth="0.8" strokeLinecap="round" />
            <path d="M43.6 20 l2 0.6 M43.9 26 l2 0.6" stroke="#4a3320" strokeWidth="0.8" />
            {/* Small flicker of cursed energy at the tip */}
            <circle cx="44" cy="8" r="1.8" fill="#bff6ff" opacity="0.6">
                <animate attributeName="opacity" values="0.25;0.7;0.25" dur="1.8s" repeatCount="indefinite" />
            </circle>

            {/* Left arm hanging */}
            <path d="M20 28 Q14 40 15 56 L20 56 Q20 42 23 32 Z" fill="#191c2a" stroke="#3b4460" strokeWidth="0.6" />
            {/* Uniform jacket, back view */}
            <path d="M20 26 Q30 22 40 26 L43 60 Q30 65 17 60 Z" fill="#1c1f2e" stroke="#3b4460" strokeWidth="0.7" />
            <path d="M30 26 L30 62" stroke="#12141f" strokeWidth="0.8" />
            {/* Paper talisman tucked at the waist */}
            <rect x="22" y="52" width="4.5" height="9" fill="#ece0c2" transform="rotate(-8 24 56)" />
            <path d="M23.4 54.5 l1.8 0 M23.2 57 l1.8 0" stroke="#b3322a" strokeWidth="0.7" transform="rotate(-8 24 56)" />
            {/* Right arm gripping the staff */}
            <path d="M40 28 Q46 38 46 50 L41 51 Q41 40 37 32 Z" fill="#191c2a" stroke="#3b4460" strokeWidth="0.6" />
            <circle cx="44.6" cy="50.5" r="2.2" fill="#d8b894" />

            {/* High collar + messy hair */}
            <path d="M22 22 Q30 26 38 22 L39 28 Q30 31 21 28 Z" fill="#23273a" />
            <circle cx="30" cy="14" r="8" fill="#16131d" />
            <path d="M22 13 L19 9 L24 10 L23 5 L28 8 L30 3 L32 8 L37 5 L36 10 L41 9 L38 14 Z" fill="#16131d" />
        </svg>
    )
}
