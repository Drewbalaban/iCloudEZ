# Download Debug Guide - CloudEZ

## Current Issue
The download is failing with "download failed" error. Let's debug this step by step.

## Debug Steps

### 1. Check Browser Console
Open your browser's Developer Tools (F12) and go to the Console tab. Look for:
- 🔍 FileManager: logs
- 🔍 Download API: logs
- Any error messages

### 2. Check Network Tab
In Developer Tools, go to the Network tab and:
1. Try to download a shared file
2. Look for the API call to `/api/download/[fileId]`
3. Check the response status and body

### 3. Check Server Logs
In the terminal where you're running `npm run dev`, look for:
- 🔍 Download API: logs
- Any error messages

### 4. Test the Debug Buttons
In the "Shared with me" tab, use these debug buttons:

#### Test Download Button
- Tests the download functionality
- Shows detailed logs in console

#### Test Storage Access Button  
- Tests if the storage bucket is accessible
- Shows if the issue is with storage permissions

#### Check DB Health Button
- Verifies database connectivity
- Checks if all tables are accessible

## Expected Logs

### Frontend (Browser Console)
```
🔍 FileManager: Using API endpoint for shared file download
🔍 FileManager: File ID: [uuid]
🔍 FileManager: File path: [path]
🔍 FileManager: API response status: 200
🔍 FileManager: API call successful, getting blob...
🔍 FileManager: Blob size: [size] bytes
```

### Backend (Terminal)
```
🔍 Download API: Starting download request for document: [uuid]
🔍 Download API: User authenticated: [user-id]
🔍 Download API: Document found: [filename] Owner: [owner-id]
🔍 Download API: Document is shared with user
🔍 Download API: Creating signed URL for file path: [path]
🔍 Download API: Signed URL created successfully, redirecting...
```

## Common Issues & Solutions

### Issue 1: API Endpoint Not Found (404)
**Symptoms**: Network tab shows 404 for `/api/download/[id]`
**Solution**: Check if the API route file exists at `src/app/api/download/[id]/route.ts`

### Issue 2: Authentication Failed (401)
**Symptoms**: Network tab shows 401 for `/api/download/[id]`
**Solution**: Check if user is properly signed in

### Issue 3: Access Denied (403)
**Symptoms**: Network tab shows 403 for `/api/download/[id]`
**Solution**: Check if the file is properly shared with the user

### Issue 4: Document Not Found (404)
**Symptoms**: Backend logs show "Document not found"
**Solution**: Check if the document ID is correct and exists in database

### Issue 5: Storage Access Failed (500)
**Symptoms**: Backend logs show "Failed to generate download link"
**Solution**: Check Supabase storage bucket permissions and file paths

## Quick Tests

### Test 1: API Endpoint Accessibility
```bash
curl -v http://localhost:3000/api/download/test-id
# Should return 401 Unauthorized (not 404 Not Found)
```

### Test 2: Database Health
Use the "Check DB Health" button in the debug section

### Test 3: Storage Access
Use the "Test Storage Access" button in the debug section

## Next Steps

1. **Run the debug tests** using the buttons in the "Shared with me" tab
2. **Check the console logs** for detailed error information
3. **Check the network tab** for failed API requests
4. **Check the server logs** for backend errors
5. **Report the specific error messages** you see

## What to Report

When reporting the issue, include:
- Browser console logs
- Network tab response
- Server terminal logs
- Specific error messages
- Steps to reproduce

This will help identify exactly where the download is failing.
