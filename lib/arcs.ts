import fs from 'fs'
import path from 'path'

export interface StoryArc {
  id:               string
  title:            string
  startDate:        string
  status:           'active' | 'closed'
  editions:         number[]
  latestDay:        number
  summary:          string
  primaryCommodity: string
  keyLevel:         string
  tags:             string[]
  endDate?:         string
  outcome?:         string
}

export interface ArcData {
  arcs: StoryArc[]
}

const ARC_FILE = path.join(process.cwd(), 'data/story-arcs.json')

export function getAllArcs(): StoryArc[] {
  try {
    const raw = fs.readFileSync(ARC_FILE, 'utf8')
    return (JSON.parse(raw) as ArcData).arcs ?? []
  } catch {
    return []
  }
}

export function getActiveArcs(): StoryArc[] {
  return getAllArcs().filter(a => a.status === 'active')
}

export function getArcById(id: string): StoryArc | null {
  return getAllArcs().find(a => a.id === id) ?? null
}

export function getBriefArcs(edition: number): StoryArc[] {
  return getAllArcs().filter(a => a.editions.includes(edition))
}
