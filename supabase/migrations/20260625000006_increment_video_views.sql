CREATE OR REPLACE FUNCTION increment_video_views(video_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE sop_videos SET views = views + 1 WHERE id::text = video_id;
$$;
