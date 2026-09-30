import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { getCursedTerritoryName } from './cursedTerritory'

describe('getCursedTerritoryName', () => {
  // 9.3 Unit tests — one assertion per literal category example from the §2.2 table
  it.each([
    ['Cafeteria', 'Restoration Shrine'],
    ['Canteen', 'Restoration Shrine'],
    ['Food Court', 'Restoration Shrine'],
    ['Library', 'The Archive of Bound Scrolls'],
    ['Parking', 'Barrier Gate'],
    ['Parking Lot', 'Barrier Gate'],
    ['Faculty Office', 'Special Grade Chambers'],
    ['Staff Office', 'Special Grade Chambers'],
    ['Classroom', 'Training Hall'],
    ['Lecture Hall', 'Training Hall'],
    ['Admin Block', 'The Jujutsu High Council Office'],
    ['Administration', 'The Jujutsu High Council Office'],
    ['Sports Complex', 'Domain Sparring Grounds'],
    ['Gym', 'Domain Sparring Grounds'],
    ['Medical Center', 'Healing Ward'],
    ['Health Center', 'Healing Ward'],
    ['Clinic', 'Healing Ward'],
    ['Hostel', 'Sorcerer Dormitories'],
    ['Dormitory', 'Sorcerer Dormitories'],
    ['Auditorium', 'Assembly Hall of Oaths'],
    ['Seminar Hall', 'Assembly Hall of Oaths'],
    ['Laboratory', 'Cursed Tools Workshop'],
    ['Lab', 'Cursed Tools Workshop'],
    ['Restroom', 'Purification Chamber'],
    ['Washroom', 'Purification Chamber'],
    ['ATM', 'Exchange Annex'],
    ['Bank', 'Exchange Annex'],
    ['Store', "Sorcerer's Supply Post"],
    ['Stationery', "Sorcerer's Supply Post"],
    ['Shop', "Sorcerer's Supply Post"],
    ['Garden', 'The Untainted Court'],
    ['Courtyard', 'The Untainted Court'],
    ['Open Ground', 'The Untainted Court'],
  ])('maps literal category "%s" to "%s"', (category, expected) => {
    expect(getCursedTerritoryName(category)).toBe(expected)
  })

  it('maps an unmatched category string to "Uncharted Territory"', () => {
    expect(getCursedTerritoryName('Rooftop Observatory')).toBe('Uncharted Territory')
  })

  it('is case-insensitive', () => {
    expect(getCursedTerritoryName('CAFETERIA')).toBe('Restoration Shrine')
    expect(getCursedTerritoryName('library')).toBe('The Archive of Bound Scrolls')
  })

  it('never throws and returns a non-empty string for empty input', () => {
    expect(getCursedTerritoryName('')).toBe('Uncharted Territory')
  })
})

describe('getCursedTerritoryName property tests', () => {
  const knownCategories = [
    'Cafeteria',
    'Canteen',
    'Food Court',
    'Library',
    'Parking',
    'Parking Lot',
    'Faculty Office',
    'Staff Office',
    'Classroom',
    'Lecture Hall',
    'Admin Block',
    'Administration',
    'Sports Complex',
    'Gym',
    'Medical Center',
    'Health Center',
    'Clinic',
    'Hostel',
    'Dormitory',
    'Auditorium',
    'Seminar Hall',
    'Laboratory',
    'Lab',
    'Restroom',
    'Washroom',
    'ATM',
    'Bank',
    'Store',
    'Stationery',
    'Shop',
    'Garden',
    'Courtyard',
    'Open Ground',
  ]

  // 9.1 Property test: Cursed Territory mapping totality and stability
  // Property 1: Cursed Territory mapping totality and stability
  // Validates: Requirements 3.5, 3.6
  it('property: always returns a non-empty string and is stable across repeated calls', () => {
    const knownCategoryArb = fc.constantFrom(...knownCategories)
    const whitespaceArb = fc.constantFrom('', ' ', '  ', '\t', '\n')
    const casingArb = fc.constantFrom<'lower' | 'upper' | 'asis'>('lower', 'upper', 'asis')

    const inputArb = fc.oneof(
      // Known categories with random casing + surrounding whitespace
      fc
        .tuple(knownCategoryArb, casingArb, whitespaceArb, whitespaceArb)
        .map(([category, casing, leading, trailing]) => {
          const cased =
            casing === 'lower'
              ? category.toLowerCase()
              : casing === 'upper'
                ? category.toUpperCase()
                : category
          return `${leading}${cased}${trailing}`
        }),
      // Arbitrary random strings, including empty/unicode/weird input
      fc.string(),
      fc.unicodeString(),
    )

    fc.assert(
      fc.property(inputArb, (input) => {
        const first = getCursedTerritoryName(input)
        const second = getCursedTerritoryName(input)

        expect(typeof first).toBe('string')
        expect(first.length).toBeGreaterThan(0)
        expect(second).toBe(first)
      }),
    )
  })
})
