# 🏗️ CloudEZ Professional Database Setup Guide

## Overview
This guide provides a comprehensive, production-ready setup for CloudEZ, a secure file sharing platform built on Supabase. We'll implement enterprise-grade security, proper data validation, and scalable architecture.

## 🎯 What We're Building
- **Secure File Storage**: Encrypted file storage with granular permissions
- **User Management**: Comprehensive user profiles with status tracking
- **File Sharing**: Advanced sharing with expiration and permission levels
- **Security**: Row Level Security (RLS) with comprehensive policies
- **Performance**: Optimized indexes and query performance
- **Monitoring**: Session tracking and usage analytics

## 📋 Prerequisites
- Supabase project with admin access
- Basic understanding of PostgreSQL
- 15-20 minutes for complete setup

## 🚀 Step-by-Step Setup

### Phase 1: Database Schema Setup

#### Step 1: Access Supabase SQL Editor
1. Go to [supabase.com](https://supabase.com)
2. Sign in and select your **CloudEZ project**
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**

#### Step 2: Execute Production Schema
1. Copy the entire contents of `database_schema_production.sql`
2. Paste into the SQL Editor
3. Click **Run** (▶️ button)
4. Verify success message: "Success. No rows returned"

**Expected Output**: The schema creates:
- 4 core tables with proper constraints
- 20+ indexes for performance
- 15+ RLS policies for security
- 6 functions for automation
- 3 triggers for data integrity

#### Step 3: Verify Schema Creation
Run this verification query:

```sql
-- Check tables
SELECT 
    table_name,
    table_type,
    CASE 
        WHEN row_security = 'YES' THEN '✅ RLS Enabled'
        ELSE '❌ RLS Disabled'
    END as security_status
FROM information_schema.tables t
LEFT JOIN pg_tables pt ON t.table_name = pt.tablename
WHERE t.table_schema = 'public' 
ORDER BY table_name;
```

**Expected Result**: 4 tables with RLS enabled

### Phase 2: Storage Configuration

#### Step 1: Create Storage Bucket
1. Navigate to **Storage** in the left sidebar
2. Click **New Bucket**
3. Configure as follows:
   - **Name**: `documents`
   - **Public**: `false` (unchecked)
   - **File Size Limit**: `1 GB`
   - **Allowed MIME Types**: `*/*`

#### Step 2: Configure Storage Policies
1. Click on the `documents` bucket
2. Navigate to **Policies** tab
3. Click **New Policy**
4. Copy and paste the storage policies from the schema file

**Storage Policies Include**:
- User upload permissions (own folder only)
- Download permissions (own files + public + shared)
- Delete permissions (own files only)
- Granular access control for shared files

### Phase 3: Authentication & Security

#### Step 1: Verify RLS Policies
Run this query to verify all policies are active:

```sql
-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Expected Result**: 15+ policies across all tables

#### Step 2: Test Security Policies
Create a test user and verify security:

```sql
-- Test user creation (this will trigger profile creation)
-- This happens automatically when users sign up
-- The trigger function handle_new_user() creates profiles
```

### Phase 4: Performance Optimization

#### Step 1: Verify Indexes
Run this query to check index creation:

```sql
-- Check indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

**Expected Result**: 20+ indexes for optimal query performance

#### Step 2: Analyze Query Performance
Test a sample query:

```sql
-- Test query performance
EXPLAIN (ANALYZE, BUFFERS) 
SELECT d.*, p.username 
FROM documents d 
JOIN profiles p ON d.user_id = p.id 
WHERE d.visibility = 'public' 
ORDER BY d.created_at DESC 
LIMIT 10;
```

## 🔒 Security Features Implemented

### Row Level Security (RLS)
- **Profiles**: Users can only access their own profile
- **Documents**: Users can only access their own files + public files + shared files
- **File Shares**: Granular permission control (read/write/admin)
- **Sessions**: Users can only manage their own sessions

### Data Validation
- **Username**: 3-30 characters, alphanumeric + underscore + hyphen
- **Email**: Valid email format validation
- **File Size**: Positive values with 1GB limit
- **File Names**: 1-255 characters
- **Bio Length**: Maximum 500 characters

### Access Control
- **Public Files**: Accessible to all authenticated users
- **Private Files**: Only accessible to file owner
- **Shared Files**: Accessible based on share permissions
- **Expiring Shares**: Automatic cleanup of expired shares

## 📊 Database Architecture

### Core Tables
1. **profiles**: User account information and status
2. **documents**: File metadata and storage information
3. **file_shares**: Granular file sharing with permissions
4. **user_sessions**: Session tracking and management

### Key Features
- **UUID Primary Keys**: Secure, non-sequential identifiers
- **Referential Integrity**: Proper foreign key constraints
- **Audit Trails**: Created/updated timestamps on all tables
- **Soft Deletes**: Status-based deletion (active/suspended/deleted)
- **JSONB Metadata**: Flexible storage for additional file information

## 🧪 Testing the Setup

### Test 1: User Registration
1. Sign up a new user in your app
2. Verify profile is automatically created
3. Check database for new profile record

### Test 2: File Upload
1. Upload a test file
2. Verify document record is created
3. Check file permissions and visibility

### Test 3: File Sharing
1. Make a file public
2. Verify visibility changes
3. Test access from different user accounts

### Test 4: Security Policies
1. Try to access another user's private files
2. Verify access is denied
3. Test public file access

## 🔍 Monitoring & Maintenance

### Regular Maintenance Tasks
```sql
-- Clean up expired shares (run hourly)
SELECT cleanup_expired_shares();

-- Clean up expired sessions (run every 15 minutes)
SELECT cleanup_expired_sessions();

-- Monitor storage usage
SELECT 
    bucket_id,
    count(*) as file_count,
    sum(metadata->>'size')::bigint as total_size
FROM storage.objects 
GROUP BY bucket_id;
```

### Performance Monitoring
```sql
-- Check slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

## 🚨 Troubleshooting

### Common Issues

#### Issue: "Table doesn't exist" errors
**Solution**: Ensure the schema was executed completely. Check for any SQL errors in the execution log.

#### Issue: RLS policies not working
**Solution**: Verify RLS is enabled on all tables and policies are created correctly.

#### Issue: Storage access denied
**Solution**: Ensure storage policies are properly configured and bucket permissions are set.

#### Issue: Performance problems
**Solution**: Check that all indexes were created successfully and analyze query performance.

### Verification Queries
```sql
-- Check table existence
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check RLS status
SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Check policy count
SELECT COUNT(*) as policy_count FROM pg_policies WHERE schemaname = 'public';

-- Check index count
SELECT COUNT(*) as index_count FROM pg_indexes WHERE schemaname = 'public';
```

## ✅ Success Criteria

Your setup is complete when:
- ✅ All 4 tables are created with RLS enabled
- ✅ 15+ security policies are active
- ✅ 20+ performance indexes are created
- ✅ Storage bucket is configured with proper policies
- ✅ User registration creates profiles automatically
- ✅ File uploads work without errors
- ✅ Security policies block unauthorized access
- ✅ Public file sharing works correctly

## 🎉 Next Steps

After successful setup:
1. **Test the complete user flow** from signup to file sharing
2. **Monitor performance** using the provided queries
3. **Set up automated maintenance** for cleanup tasks
4. **Implement additional features** like file versioning or advanced sharing

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all SQL executed successfully
3. Check Supabase logs for detailed error messages
4. Ensure your environment variables are correctly configured

---

**This setup provides a production-ready, enterprise-grade file sharing platform with comprehensive security, performance optimization, and scalability features.**
