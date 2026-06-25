-- Fix: user_video_progress.video_id was uuid but sop_videos.id is bigint (Date.now())
-- Drop and recreate with correct type
DROP TABLE IF EXISTS user_video_progress;

CREATE TABLE user_video_progress (
  employee_name text NOT NULL,
  video_id bigint NOT NULL,
  progress integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (employee_name, video_id)
);

ALTER TABLE user_video_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage video progress"
  ON user_video_progress FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fix increment_video_views to use correct bigint type
CREATE OR REPLACE FUNCTION increment_video_views(video_id bigint)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE sop_videos SET views = views + 1 WHERE id = video_id;
$$;
