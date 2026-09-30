/**
 * Cursed Territory name mapping.
 *
 * Maps a literal `PlaceCategory.categoryName` string to its in-fiction
 * "Cursed_Territory_Name" flavor label, per design.md §2.2.
 *
 * Matching is case-insensitive substring matching against the keys below.
 * The first matching key (in declaration order) wins. Any input that does
 * not match any key falls back to "Uncharted Territory".
 */

const FALLBACK_TERRITORY_NAME = 'Uncharted Territory'

/**
 * Ordered list of [substring-key, flavor-name] pairs. Keys are matched
 * case-insensitively as substrings of the input category name.
 *
 * Kept as an ordered array (rather than a plain object) since several
 * literal categories map to the same flavor name (e.g. "Cafeteria",
 * "Canteen", "Food Court" all map to "Restoration Shrine") — an object
 * would require duplicate-key gymnastics or an inverted structure that's
 * harder to read against the design table.
 */
export const CATEGORY_MAP: ReadonlyArray<readonly [string, string]> = [
  ['cafeteria', 'Restoration Shrine'],
  ['canteen', 'Restoration Shrine'],
  ['food court', 'Restoration Shrine'],

  ['library', 'The Archive of Bound Scrolls'],

  ['parking lot', 'Barrier Gate'],
  ['parking', 'Barrier Gate'],

  ['faculty office', 'Special Grade Chambers'],
  ['staff office', 'Special Grade Chambers'],

  ['classroom', 'Training Hall'],
  ['lecture hall', 'Training Hall'],

  ['admin block', 'The Jujutsu High Council Office'],
  ['administration', 'The Jujutsu High Council Office'],

  ['sports complex', 'Domain Sparring Grounds'],
  ['gym', 'Domain Sparring Grounds'],

  ['medical center', 'Healing Ward'],
  ['health center', 'Healing Ward'],
  ['clinic', 'Healing Ward'],

  ['hostel', 'Sorcerer Dormitories'],
  ['dormitory', 'Sorcerer Dormitories'],

  ['auditorium', 'Assembly Hall of Oaths'],
  ['seminar hall', 'Assembly Hall of Oaths'],

  ['laboratory', 'Cursed Tools Workshop'],
  ['lab', 'Cursed Tools Workshop'],

  ['restroom', 'Purification Chamber'],
  ['washroom', 'Purification Chamber'],

  ['atm', 'Exchange Annex'],
  ['bank', 'Exchange Annex'],

  ['store', "Sorcerer's Supply Post"],
  ['stationery', "Sorcerer's Supply Post"],
  ['shop', "Sorcerer's Supply Post"],

  ['garden', 'The Untainted Court'],
  ['courtyard', 'The Untainted Court'],
  ['open ground', 'The Untainted Court'],
]

/**
 * Pure, total function: maps a place category name to its Cursed_Territory_Name.
 *
 * - Case-insensitive substring match against `CATEGORY_MAP` keys.
 * - Falls back to "Uncharted Territory" for any unmatched, empty, or
 *   otherwise unusual input.
 * - Never throws — guaranteed to return a non-empty string for any input.
 */
export function getCursedTerritoryName(categoryName: string): string {
  if (typeof categoryName !== 'string' || categoryName.length === 0) {
    return FALLBACK_TERRITORY_NAME
  }

  const normalized = categoryName.toLowerCase()

  for (const [key, flavorName] of CATEGORY_MAP) {
    if (normalized.includes(key)) {
      return flavorName
    }
  }

  return FALLBACK_TERRITORY_NAME
}
