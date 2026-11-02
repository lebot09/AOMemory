// Generated from the aomemory_db schema (supabase gen types), trimmed to what the app uses.
// Regenerate with: npx supabase gen types typescript --project-id wwkawpnxngkljvynzcgm
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type VersionStatus = 'draft' | 'approved' | 'superseded' | 'retired'
export type GameMode = 'solo' | 'local' | 'online' | 'booth'

type CardSetRow = {
  id: string; slug: string; name: string; description: string
  created_by: string | null; created_at: string; updated_at: string
}
type CardSetVersionRow = {
  id: string; set_id: string; version: number; status: VersionStatus; notes: string
  created_by: string | null; created_at: string; approved_by: string | null; approved_at: string | null
}
type CardRow = {
  id: string; version_id: string; position: number; label: string; alt_text: string
  image_path: string; metadata: Json; created_at: string
}
type GameRow = {
  id: string; version_id: string; mode: GameMode; pairs: number
  created_at: string; finished_at: string | null
}
type AdminRow = { user_id: string; created_at: string }

type Table<R, Required extends keyof R> = {
  Row: R
  Insert: Pick<R, Required> & Partial<R>
  Update: Partial<R>
  Relationships: []
}

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.18' }
  public: {
    Tables: {
      admins: Table<AdminRow, 'user_id'>
      card_sets: Table<CardSetRow, 'slug' | 'name'>
      card_set_versions: Table<CardSetVersionRow, 'set_id' | 'version'>
      cards: Table<CardRow, 'version_id' | 'position' | 'label' | 'alt_text' | 'image_path'>
      games: Table<GameRow, 'version_id' | 'mode' | 'pairs'>
    }
    Views: {
      playable_sets: {
        Row: {
          set_id: string | null; slug: string | null; name: string | null; description: string | null
          version_id: string | null; version: number | null; approved_at: string | null
          card_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      approve_version: { Args: { p_version_id: string }; Returns: undefined }
      create_draft_version: { Args: { p_set_id: string }; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      retire_set: { Args: { p_set_id: string }; Returns: undefined }
    }
    Enums: { game_mode: GameMode; version_status: VersionStatus }
    CompositeTypes: { [_ in never]: never }
  }
}

export type CardSet = CardSetRow
export type CardSetVersion = CardSetVersionRow
export type Card = CardRow
export type PlayableSet = Database['public']['Views']['playable_sets']['Row']
