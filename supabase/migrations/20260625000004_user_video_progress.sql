CREATE TABLE IF NOT EXISTS user_video_progress (
  employee_name text NOT NULL,
  video_id uuid NOT NULL,
  progress integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (employee_name, video_id)
);

ALTER TABLE user_video_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage video progress"
  ON user_video_progress FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
