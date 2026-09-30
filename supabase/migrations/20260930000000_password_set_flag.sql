-- Tandai user yang sudah punya password.
-- LMS-Learner mewajibkan karyawan yang masuk lewat link undangan membuat password dulu
-- (user_metadata.password_set belum true). User lama yang sudah punya password
-- diberi tanda ini agar tidak diminta membuat password lagi.
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"password_set": true}'::jsonb
WHERE encrypted_password IS NOT NULL
  AND encrypted_password <> ''
  AND COALESCE((raw_user_meta_data ->> 'password_set')::boolean, false) = false;
