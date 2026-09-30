'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'

/* ───────────────────────── DATA ───────────────────────── */

const TICKER = ['呪術廻戦', 'THE VEIL', '帳', 'DISCOVER', 'NAVIGATE', 'ARRIVE', '領域展開', 'CURSED CAMPUS', '術式']

const STAGES = [
  {
    step: '01',
    kanji: '見',
    title: 'DISCOVER',
    tech: 'Cursed Sight',
    char: '/jjk/chars/gojo_large.webp',
    aura: 'aura-blue',
    accent: 'neon-cyan',
    border: 'neon-border',
    copy: 'The Six Eyes see through the Veil. Browse every block, lab, canteen and office hidden in the mist.',
  },
  {
    step: '02',
    kanji: '動',
    title: 'NAVIGATE',
    tech: 'Cursed Movement',
    char: '/jjk/chars/yuji_large.webp',
    aura: 'aura-red',
    accent: 'neon-red',
    border: 'neon-border-red',
    copy: 'Divergent Fist speed. Get a live route across campus, block to block, floor to floor.',
  },
  {
    step: '03',
    kanji: '着',
    title: 'ARRIVE',
    tech: 'Territory Reclaimed',
    char: '/jjk/chars/megumi_large.webp',
    aura: 'aura-purple',
    accent: 'neon-purple',
    border: 'neon-border',
    copy: 'Ten Shadows mark the spot. Photos, hours and reviews of the place you just reclaimed.',
  },
] as const

const ROSTER = [
  { id: 'gojo', name: 'GOJO', role: 'Special Grade Chambers', sub: 'Blocks & Offices', img: '/jjk/chars/gojo_large.webp', aura: 'aura-blue' },
  { id: 'sukuna', name: 'SUKUNA', role: 'Malevolent Canteen', sub: 'Food Courts & Cafes', img: '/jjk/chars/sukuna_large.webp', aura: 'aura-red' },
  { id: 'maki', name: 'MAKI', role: 'Sparring Grounds', sub: 'Sports & Gym', img: '/jjk/chars/maki_large.webp', aura: 'aura-purple' },
  { id: 'nobara', name: 'NOBARA', role: 'Supply Post', sub: 'Shops, Stationery & ATMs', img: '/jjk/chars/nobara_large.webp', aura: 'aura-red' },
  { id: 'toge', name: 'TOGE', role: 'Archive of Bound Scrolls', sub: 'Library', img: '/jjk/chars/toge_large.webp', aura: 'aura-blue' },
  { id: 'panda', name: 'PANDA', role: 'Barrier Gate', sub: 'Gates, Parking & Hostels', img: '/jjk/chars/panda_large.webp', aura: 'aura-purple' },
  { id: 'yuta', name: 'YUTA', role: 'Healing Ward', sub: 'Medical & Pharmacy', img: '/jjk/chars/yuta_large.png', aura: 'aura-blue' },
  { id: 'toji', name: 'TOJI', role: 'Training Hall', sub: 'Classrooms', img: '/jjk/chars/toji_large.webp', aura: 'aura-red' },
]

const DOMAINS = [
  { id: 'void', name: 'INFINITE VOID', kanji: '無量空処', user: 'Satoru Gojo', video: '/jjk/video/infinite-void.mp4', glow: 'neon-cyan', ring: 'neon-border', feature: '3D campus fly-through' },
  { id: 'shrine', name: 'MALEVOLENT SHRINE', kanji: '伏魔御廚子', user: 'Ryomen Sukuna', video: '/jjk/video/malevolent-shrine.mp4', glow: 'neon-red', ring: 'neon-border-red', feature: 'Live parking radar' },
  { id: 'mahoraga', name: 'MAHORAGA', kanji: '魔虚羅', user: 'Megumi Fushiguro', video: '/jjk/video/mahoraga.mp4', glow: 'neon-purple', ring: 'neon-border', feature: 'Live location sharing' },
]

