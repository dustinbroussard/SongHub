-- SongHub Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Bands table
CREATE TABLE hub_bands (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invite_code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Band members table
CREATE TABLE hub_band_members (
    band_id UUID NOT NULL REFERENCES hub_bands(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (band_id, user_id)
);

-- Ideas table
CREATE TABLE hub_new_ideas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    band_id UUID NOT NULL REFERENCES hub_bands(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lyrics TEXT DEFAULT '',
    tempo INTEGER,
    key TEXT,
    genre TEXT,
    artist TEXT,
    project_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audio versions table
CREATE TABLE hub_new_idea_audio_versions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    idea_id UUID NOT NULL REFERENCES hub_new_ideas(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    original_file_name TEXT,
    storage_bucket TEXT NOT NULL DEFAULT 'songhub-audio',
    storage_path TEXT NOT NULL,
    mime_type TEXT,
    byte_size BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- FUNCTIONS

-- Generate random invite code
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Auto-generate invite code for new bands
CREATE OR REPLACE FUNCTION public.set_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := public.generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Check if user is a member of a band (Security Definer to bypass RLS recursion)
CREATE OR REPLACE FUNCTION public.is_band_member(check_band_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.hub_band_members
    WHERE band_id = check_band_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_invite_code_trigger
    BEFORE INSERT ON hub_bands
    FOR EACH ROW
    EXECUTE FUNCTION set_invite_code();

CREATE TRIGGER update_bands_updated_at
    BEFORE UPDATE ON hub_bands
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_songs_updated_at
    BEFORE UPDATE ON hub_new_ideas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS POLICIES

-- hub_bands
ALTER TABLE hub_bands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their bands"
ON hub_bands FOR SELECT
USING (
    owner_id = auth.uid() OR is_band_member(id)
);

CREATE POLICY "Owners can update their bands"
ON hub_bands FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their bands"
ON hub_bands FOR DELETE
USING (owner_id = auth.uid());

CREATE POLICY "Anyone can create a band"
ON hub_bands FOR INSERT
WITH CHECK (owner_id = auth.uid());

-- hub_band_members
ALTER TABLE hub_band_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view band members of their bands"
ON hub_band_members FOR SELECT
USING (
    is_band_member(band_id)
);

CREATE POLICY "Users can join bands"
ON hub_band_members FOR INSERT
WITH CHECK (user_id = auth.uid());

-- hub_new_ideas
ALTER TABLE hub_new_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ideas in their bands"
ON hub_new_ideas FOR SELECT
USING (
    is_band_member(band_id)
);

CREATE POLICY "Users can create ideas in their bands"
ON hub_new_ideas FOR INSERT
WITH CHECK (
    is_band_member(band_id)
);

CREATE POLICY "Creators can update their ideas"
ON hub_new_ideas FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Creators can delete their ideas"
ON hub_new_ideas FOR DELETE
USING (created_by = auth.uid());

-- hub_new_idea_audio_versions
ALTER TABLE hub_new_idea_audio_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audio in their bands"
ON hub_new_idea_audio_versions FOR SELECT
USING (
    idea_id IN (
        SELECT id FROM hub_new_ideas
    )
);
-- Note: the above policy for audio versions relies on hub_new_ideas policy
-- which is safe since hub_new_ideas doesn't call back to audio versions.

CREATE POLICY "Users can upload audio to their ideas"
ON hub_new_idea_audio_versions FOR INSERT
WITH CHECK (
    idea_id IN (
        SELECT id FROM hub_new_ideas WHERE created_by = auth.uid()
    )
);

CREATE POLICY "Uploaders can delete their audio"
ON hub_new_idea_audio_versions FOR DELETE
USING (uploaded_by = auth.uid());

-- Storage Policies (Run these in the storage editor if needed)
-- bucket: songhub-audio
-- Policy: "Authenticated users can upload audio"
-- Allowed: INSERT
-- Check: auth.role() = 'authenticated'

-- Policy: "Users can view their band audio"
-- Allowed: SELECT
-- Check: (storage.foldername(name))[1] IN (SELECT id::text FROM hub_bands)
-- This might need adjustment based on folder structure.
Tell me more about how you'd think she's dress.  i'm still undecided on this and could use some input