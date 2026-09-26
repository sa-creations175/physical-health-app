-- "Show move streak" (Build 9): a Settings switch, off by default, that shows
-- the move goal streak on Fitness's Daily Movement card. Purely additive.
-- Apply in the Supabase SQL editor.

ALTER TABLE ph_user_preferences ADD COLUMN IF NOT EXISTS show_move_streak BOOLEAN;
