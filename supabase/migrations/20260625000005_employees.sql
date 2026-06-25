CREATE TABLE IF NOT EXISTS employees (
  email text PRIMARY KEY,
  name text NOT NULL,
  dept text NOT NULL,
  city text DEFAULT '',
  status text DEFAULT 'Aktif',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read employees"
  ON employees FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage employees"
  ON employees FOR ALL TO authenticated USING (true) WITH CHECK (true);
