# CloudEZ File Sharing Setup Guide

## Overview
CloudEZ is a file sharing app where users can:
- Create accounts and upload files
- Make files public or private
- Visit other users' profiles to see and download their public files
- Manage their own profile and file visibility

## Environment Variables
You only need the standard Supabase environment variables - no additional storage keys required:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Database Setup

### 1. Run the SQL Schema
Execute the `database_schema.sql` file in your Supabase SQL editor. This will:
- Create the `profiles` and `documents` tables
- Set up Row Level Security (RLS) policies
- Create triggers for automatic profile creation
- Set up indexes for performance

### 2. Storage Bucket Setup
In your Supabase dashboard:
1. Go to Storage → Buckets
2. Create a new bucket called `documents`
3. Set it to private (not public)
4. Set up storage policies for the `documents` bucket:

```sql
-- Allow users to upload to their own folder
CREATE POLICY "Users can upload to own folder" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to download their own files
CREATE POLICY "Users can download own files" ON storage.objects
FOR SELECT USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to download public files (if they have the file ID)
CREATE POLICY "Users can download public files" ON storage.objects
FOR SELECT USING (bucket_id = 'documents');

-- Allow users to delete their own files
CREATE POLICY "Users can delete own files" ON storage.objects
FOR DELETE USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## Features

### User Profiles
- **Public Profile Pages**: `/profile/[username]` - Anyone can visit to see public files
- **Profile Settings**: `/profile/settings` - Users can edit their profile
- **Automatic Profile Creation**: Profiles are created automatically when users sign up

### File Management
- **Upload Files**: Drag & drop or click to browse
- **File Visibility**: Toggle between public (globe icon) and private (lock icon)
- **File Organization**: Files are categorized by type (images, videos, documents, etc.)
- **Search & Filter**: Find files by name, type, or folder

### File Sharing
- **Public Files**: Files marked as public appear on user profiles
- **Download Access**: Anyone can download public files from user profiles
- **Privacy Control**: Users control which files are public vs private

## How It Works

### 1. File Upload Flow
1. User selects files in dashboard
2. Files are uploaded to Supabase Storage in `documents/[user_id]/[file_type]/[filename]`
3. File metadata is stored in the `documents` table with `is_public: false` by default

### 2. File Visibility Toggle
1. User clicks the globe/lock icon on any file
2. `is_public` field is updated in the database
3. UI updates to show current visibility status

### 3. Public Profile Access
1. Anyone can visit `/profile/[username]`
2. Profile page shows user info and public files
3. Visitors can download public files using signed URLs

### 4. Profile Management
1. Users can edit their profile at `/profile/settings`
2. Changes are saved to the `profiles` table
3. Profile updates are reflected on their public profile page

## Security Features

### Row Level Security (RLS)
- Users can only see their own files
- Public files are visible to everyone
- Users can only modify their own data

### Storage Policies
- Users can only upload to their own folder
- Users can only delete their own files
- Public files can be downloaded by anyone with the file ID

### Authentication
- All file operations require authentication
- Profile pages are public but file access is controlled
- Service role key used only for server-side operations

## File Structure
```
src/
├── app/
│   ├── profile/
│   │   ├── [username]/page.tsx     # Public user profile
│   │   └── settings/page.tsx       # Profile settings
│   ├── dashboard/page.tsx          # Main dashboard
│   └── api/upload/route.ts        # File upload API
├── components/
│   ├── FileManager.tsx            # File management interface
│   └── AutoUpload.tsx             # File upload component
└── lib/
    └── supabase.ts                # Supabase client
```

## Usage Examples

### Making a File Public
1. Go to dashboard
2. Find the file you want to share
3. Click the lock icon (🔒) to make it public
4. Icon changes to globe (🌐) indicating it's now public

### Sharing Your Profile
1. Go to profile settings
2. Set your username (e.g., "john")
3. Your profile will be available at `/profile/john`
4. Share this URL with others

### Downloading Public Files
1. Visit any user's profile page
2. Browse their public files
3. Click the download button on any file
4. File downloads to your device

## Troubleshooting

### Common Issues
1. **Files not uploading**: Check storage bucket permissions
2. **Profile not found**: Ensure RLS policies are set correctly
3. **Can't make files public**: Verify database schema includes `is_public` field
4. **Download fails**: Check storage policies and file permissions

### Database Checks
```sql
-- Check if profiles table exists
SELECT * FROM information_schema.tables WHERE table_name = 'profiles';

-- Check if documents table has is_public column
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'documents' AND column_name = 'is_public';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'documents';
```

## Next Steps
- Add file sharing with specific users (not just public)
- Implement file comments and ratings
- Add file preview capabilities
- Create file collections/albums
- Add social features (following, likes, etc.)
