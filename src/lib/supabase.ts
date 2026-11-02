import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

/** null when the app runs without Supabase settings (e.g. an offline booth build with bundled sets). */
export const supabase = url && key ? createClient<Database>(url, key) : null

export const CARD_IMAGE_BUCKET = 'card-images'

export function cardImageUrl(path: string): string {
  if (!supabase) return path
  return supabase.storage.from(CARD_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl
}
