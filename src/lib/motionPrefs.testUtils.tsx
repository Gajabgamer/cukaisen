import { MotionPrefsProvider, useMotionPrefs } from './motionPrefs'

function Reporter() {
  const prefs = useMotionPrefs()
  return <div data-testid="motion-prefs">{JSON.stringify(prefs)}</div>
}

/** Test-only harness: real provider + hook, rendered so tests can assert resolved values. */
export function MotionPrefsContextForTests() {
  return (
    <MotionPrefsProvider>
      <Reporter />
    </MotionPrefsProvider>
  )
}
