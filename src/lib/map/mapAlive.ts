import type maplibregl from 'maplibre-gl'

/** False once the map is removed (HMR / remount) or mid style-swap — animation loops must stop touching it. */
export function mapAlive(m: maplibregl.Map | null | undefined): m is maplibregl.Map {
    const x = m as unknown as { style?: unknown; _removed?: boolean } | null | undefined
    return !!x && !!x.style && !x._removed
}
