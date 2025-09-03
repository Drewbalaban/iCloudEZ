# CloudEZ Database Setup Guide

## 🚀 Quick Start

1. **Run the setup script:**
   ```bash
   ./scripts/setup_database.sh
   ```

2. **Follow the manual steps below**

## 📋 Manual Setup Steps

### Step 1: Apply Database Schema

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your CloudEZ project
3. Navigate to **SQL Editor** in the left sidebar
4. Copy the entire contents of `database_schema_production.sql`
5. Paste it into the SQL Editor
6. Click **Run** to execute the script

### Step 2: Create Storage Bucket

1. In your Supabase project, go to **Storage** in the left sidebar
2. Click **Create a new bucket**
3. Configure the bucket:
   - **Name**: `documents`
   - **Public**: `false` (unchecked)
   - **File size limit**: `1GB`
   - **Allowed MIME types**: `*/*` (all types)

### Step 3: Set Storage Policies

Run these SQL commands in the SQL Editor to set up storage policies:

```sql
-- Allow users to upload to their own folder
CREATE POLICY "Users can upload to own folder" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to download their own files
CREATE POLICY "Users can download own files" ON storage.objects
FOR SELECT USING (
    bucket_id = 'documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to download public files
CREATE POLICY "Users can download public files" ON storage.objects
FOR SELECT USING (
    bucket_id = 'documents' AND
    EXISTS (
        SELECT 1 FROM documents 
        WHERE file_path = name AND visibility = 'public'
    )
);

-- Allow users to download shared files
CREATE POLICY "Users can download shared files" ON storage.objects
FOR SELECT USING (
    bucket_id = 'documents' AND
    EXISTS (
        SELECT 1 FROM file_shares fs
        JOIN documents d ON fs.document_id = d.id
        WHERE d.file_path = name AND fs.shared_with = auth.uid()
        AND (fs.expires_at IS NULL OR fs.expires_at > NOW())
    )
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete own files" ON storage.objects
FOR DELETE USING (
    bucket_id = 'documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);
```

### Step 4: Verify Setup

Check that the following are properly configured:

#### Tables Created ✅
- `profiles` - User profile information
- `documents` - File metadata and storage info
- `file_shares` - File sharing permissions
- `user_sessions` - User session tracking

#### Row Level Security (RLS) ✅
- All tables have RLS enabled
- Proper policies are in place for data access control

#### Storage Bucket ✅
- `documents` bucket exists
- Storage policies are configured

#### Authentication ✅
- User signup automatically creates profiles
- Proper user isolation and data privacy

## 🔧 Using Supabase CLI (Alternative)

If you prefer automated setup:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Initialize project (if not already done)
supabase init

# Push database schema
supabase db push
```

## 📊 Database Schema Overview

### Core Tables

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `profiles` | User information | Username, email, bio, avatar |
| `documents` | File metadata | File type, size, visibility, sharing |
| `file_shares` | File permissions | Granular access control |
| `user_sessions` | Session tracking | Device info, IP tracking |

### Key Features

- **File Categories**: Automatic categorization by MIME type
- **Visibility Levels**: Private, public, or shared
- **Sharing System**: Granular permissions (read/write/admin)
- **Security**: Row Level Security (RLS) on all tables
- **Performance**: Optimized indexes for common queries
- **Integrity**: File checksums and metadata validation

## 🚨 Troubleshooting

### Common Issues

1. **"Relation does not exist" errors**
   - Make sure you ran the schema script completely
   - Check that all tables were created

2. **RLS policy errors**
   - Verify RLS is enabled on all tables
   - Check that policies are properly configured

3. **Storage access denied**
   - Ensure storage bucket exists
   - Verify storage policies are set correctly

4. **Authentication issues**
   - Check that auth triggers are created
   - Verify user signup flow

### Verification Queries

Run these in SQL Editor to check your setup:

```sql
-- Check tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';

-- Check storage bucket
SELECT * FROM storage.buckets;
```

## 🎯 Next Steps

After database setup is complete:

1. **Test Authentication**: Try signing up/signing in
2. **Test File Upload**: Upload a test file
3. **Test File Sharing**: Share a file with another user
4. **Test RLS**: Verify data isolation works correctly

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL RLS Guide](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase Storage Guide](https://supabase.com/docs/guides/storage)

---

**Need Help?** Check the troubleshooting section above or refer to the Supabase documentation.
