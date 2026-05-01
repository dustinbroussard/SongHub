-- SongHub Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Bands table
CREATE TABLE hub_bands (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- RLS POLICIES

-- hub_bands
ALTER TABLE hub_bands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their bands"
ON hub_bands FOR SELECT
USING (
    owner_id = auth.uid() OR
    id IN (
        SELECT band_id FROM hub_band_members WHERE user_id = auth.uid()
    )
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
    band_id IN (
        SELECT band_id FROM hub_band_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can join bands"
ON hub_band_members FOR INSERT
WITH CHECK (user_id = auth.uid());

-- hub_new_ideas
ALTER TABLE hub_new_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ideas in their bands"
ON hub_new_ideas FOR SELECT
USING (
    band_id IN (
        SELECT band_id FROM hub_band_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can create ideas in their bands"
ON hub_new_ideas FOR INSERT
WITH CHECK (
    band_id IN (
        SELECT band_id FROM hub_band_members WHERE user_id = auth.uid()
    )
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
