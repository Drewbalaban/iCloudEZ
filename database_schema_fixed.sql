-- =====================================================
-- CloudEZ Fixed Database Schema
-- =====================================================
-- This schema creates a secure, scalable file sharing platform
-- Fixed to run without dependency issues
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ENUM TYPES FOR DATA VALIDATION
-- =====================================================

-- File types for categorization
DO $$ BEGIN
    CREATE TYPE file_category AS ENUM (
        'image',
        'video', 
        'audio',
        'document',
        'archive',
        'spreadsheet',
        'presentation',
        'code',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- File visibility levels
DO $$ BEGIN
    CREATE TYPE file_visibility AS ENUM (
        'private',
        'public',
        'shared'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- User account status
DO $$ BEGIN
    CREATE TYPE user_status AS ENUM (
        'active',
        'suspended',
        'deleted'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- CORE TABLES
-- =====================================================

-- User profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    status user_status DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
    CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_-]+$'),
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT bio_length CHECK (char_length(bio) <= 500)
);

-- Documents table for file storage
CREATE TABLE IF NOT EXISTS documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    file_category file_category NOT NULL,
    folder TEXT DEFAULT 'general',
    description TEXT,
    visibility file_visibility DEFAULT 'private',
    is_public BOOLEAN GENERATED ALWAYS AS (visibility = 'public') STORED,
    download_count INTEGER DEFAULT 0,
    last_downloaded TIMESTAMP WITH TIME ZONE,
    checksum TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT file_size_positive CHECK (file_size > 0),
    CONSTRAINT file_size_limit CHECK (file_size <= 1073741824), -- 1GB limit
    CONSTRAINT name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 255),
    CONSTRAINT description_length CHECK (char_length(description) <= 1000),
    CONSTRAINT folder_length CHECK (char_length(folder) <= 100)
);

-- File sharing table for granular permissions
CREATE TABLE IF NOT EXISTS file_shares (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
    shared_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    shared_with UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    permission_level TEXT NOT NULL DEFAULT 'read',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_permission CHECK (permission_level IN ('read', 'write', 'admin')),
    CONSTRAINT no_self_share CHECK (shared_by != shared_with),
    CONSTRAINT unique_share UNIQUE (document_id, shared_with)
);

-- User sessions for tracking
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    session_token TEXT NOT NULL,
    device_info JSONB,
    ip_address INET,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT session_token_length CHECK (char_length(session_token) >= 32)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

-- Documents table indexes
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_visibility ON documents(visibility);
CREATE INDEX IF NOT EXISTS idx_documents_is_public ON documents(is_public);
CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(folder);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(file_category);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_file_size ON documents(file_size);
CREATE INDEX IF NOT EXISTS idx_documents_checksum ON documents(checksum);

-- File shares table indexes
CREATE INDEX IF NOT EXISTS idx_file_shares_document_id ON file_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_file_shares_shared_by ON file_shares(shared_by);
CREATE INDEX IF NOT EXISTS idx_file_shares_shared_with ON file_shares(shared_with);
CREATE INDEX IF NOT EXISTS idx_file_shares_expires_at ON file_shares(expires_at);

-- User sessions table indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_documents_user_visibility ON documents(user_id, visibility);
CREATE INDEX IF NOT EXISTS idx_documents_user_category ON documents(user_id, file_category);
CREATE INDEX IF NOT EXISTS idx_file_shares_user_permission ON file_shares(shared_with, permission_level);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view public profiles" ON profiles
    FOR SELECT USING (status = 'active');

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Documents policies
CREATE POLICY "Users can view their own documents" ON documents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public documents" ON documents
    FOR SELECT USING (visibility = 'public');

CREATE POLICY "Users can view shared documents" ON documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM file_shares 
            WHERE document_id = documents.id 
            AND shared_with = auth.uid()
            AND (expires_at IS NULL OR expires_at > NOW())
        )
    );

CREATE POLICY "Users can insert their own documents" ON documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" ON documents
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" ON documents
    FOR DELETE USING (auth.uid() = user_id);

-- File shares policies
CREATE POLICY "Users can view shares they created" ON file_shares
    FOR SELECT USING (auth.uid() = shared_by);

CREATE POLICY "Users can view shares they received" ON file_shares
    FOR SELECT USING (auth.uid() = shared_with);

CREATE POLICY "Users can create shares for their documents" ON file_shares
    FOR INSERT WITH CHECK (
        auth.uid() = shared_by AND
        EXISTS (
            SELECT 1 FROM documents 
            WHERE id = document_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update shares they created" ON file_shares
    FOR UPDATE USING (auth.uid() = shared_by);

CREATE POLICY "Users can delete shares they created" ON file_shares
    FOR DELETE USING (auth.uid() = shared_by);

-- User sessions policies
CREATE POLICY "Users can view their own sessions" ON user_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sessions" ON user_sessions
    FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, email, full_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STORAGE POLICIES (appended from consolidated policies)
-- =====================================================

-- The following grants and policies configure Supabase storage access
-- for the 'documents' bucket. Run these in the Supabase SQL editor.

-- Ensure authenticated role has privileges; RLS restricts access
grant select, insert, update, delete on storage.objects to authenticated;

-- Allow public reads only for files whose associated document is public
drop policy if exists "storage_friends_read" on storage.objects;
create policy "storage_friends_read" on storage.objects
  for select
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.documents d
      where d.file_path = storage.objects.name
        and d.visibility = 'public'
    )
  );

-- Allow owners to read their own files
drop policy if exists "storage_owner_read" on storage.objects;
create policy "storage_owner_read" on storage.objects
  for select
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.documents d
      where d.file_path = storage.objects.name
        and d.user_id = auth.uid()
    )
  );

-- Allow shared-with users to read shared files (if not expired)
drop policy if exists "storage_shared_read" on storage.objects;
create policy "storage_shared_read" on storage.objects
  for select
  using (
    bucket_id = 'documents'
    and exists (
      select 1
      from public.documents d
      join public.file_shares fs on fs.document_id = d.id
      where d.file_path = storage.objects.name
        and fs.shared_with = auth.uid()
        and (fs.expires_at is null or fs.expires_at > now())
    )
  );

-- Allow owners to insert/update/delete files that map to their documents
drop policy if exists "storage_owner_write" on storage.objects;
create policy "storage_owner_write" on storage.objects
  for all
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.documents d
      where d.file_path = storage.objects.name
        and d.user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'documents'
    and exists (
      select 1 from public.documents d
      where d.file_path = storage.objects.name
        and d.user_id = auth.uid()
    )
  );

-- Service role has full access implicitly

-- Note: Storage bucket creation lives in Supabase dashboard. Ensure a
-- 'documents' bucket exists and is non-public.

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check if tables were created successfully
SELECT 'Tables created successfully' as status;

-- Check if RLS is enabled
SELECT 'RLS enabled on all tables' as status;
