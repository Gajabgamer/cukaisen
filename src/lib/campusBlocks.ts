/**
 * Names from the "KNOW WHERE YOU ARE" campus board, for the admin
 * "name this block" tool. `category` is matched (case-insensitively) to an
 * existing place category, or created if missing.
 */

export interface CampusBlock { name: string; description: string; category: string; group: string }

const b = (group: string, category: string) => (name: string, description: string): CampusBlock => ({ name, description, category, group })

const A = b('Academic — A', 'department')
const B = b('Academic — B', 'department')
const C = b('Academic — C', 'department')
const D = b('Academic — D', 'department')
const DD = b('Academic — DD', 'department')
const H = b('Hostels', 'Hostel')
const S = b('Sports', 'Playground')
const G = b('Gates', 'gate')
const O = b('Other', 'building')

export const CAMPUS_BLOCKS: CampusBlock[] = [
    A('A1', 'University Institute of Biotechnology'),
    A('A2', 'University Institute of Architecture · Film & Visual Arts · Media Studies'),
    A('A3', 'University Institute of Liberal Arts & Humanities · Design · Teacher Training'),
    B('B1', 'University Institute of Engineering — CSE'),
    B('B2', 'University Institute of Tourism & Hospitality Management'),
    B('B3', 'University Institute of Engineering — CSE'),
    B('B4', 'University Institute of Engineering — Aerospace, Mechanical, Civil, ECE'),
    B('B5', 'University Institute of Legal Studies · Arts & Cultural Affairs (DACA)'),
    C('C1', 'University Institute of Engineering — Engineering Foundations'),
    C('C2', 'University Institute of Engineering — CSE'),
    C('C3', 'University Institute of Engineering — Engineering Foundations'),
    D('D1', 'Apex Institute of Management — MBA'),
    D('D2', 'University Institute of Engineering — APEX CSE (AI & ML)'),
    D('D3', 'University Institute of Engineering — APEX CSE (Core)'),
    D('D4', 'Apex Institute of Management — BBA (APEX), MBA 2nd year'),
    D('D5', 'University School of Business — MBA 1st year, Economics'),
    D('D6', 'Library & Mess'),
    D('D7', 'University Institute of Allied Health Sciences · Medical Lab Sciences · Sciences · Pharma'),
    D('D8', 'University Institute of Pharma Sciences · Finance & Accounting · Nursing · Apex Management'),
    DD('DD1', 'University Institute of Sciences — Mathematics · Physical Education & Sports'),
    DD('DD2', 'University Institute of Sciences — Physics'),
    DD('DD3', 'University School of Business — BBA'),
    DD('DD4', 'University School of Business — Commerce'),
    DD('DD5', 'University School of Business'),
    H('NCT 1', 'Hostels area'), H('NCT 2', 'Hostels area'), H('NCT 3', 'Hostels area'),
    H('NCT 4', 'Hostels area'), H('NCT 5', 'Hostels area'), H('NCT 6', 'Hostels area'),
    H('Zakir A', 'Hostels area'), H('Zakir B', 'Hostels area'), H('Zakir C', 'Hostels area'), H('Zakir D', 'Hostels area'),
    H('LC Girls Hostel', 'Girls hostel'),
    H('Shiwalik Girls Hostel', 'Girls hostel'),
    H('Govind Hostel', 'Hostel'),
    S('Sports Complex', 'Sports complex'),
    S('Sports Ground', 'Sports ground'),
    S('Main Ground', 'Main ground'),
    G('Gate 3', 'Campus gate'),
    O('Academic Orientation Venue', 'Orientation venue'),
    O('Information Centre', 'Help desk & information'),
    O('UCRD', 'University Centre for Research & Development'),
    O('TBI', 'Technology Business Incubator'),
    O('Knowledge Resource Centre', 'Central library'),
    O('Cultural Performance Venue', 'Events & performances'),
]
