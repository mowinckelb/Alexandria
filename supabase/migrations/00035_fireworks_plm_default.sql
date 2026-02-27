-- Update get_active_model to use Fireworks Kimi K2.5 as default
CREATE OR REPLACE FUNCTION get_active_model(p_user_id uuid)
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    (SELECT resulting_model_id FROM training_exports
     WHERE user_id = p_user_id AND status = 'active'
     ORDER BY completed_at DESC LIMIT 1),
    'accounts/fireworks/models/kimi-k2p5'
  );
$$;
