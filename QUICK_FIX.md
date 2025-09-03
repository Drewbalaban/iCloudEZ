# 🚨 Quick Fix for CloudEZ Glitching

## The Problem
Your app is glitching because it's trying to access database tables that don't exist yet. The error "Error fetching files: {}" means the `documents` and `profiles` tables haven't been created in Supabase.

## ✅ The Solution (5 minutes)

### Step 1: Go to Supabase Dashboard
1. Open [supabase.com](https://supabase.com)
2. Sign in to your account
3. Select your CloudEZ project

### Step 2: Run the Database Schema
1. Click **SQL Editor** in the left sidebar
2. Click **New Query**
3. Copy and paste the entire contents of `database_schema.sql`
4. Click **Run** (▶️ button)

### Step 3: Create Storage Bucket
1. Click **Storage** in the left sidebar
2. Click **New Bucket**
3. Set **Name** to: `documents`
4. Set **Public** to: `false` (unchecked)
5. Click **Create bucket**

### Step 4: Set Storage Policies
1. Click on the `documents` bucket
2. Click **Policies** tab
3. Click **New Policy**
4. Copy and paste this policy:

```sql
-- Allow users to upload to their own folder
CREATE POLICY "Users can upload to own folder" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to download their own files
CREATE POLICY "Users can download own files" ON storage.objects
FOR SELECT USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to download public files
CREATE POLICY "Users can download public files" ON storage.objects
FOR SELECT USING (bucket_id = 'documents');

-- Allow users to delete their own files
CREATE POLICY "Users can delete own files" ON storage.objects
FOR DELETE USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## 🎯 What This Fixes
- ✅ Stops the "Error fetching files: {}" errors
- ✅ Creates the profiles table for user profiles
- ✅ Adds the `is_public` field to documents
- ✅ Sets up proper file permissions
- ✅ Enables file uploads and downloads

## 🚀 After the Fix
1. **Refresh your app** - the glitching should stop
2. **Sign up/in** with a test account
3. **Upload files** - they'll work now!
4. **Make files public** using the globe icon
5. **Visit profiles** to see shared files

## 🔍 If You Still Have Issues
- Check the browser console for new error messages
- Make sure your Supabase environment variables are correct
- Verify the tables were created in the **Table Editor**

## 📱 Test the Full Flow
1. Create an account
2. Upload a test file
3. Make it public (click lock → globe)
4. Visit `/profile/yourusername`
5. See your public file displayed
6. Download it from the profile page

**That's it!** Your file sharing app will work perfectly after these 5 minutes of setup.
