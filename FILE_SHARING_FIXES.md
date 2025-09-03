# File Sharing Fixes - CloudEZ

## Issues Identified and Fixed

### 1. Database Query Issues in `getSharedDocuments()`

**Problem**: The original query had problematic date filtering that could exclude valid shares.

**Fix**: Simplified the query to remove complex date filtering and focus on basic functionality first.

**Location**: `src/lib/database.service.ts` - `getSharedDocuments()` function

**Before**:
```typescript
.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
```

**After**:
```typescript
// Test basic query without date filtering
const { data: basicShares, error: basicError } = await sb
  .from('file_shares')
  .select('document_id, shared_by, shared_with, created_at, expires_at')
  .eq('shared_with', user.id)
```

### 2. Share Creation Logic Issues

**Problem**: The original share creation used `upsert` with `ignoreDuplicates: false` which could cause conflicts.

**Fix**: Changed to use `insert` with proper duplicate checking before creation.

**Location**: `src/components/FileManager.tsx` - `shareFile()` function

**Before**:
```typescript
const { error } = await (sb as any)
  .from('file_shares')
  .upsert(sharePayload, { onConflict: 'document_id,shared_with', ignoreDuplicates: false })
```

**After**:
```typescript
// First check if share already exists
const { data: existingShare, error: checkError } = await (sb as any)
  .from('file_shares')
  .select('id')
  .eq('document_id', file.id)
  .eq('shared_with', recipientId)
  .single()

if (existingShare) {
  toast.info(`File "${file.name}" is already shared with ${usernameRaw}`)
  return
}

// Create new share
const { error } = await (sb as any)
  .from('file_shares')
  .insert(sharePayload)
```

### 3. Enhanced Debugging and Testing

**Added**: Comprehensive debugging tools to help identify issues:

- **Manual Refresh Button**: Allows manual refresh of shared files
- **Test Share Button**: Tests basic share creation functionality
- **Test DB Service Share Button**: Tests the database service share creation
- **Check DB Health Button**: Verifies database connectivity and table structure

**Location**: Debug section in `FileManager.tsx` when viewing shared files

### 4. Database Health Check Functions

**Added**: New functions to verify database health:

- `checkTables()`: Verifies all required tables exist and are accessible
- `checkFileSharesStructure()`: Checks the structure of the file_shares table

**Location**: `src/lib/database.service.ts` - `databaseHealthCheck` object

### 5. Test Function for Share Creation

**Added**: `testCreateShare()` function for debugging share creation issues.

**Location**: `src/lib/database.service.ts` - `fileShareService` object

## How to Test the Fixes

### 1. Start the Development Server

```bash
npm run dev
```

### 2. Navigate to Dashboard

1. Go to `http://localhost:3000/dashboard`
2. Sign in with your account
3. Click on the "Shared with me" tab

### 3. Use Debug Tools

The debug section provides several buttons to test functionality:

- **Manual Refresh**: Refreshes the shared files list
- **Test Share**: Tests basic share creation (should fail for self-sharing)
- **Test DB Service Share**: Tests share creation through the database service
- **Check DB Health**: Verifies database connectivity

### 4. Test File Sharing

1. Go back to "My Files" tab
2. Upload a test file
3. Click the share button on the file
4. Enter another user's username or email
5. Check if the share is created successfully

## Expected Behavior

### Before Fixes
- File sharing would fail silently or with unclear errors
- Shared files might not appear in the "Shared with me" tab
- Database queries might fail due to complex date filtering

### After Fixes
- File sharing should work reliably
- Shared files should appear in the "Shared with me" tab
- Clear error messages for any issues
- Debug tools to help identify remaining problems

## Database Schema Requirements

Ensure your Supabase database has the following tables with proper RLS policies:

1. **profiles** - User profiles
2. **documents** - File metadata
3. **file_shares** - File sharing relationships
4. **user_sessions** - User sessions

The `file_shares` table should have these columns:
- `id` (UUID, primary key)
- `document_id` (UUID, references documents.id)
- `shared_by` (UUID, references auth.users.id)
- `shared_with` (UUID, references auth.users.id)
- `permission_level` (TEXT, 'read', 'write', or 'admin')
- `expires_at` (TIMESTAMP WITH TIME ZONE, nullable)
- `created_at` (TIMESTAMP WITH TIME ZONE)

## Troubleshooting

If file sharing still doesn't work:

1. **Check Browser Console**: Look for error messages and debug logs
2. **Use Debug Buttons**: The debug section provides tools to test each component
3. **Verify Database**: Use the "Check DB Health" button to verify connectivity
4. **Check RLS Policies**: Ensure Row Level Security policies allow file sharing
5. **Verify User Authentication**: Make sure users are properly authenticated

## Next Steps

1. Test the fixes with real user accounts
2. Monitor the browser console for any remaining errors
3. Use the debug tools to identify any additional issues
4. Remove debug sections once functionality is confirmed working
5. Add proper error handling and user feedback for production use
