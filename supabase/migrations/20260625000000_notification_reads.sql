CREATE TABLE IF NOT EXISTS notification_reads (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  read_keys text[] DEFAULT '{}'::text[],
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notification reads"
  ON notification_reads FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