const FIELD_NOTES = [
  { n: '01', found: 'First-years circling Block B1 looking for the seminar hall', built: 'room-level search with floor numbers' },
  { n: '02', found: 'No sign pointing to the medical center from the hostels', built: 'turn-by-turn campus routes' },
  { n: '03', found: 'Parking lots full by 9:15 with no way to know in advance', built: 'real-time parking availability' },
]

/* ───────────────────────── PAGE ───────────────────────── */

export default function Home() {
  const [domain, setDomain] = useState<(typeof DOMAINS)[number] | null>(null)
  const [musicOn, setMusicOn] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroTextY = useTransform(scrollYProgress, [0, 1], [0, 200])
  const gojoY = useTransform(scrollYProgress, [0, 1], [0, -120])
  const sukunaY = useTransform(scrollYProgress, [0, 1], [0, -60])

  const toggleMusic = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/jjk/audio/specialz.mp3')
      audioRef.current.loop = true
      audioRef.current.volume = 0.35
    }
    if (musicOn) audioRef.current.pause()
    else audioRef.current.play().catch(() => {})
    setMusicOn(!musicOn)
  }

  useEffect(() => () => audioRef.current?.pause(), [])

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: 'var(--ink)', color: '#fff' }}>
      {/* ── TOP NAV ── */}
      <nav className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-5 py-4 md:px-10"
        style={{ background: 'linear-gradient(to bottom, rgba(5,3,10,0.9), transparent)' }}>
        <Link href="/" className="flex items-center gap-3">
          <span className="jjk-font neon-red text-3xl">呪</span>
          <span className="jjk-font text-xl tracking-widest">THE VEIL</span>
        </Link>
        <div className="hidden items-center gap-8 text-xs font-bold tracking-[0.25em] md:flex">
          <a href="#mission" className="hover:text-cyan-300">MISSION</a>
          <a href="#stages" className="hover:text-cyan-300">TECHNIQUES</a>
          <a href="#roster" className="hover:text-cyan-300">SORCERERS</a>
          <a href="#domains" className="hover:text-cyan-300">DOMAINS</a>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleMusic} aria-label={musicOn ? 'Mute music' : 'Play music'}
            className="neon-border flex h-10 w-10 items-center justify-center rounded-full text-sm">
            {musicOn ? '♪' : '♫'}
          </button>
          <Link href="/login" className="neon-btn hidden sm:inline-flex !px-5 !py-2.5">Enter</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section ref={heroRef} className="scanlines relative flex h-screen min-h-[640px] items-center overflow-hidden">
        <video className="absolute inset-0 h-full w-full object-cover opacity-50"
          src="/jjk/video/hero-bg.mp4" autoPlay muted loop playsInline poster="/jjk/fx/hero3.jpg" />
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 70% 40%, rgba(0,180,255,0.25), transparent 55%), radial-gradient(ellipse at 15% 70%, rgba(255,31,75,0.22), transparent 50%), linear-gradient(to bottom, rgba(5,3,10,0.2), var(--ink) 95%)',
        }} />

        {/* vertical kanji */}
        <div className="kanji-vertical jjk-font neon-red neon-flicker pointer-events-none absolute left-4 top-24 hidden text-5xl opacity-80 md:block">
          呪術廻戦
        </div>

        {/* Sukuna left (desktop) */}
        <motion.img style={{ y: sukunaY }} src="/jjk/chars/sukuna_large.webp" alt=""
          className="aura-red pointer-events-none absolute -left-24 bottom-0 hidden h-[80vh] object-contain opacity-70 lg:block" />
        {/* Gojo right */}
        <motion.img style={{ y: gojoY }} src="/jjk/chars/gojo_large.webp" alt="Satoru Gojo"
          initial={{ opacity: 0, x: 80 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1.1, delay: 0.3 }}
          className="aura-blue float-slow pointer-events-none absolute -right-10 bottom-0 h-[62vh] object-contain md:right-0 md:h-[92vh]" />

        <motion.div style={{ y: heroTextY }} className="relative z-10 mx-auto w-full max-w-7xl px-6 md:px-16">
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="mb-4 text-xs font-bold tracking-[0.4em] text-cyan-300">
            MISSION #01 // GRADE 1 // CHANDIGARH UNIVERSITY
          </motion.p>
          <motion.h1 initial={{ opacity: 0, scale: 1.2, filter: 'blur(12px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.9, delay: 0.35 }}
            className="jjk-font neon-cyan text-[18vw] leading-[0.85] md:text-[11rem]">
            THE<br />VEIL
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
            className="jjk-font neon-red mt-2 text-3xl md:text-5xl">帳が下りる</motion.p>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }}
            className="mt-6 max-w-lg text-sm leading-relaxed text-white/75 md:text-base">
            A cursed Veil has fallen over the campus. Blocks vanished from the map, routes twisted,
            first-years lost in the mist. Become a sorcerer. <span className="text-cyan-300">Discover</span>,
            {' '}<span className="text-red-400">Navigate</span>, <span className="text-purple-300">Arrive</span>.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3 }}
            className="mt-9 flex flex-wrap gap-4">
            <Link href="/map" className="neon-btn">⚡ Lift the Veil</Link>
            <a href="#domains" className="neon-btn neon-btn-red">領域展開 Domain Expansion</a>
          </motion.div>
        </motion.div>

        <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-center text-[10px] tracking-[0.4em] text-white/50">
          SCROLL<div className="mx-auto mt-2 h-10 w-px animate-pulse bg-cyan-300" />
        </div>
      </section>

      {/* ── TICKER ── */}
      <div className="relative z-10 -mt-2 -rotate-1 overflow-hidden border-y-2 border-cyan-400/70 bg-black py-3"
        style={{ boxShadow: '0 0 30px rgba(0,240,255,0.35)' }}>
        <div className="marquee jjk-font text-2xl">
          {[...TICKER, ...TICKER, ...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className={`mx-6 ${i % 2 ? 'neon-red' : 'neon-cyan'}`}>{t} ✦</span>
          ))}
        </div>
      </div>

      {/* ── MISSION / STORY ── */}
      <section id="mission" className="relative overflow-hidden py-28">
        <img src="/jjk/fx/header_bg.webp" alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--ink)] via-transparent to-[var(--ink)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2">
          <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
            <p className="mb-3 text-xs font-bold tracking-[0.4em] text-red-400">// CLASSIFIED DOSSIER</p>
            <h2 className="jjk-font text-5xl leading-none md:text-7xl">
              A CURSE ON<br /><span className="neon-red">THE CAMPUS</span>
            </h2>
            <div className="mt-8 space-y-5 text-white/75">
              <p>At dawn a black barrier dropped over Chandigarh University. Inside the Veil, signboards went blank and Google Maps stopped at the gate.</p>
              <p>You are a <span className="text-cyan-300 font-semibold">Grade 4 sorcerer</span> enrolled at Jujutsu High. Your sensei lost his technique at Shibuya, but not his eyes. He&apos;ll guide you. The legwork is yours.</p>
              <p className="border-l-2 border-red-500 pl-4 italic text-white/90">
                &ldquo;Relax, first-year. It&apos;s just a curse. Map it block by block and it breaks.&rdquo;
                <span className="mt-1 block text-xs not-italic tracking-widest text-red-400">— YOUR SENSEI</span>
              </p>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
            className="relative">
            <div className="neon-border-red relative aspect-[4/5] overflow-hidden" style={{ clipPath: 'polygon(8% 0, 100% 0, 92% 100%, 0 100%)' }}>
              <img src="/jjk/fx/character_bg.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
              <img src="/jjk/chars/sukuna_large.webp" alt="Ryomen Sukuna" className="aura-red absolute bottom-0 left-1/2 h-[95%] -translate-x-1/2 object-contain" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <p className="jjk-font neon-red absolute bottom-6 left-8 text-4xl">両面宿儺</p>
            </div>
            <img src="/jjk/fx/blueFireball.gif" alt="" className="pointer-events-none absolute -right-8 -top-10 w-32 opacity-90 mix-blend-screen" />
          </motion.div>
        </div>
      </section>

      <div className="slash-divider" />

      {/* ── STAGES: DISCOVER / NAVIGATE / ARRIVE ── */}
      <section id="stages" className="relative py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <p className="text-xs font-bold tracking-[0.4em] text-cyan-300">// THREE CURSED TECHNIQUES</p>
            <h2 className="jjk-font mt-3 text-5xl md:text-7xl">
              <span className="neon-cyan">DISCOVER</span> <span className="text-white/40">→</span>{' '}
              <span className="neon-red">NAVIGATE</span> <span className="text-white/40">→</span>{' '}
              <span className="neon-purple">ARRIVE</span>
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {STAGES.map((s, i) => (
              <motion.div key={s.title}
                initial={{ opacity: 0, y: 60 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className={`char-card ${s.border} relative h-[520px] overflow-hidden bg-black/60`}>
                <img src="/jjk/fx/blue_bg.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
                <span className="jjk-font pointer-events-none absolute -right-4 -top-6 text-[12rem] leading-none text-white/5">{s.kanji}</span>
                <img src={s.char} alt={s.tech} className={`char-img ${s.aura} absolute bottom-24 left-1/2 h-[70%] -translate-x-1/2 object-contain`} />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/90 to-transparent p-6 pt-20">
                  <p className="text-xs font-bold tracking-[0.3em] text-white/50">TECHNIQUE {s.step}</p>
                  <h3 className={`jjk-font ${s.accent} text-4xl`}>{s.title}</h3>
                  <p className="text-xs font-bold tracking-widest text-white/70">{s.tech.toUpperCase()}</p>
                  <p className="mt-3 text-sm text-white/70">{s.copy}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROSTER ── */}
      <section id="roster" className="relative overflow-hidden py-24">
        <img src="/jjk/fx/bg_sub.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-15" />
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="mb-12 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold tracking-[0.4em] text-red-400">// SORCERER ROSTER</p>
              <h2 className="jjk-font mt-3 text-5xl md:text-7xl">EVERY PLACE HAS<br /><span className="neon-cyan">A GUARDIAN</span></h2>
            </div>
            <p className="max-w-sm text-sm text-white/60">Each campus territory is watched by a sorcerer. Pick your guide. They&apos;ll talk you through every route in their own voice, and tell you what you&apos;ll pass on the way.</p>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {ROSTER.map((c, i) => (
              <motion.div key={c.name}
                initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.5, delay: (i % 4) * 0.08 }}>
                <Link href={`/map?guide=${c.id}`} aria-label={`Choose ${c.name} as your guide`}
                  onClick={() => { try { localStorage.setItem('veil-guide', c.id) } catch { /* private mode */ } }}
                  className="char-card group relative block aspect-[3/4] overflow-hidden border border-white/10 bg-gradient-to-b from-[#120a24] to-black">
                  <img src={c.img} alt={c.name} className={`char-img ${c.aura} absolute bottom-0 left-1/2 h-[92%] -translate-x-1/2 object-contain`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p className="jjk-font text-3xl group-hover:text-cyan-300">{c.name}</p>
                    <p className="text-xs font-bold tracking-wider text-red-400">{c.role}</p>
                    <p className="text-[11px] text-white/50">{c.sub}</p>
                    <p className="mt-2 inline-block border border-cyan-400/60 px-2 py-0.5 text-[10px] font-black tracking-widest text-cyan-300 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">CHOOSE AS GUIDE ⚡</p>
                  </div>
                  <div className="absolute inset-0 border-2 border-transparent transition-colors group-hover:border-cyan-400/70" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <div className="slash-divider" />

      {/* ── DOMAIN EXPANSION ── */}
      <section id="domains" className="relative py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 text-center">
            <p className="jjk-font neon-red text-4xl md:text-5xl">領域展開</p>
            <h2 className="jjk-font neon-purple mt-2 text-6xl md:text-8xl">DOMAIN EXPANSION</h2>
            <p className="mx-auto mt-4 max-w-md text-sm text-white/60">Every power-up in the app is a domain. Hover to sense it. Click to expand.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {DOMAINS.map((d) => (
              <button key={d.id} onClick={() => setDomain(d)}
                className={`domain-card ${d.ring} group relative aspect-video overflow-hidden text-left`}>
                <video src={d.video} muted loop playsInline preload="metadata"
                  onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                  onMouseLeave={(e) => e.currentTarget.pause()}
                  className="absolute inset-0 h-full w-full object-cover opacity-60 transition-opacity" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <p className="jjk-font text-lg text-white/60">{d.kanji}</p>
                  <p className={`jjk-font ${d.glow} text-3xl`}>{d.name}</p>
                  <p className="mt-1 text-xs tracking-widest text-white/60">{d.user.toUpperCase()} → {d.feature}</p>
                </div>
                <span className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-black/50 text-sm">▶</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── FIELD NOTES (Cursed Artifact Mandate) ── */}
      <section className="relative py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-xs font-bold tracking-[0.4em] text-cyan-300">// CURSED ARTIFACTS — FIELD NOTES</p>
          <h2 className="jjk-font mt-3 text-5xl md:text-6xl">WE WALKED THE <span className="neon-red">CAMPUS</span></h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {FIELD_NOTES.map((f) => (
              <div key={f.n} className="neon-border relative overflow-hidden bg-black/60">
                {/* Drop real campus photos at /public/campus/artifact-01.jpg etc. */}
                <div className="relative aspect-[4/3] bg-gradient-to-br from-[#10183a] to-[#2a0710]">
                  <img src={`/campus/artifact-${f.n}.jpg`} alt={`Campus field photo ${f.n}`}
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                    className="absolute inset-0 h-full w-full object-cover" />
                  <span className="jjk-font absolute left-4 top-3 text-5xl text-white/20">{f.n}</span>
                </div>
                <div className="p-5 text-sm">
                  <p className="text-white/50">WE DISCOVERED</p>
                  <p className="text-white">{f.found}</p>
                  <p className="mt-3 text-red-400">→ THEREFORE WE BUILT</p>
                  <p className="font-semibold text-cyan-300">{f.built}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="relative overflow-hidden py-32">
        <img src="/jjk/fx/footer_bg.webp" alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)] via-black/40 to-[var(--ink)]" />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-6 text-center">
          <div className="relative mb-8 h-24 w-24">
            <span className="pulse-ring absolute inset-0 rounded-full border-2 border-cyan-300" />
            <img src="/jjk/fx/eye.png" alt="" className="relative h-full w-full object-contain" />
          </div>
          <h2 className="jjk-font neon-cyan text-6xl md:text-8xl">LIFT THE VEIL</h2>
          <p className="mt-4 max-w-md text-white/70">The campus won&apos;t map itself, sorcerer. Step through the barrier.</p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href="/map" className="neon-btn">⚡ Open Campus Map</Link>
            <Link href="/register" className="neon-btn neon-btn-red">Enroll at Jujutsu High</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-[11px] tracking-widest text-white/40">
        THE VEIL // NEXASOUL BUILDSPRINT 2026 // MISSION 01 · Fan-made tribute, non-commercial. Jujutsu Kaisen © Gege Akutami / Shueisha / MAPPA.
      </footer>

      {/* ── DOMAIN EXPANSION OVERLAY ── */}
      <AnimatePresence>
        {domain && (
          <motion.div key={domain.id} onClick={() => setDomain(null)}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black"
            initial={{ opacity: 0 }} animate={{ opacity: 1, x: [0, -14, 14, -10, 10, -6, 6, 0] }}
            exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
            <video src={domain.video} autoPlay playsInline onEnded={() => setDomain(null)}
              className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/30" />
            <motion.div className="relative z-10 text-center" initial={{ scale: 2.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5, ease: 'easeOut' }}>
              <p className="jjk-font neon-red text-4xl md:text-6xl">領域展開</p>
              <p className="jjk-font text-5xl text-white md:text-8xl">{domain.kanji}</p>
              <p className={`jjk-font ${domain.glow} mt-2 text-3xl md:text-5xl`}>{domain.name}</p>
            </motion.div>
            <p className="absolute bottom-6 text-xs tracking-[0.4em] text-white/60">CLICK ANYWHERE TO RELEASE</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
