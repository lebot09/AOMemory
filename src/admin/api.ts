import { supabase, CARD_IMAGE_BUCKET } from '../lib/supabase'
import type { Card, CardSet, CardSetVersion, Json } from '../lib/database.types'

function db() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

export type SetSummary = CardSet & { versions: CardSetVersion[] }

export async function listSets(): Promise<SetSummary[]> {
  const { data, error } = await db().from('card_sets').select('*, versions:card_set_versions(*)').order('name')
  if (error) throw error
  return (data as unknown as SetSummary[]).map((s) => ({ ...s, versions: [...s.versions].sort((a, b) => b.version - a.version) }))
}

export async function getSet(id: string): Promise<SetSummary> {
  const { data, error } = await db().from('card_sets').select('*, versions:card_set_versions(*)').eq('id', id).single()
  if (error) throw error
  const s = data as unknown as SetSummary
  return { ...s, versions: [...s.versions].sort((a, b) => b.version - a.version) }
}

export function slugify(name: string): string {
  return name.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'card-set'
}

/** New set with an empty version 1 draft. */
export async function createSet(name: string, description: string): Promise<string> {
  const client = db()
  const { data: user } = await client.auth.getUser()
  const { data, error } = await client.from('card_sets')
    .insert({ name, description, slug: `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`, created_by: user.user?.id ?? null })
    .select('id').single()
  if (error) throw error
  await createDraft(data.id)
  return data.id
}

export async function updateSet(id: string, patch: { name?: string; description?: string }): Promise<void> {
  const { error } = await db().from('card_sets').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function createDraft(setId: string): Promise<string> {
  const { data, error } = await db().rpc('create_draft_version', { p_set_id: setId })
  if (error) throw error
  return data
}

export async function discardDraft(versionId: string): Promise<void> {
  const { error } = await db().from('card_set_versions').delete().eq('id', versionId).eq('status', 'draft')
  if (error) throw error
}

export async function updateDraftNotes(versionId: string, notes: string): Promise<void> {
  const { error } = await db().from('card_set_versions').update({ notes }).eq('id', versionId)
  if (error) throw error
}

export async function approveVersion(versionId: string): Promise<void> {
  const { error } = await db().rpc('approve_version', { p_version_id: versionId })
  if (error) throw error
}

export async function retireSet(setId: string): Promise<void> {
  const { error } = await db().rpc('retire_set', { p_set_id: setId })
  if (error) throw error
}

export async function listCards(versionId: string): Promise<Card[]> {
  const { data, error } = await db().from('cards').select('*').eq('version_id', versionId).order('position')
  if (error) throw error
  return data ?? []
}

export type CardMeta = { tags?: string[]; description?: string }

export async function updateCard(id: string, patch: { label?: string; alt_text?: string; metadata?: Json }): Promise<void> {
  const { error } = await db().from('cards').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteCard(id: string): Promise<void> {
  const { error } = await db().from('cards').delete().eq('id', id)
  if (error) throw error
}

/** Shrink to at most `max` px on the long side and re-encode as WebP, so booth screens load fast. */
export async function prepareImage(file: File, max = 1024): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process image'))), 'image/webp', 0.88))
}

export function labelFromFilename(name: string): string {
  const base = name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
  return (base.charAt(0).toUpperCase() + base.slice(1)).slice(0, 80) || 'Card'
}

/**
 * Upload one image as a new card at the end of a draft. Files get a fresh random name and are
 * never overwritten, so published versions keep their pictures.
 */
export async function addCardFromFile(setId: string, versionId: string, file: File, position: number): Promise<void> {
  const client = db()
  const blob = await prepareImage(file)
  const path = `${setId}/${crypto.randomUUID()}.webp`
  const up = await client.storage.from(CARD_IMAGE_BUCKET).upload(path, blob, { contentType: 'image/webp', upsert: false })
  if (up.error) throw up.error
  const label = labelFromFilename(file.name)
  const { error } = await client.from('cards').insert({
    version_id: versionId, position, label, alt_text: label, image_path: path, metadata: {},
  })
  if (error) {
    await client.storage.from(CARD_IMAGE_BUCKET).remove([path])
    throw error
  }
}

/** Problems that block approval, in plain words. */
export function approvalProblems(cards: Card[]): string[] {
  const problems: string[] = []
  if (cards.length < 2) problems.push('Add at least 2 cards.')
  const labels = new Map<string, number>()
  cards.forEach((c) => labels.set(c.label.trim().toLowerCase(), (labels.get(c.label.trim().toLowerCase()) ?? 0) + 1))
  const dupes = [...labels].filter(([, n]) => n > 1).map(([l]) => l)
  if (dupes.length) problems.push(`Each card needs a different name (repeated: ${dupes.join(', ')}).`)
  if (cards.some((c) => !c.alt_text.trim())) problems.push('Every card needs alt text.')
  return problems
}

/** Worth fixing, but not blocking. */
export function approvalWarnings(cards: Card[]): string[] {
  const same = cards.filter((c) => c.alt_text.trim().toLowerCase() === c.label.trim().toLowerCase()).length
  return same ? [`${same} card${same === 1 ? ' still uses' : 's still use'} the name as alt text. A short description of the picture helps screen reader users.`] : []
}

export function errorText(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return String(e)
}
