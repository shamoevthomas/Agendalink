-- Table: al_admin_settings
CREATE TABLE IF NOT EXISTS al_admin_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email text UNIQUE,
    google_refresh_token text,
    updated_at timestamp DEFAULT now()
);

-- Table: al_meetings
CREATE TABLE IF NOT EXISTS al_meetings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text,
    meeting_date date,
    meeting_time time,
    is_google_meet boolean,
    description text,
    share_id uuid UNIQUE DEFAULT gen_random_uuid(),
    google_event_id text,
    google_meet_link text,
    host_email text,
    duration integer DEFAULT 60,
    created_at timestamp DEFAULT now()
);

-- Row Level Security (RLS) is disabled for now as requested
ALTER TABLE al_admin_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE al_meetings DISABLE ROW LEVEL SECURITY;
