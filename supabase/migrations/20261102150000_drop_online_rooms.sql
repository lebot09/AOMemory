-- Multiplayer is played together on one big screen, not online.
-- Remove the online rooms added in 20261102140000_online_rooms.sql (no data to keep).

alter publication supabase_realtime drop table public.rooms;

drop function if exists public.flip_tile(text, text, integer);
drop function if exists public.hide_miss(text);
drop function if exists public.start_room(text, text);
drop function if exists public.join_room(text, text);
drop function if exists public.create_room(uuid, integer, text);
drop function if exists public.get_room(text);
drop function if exists public.room_new_code();
drop function if exists public.room_clean_name(text, text);
drop function if exists public.room_token_hash(text);

drop table if exists public.room_tiles;
drop table if exists public.room_players;
drop table if exists public.rooms;
drop type if exists public.room_status;
