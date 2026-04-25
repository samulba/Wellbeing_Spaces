-- ============================================================
-- Migration 088 · Aktive Sessions verwalten
--
-- Stellt SECURITY-DEFINER-RPC-Funktionen bereit, mit denen ein
-- eingeloggter User seine eigenen aktiven Auth-Sessions sehen
-- und einzeln beenden kann. Die `auth.sessions`-Tabelle ist sonst
-- nicht von Clients lesbar.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_meine_sessions()
RETURNS TABLE (
  id            uuid,
  user_id       uuid,
  created_at    timestamptz,
  updated_at    timestamptz,
  refreshed_at  timestamptz,
  not_after     timestamptz,
  user_agent    text,
  ip            text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    s.id,
    s.user_id,
    s.created_at,
    s.updated_at,
    s.refreshed_at,
    s.not_after,
    s.user_agent,
    HOST(s.ip)
  FROM auth.sessions s
  WHERE s.user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_meine_sessions() TO authenticated;

-- ────────────────────────────────────────────────────────────
-- Session-Beenden: löscht eine Session, die dem aktuellen User
-- gehört. Cascading entfernt automatisch refresh_tokens.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.session_beenden(p_session_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count int;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  DELETE FROM auth.sessions
  WHERE id = p_session_id AND user_id = auth.uid();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.session_beenden(uuid) TO authenticated;
