-- Active minutes shown in hours (Build 15): the Goals sheet's min | hours
-- switch, remembered per person. Display only. Purely additive.
-- Apply in the Supabase SQL editor.

ALTER TABLE ph_user_preferences ADD COLUMN IF NOT EXISTS active_minutes_as_hours BOOLEAN;
