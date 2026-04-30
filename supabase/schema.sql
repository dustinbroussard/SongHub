-- SongHub Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Bands table
CREATE TABLE bands (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Band members table
CREATE TABLE band_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    user_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(band_id, user_id)
);

-- Songs table
CREATE TABLE songs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    work_title TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    lyrics TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    audio_files JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Song feedback table (for non-owners to leave feedback)
CREATE TABLE song_feedback (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    feedback TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User last seen tracking (for new content indicator)
CREATE TABLE user_last_seen (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, band_id)
);

-- Notifications table (for song sharing/updates)
CREATE TABLE notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('song_created', 'song_updated')),
    message TEXT NOT NULL,
    from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    from_user_name TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for unread notifications
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Indexes for performance
CREATE INDEX idx_bands_invite_code ON bands(invite_code);
CREATE INDEX idx_band_members_band_id ON band_members(band_id);
CREATE INDEX idx_band_members_user_id ON band_members(user_id);
CREATE INDEX idx_songs_band_id ON songs(band_id);
CREATE INDEX idx_songs_created_by ON songs(created_by);
CREATE INDEX idx_songs_updated_at ON songs(updated_at);
CREATE INDEX idx_song_feedback_song_id ON song_feedback(song_id);

-- Row Level Security (RLS) policies

-- Bands: Users can view bands they are members of
ALTER TABLE bands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their bands"
    ON bands FOR SELECT
    USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM band_members 
            WHERE band_id = bands.id AND user_id = auth.uid()
        )
    );

-- Only creator can update/delete band
CREATE POLICY "Only creator can update band"
    ON bands FOR UPDATE
    USING (created_by = auth.uid());

CREATE POLICY "Only creator can delete band"
    ON bands FOR DELETE
    USING (created_by = auth.uid());

-- Band members: Users can view members of their bands
ALTER TABLE band_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view band members of their bands"
    ON band_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM band_members bm
            WHERE bm.band_id = band_members.band_id AND bm.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM bands
            WHERE id = band_members.band_id AND created_by = auth.uid()
        )
    );

-- Users can insert themselves as members (for joining)
CREATE POLICY "Users can join bands with invite"
    ON band_members FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Songs: Users can view songs in their bands
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view songs in their bands"
    ON songs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM band_members
            WHERE band_id = songs.band_id AND user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM bands
            WHERE id = songs.band_id AND created_by = auth.uid()
        )
    );

-- Users can create songs in their bands
CREATE POLICY "Users can create songs in their bands"
    ON songs FOR INSERT
    WITH CHECK (
        created_by = auth.uid() AND
        (
            EXISTS (
                SELECT 1 FROM band_members
                WHERE band_id = songs.band_id AND user_id = auth.uid()
            ) OR
            EXISTS (
                SELECT 1 FROM bands
                WHERE id = songs.band_id AND created_by = auth.uid()
            )
        )
    );

-- Only creator can update/delete their songs
CREATE POLICY "Only creator can update their songs"
    ON songs FOR UPDATE
    USING (created_by = auth.uid());

CREATE POLICY "Only creator can delete their songs"
    ON songs FOR DELETE
    USING (created_by = auth.uid());

-- Song feedback: Users can view feedback on songs in their bands
ALTER TABLE song_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view feedback on their band songs"
    ON song_feedback FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM band_members
            WHERE band_id = song_feedback.band_id AND user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM bands
            WHERE id = song_feedback.band_id AND created_by = auth.uid()
        )
    );

-- Users can create feedback on songs in their bands (but not their own songs)
CREATE POLICY "Users can leave feedback on others songs"
    ON song_feedback FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM songs
            WHERE id = song_feedback.song_id AND created_by != auth.uid()
        ) AND
        (
            EXISTS (
                SELECT 1 FROM band_members
                WHERE band_id = song_feedback.band_id AND user_id = auth.uid()
            ) OR
            EXISTS (
                SELECT 1 FROM bands
                WHERE id = song_feedback.band_id AND created_by = auth.uid()
            )
        )
    );

-- User can delete their own feedback
CREATE POLICY "Users can delete their own feedback"
    ON song_feedback FOR DELETE
    USING (user_id = auth.uid());

-- User last seen: Users can manage their own last seen records
ALTER TABLE user_last_seen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own last seen"
    ON user_last_seen FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own last seen"
    ON user_last_seen FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own last seen"
    ON user_last_seen FOR UPDATE
    USING (user_id = auth.uid());

-- Notifications: Users can view their own notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create notifications for band members"
    ON notifications FOR INSERT
    WITH CHECK (
        from_user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM band_members
            WHERE band_id = notifications.band_id AND user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM bands
            WHERE id = notifications.band_id AND created_by = auth.uid()
        )
    );

CREATE POLICY "Users can mark their notifications as read"
    ON notifications FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
    ON notifications FOR DELETE
    USING (user_id = auth.uid());

-- Functions

-- Generate unique invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists_check BOOLEAN;
BEGIN
    LOOP
        -- Generate 8 character alphanumeric code
        code := upper(substring(md5(random()::text) from 1 for 8));
        
        -- Check if code exists
        SELECT EXISTS(SELECT 1 FROM bands WHERE invite_code = code) INTO exists_check;
        
        EXIT WHEN NOT exists_check;
    END LOOP;
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bands_updated_at
    BEFORE UPDATE ON bands
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_songs_updated_at
    BEFORE UPDATE ON songs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
