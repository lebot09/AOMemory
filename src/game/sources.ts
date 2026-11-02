import { fetchVersionCards } from '../lib/cardSets'
import { cardImageUrl } from '../lib/supabase'
import { DEMO_FACES, DEMO_SET_ID } from './demoSet'
import type { Face } from './engine'

/** Load the faces of one exact card set version (or the built-in demo). */
export async function loadFaces(versionId: string): Promise<Face[]> {
  if (versionId === DEMO_SET_ID) return DEMO_FACES
  const cards = await fetchVersionCards(versionId)
  return cards.map((c) => ({
    pairId: c.id,
    label: c.label,
    altText: c.alt_text,
    imageUrl: cardImageUrl(c.image_path),
  }))
}
