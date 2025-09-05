#!/bin/bash

# Test script for the download API endpoint

echo "🧪 Testing Download API Endpoint..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found!"
    echo "Please run this script from the cloudez project directory."
    exit 1
fi

echo "✅ Project directory confirmed"
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ Error: .env.local not found!"
    echo "Please create this file with your Supabase credentials."
    exit 1
fi

echo "✅ Environment file found"
echo ""

# Check if server is running
echo "🔍 Checking if server is running..."
if curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo "✅ Server is running on http://localhost:3001"
elif curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Server is running on http://localhost:3000"
else
    echo "❌ Server is not running on localhost:3000 or localhost:3001"
    echo "Please start the server with: npm run dev"
    exit 1
fi

echo ""
echo "🧪 Testing download API endpoint..."
echo ""

# Test the download endpoint (this will fail without authentication, but we can see the response)
echo "Testing: GET http://localhost:3001/api/download/test-document-id"
echo "Expected: 401 Unauthorized (without authentication)"
echo ""

response=$(curl -s -w "HTTP_STATUS:%{http_code}" http://localhost:3001/api/download/test-document-id)
http_status=$(echo "$response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
response_body=$(echo "$response" | sed 's/HTTP_STATUS:[0-9]*//')

echo "Response Status: $http_status"
echo "Response Body: $response_body"
echo ""

if [ "$http_status" = "401" ]; then
    echo "✅ API endpoint is working (401 expected without authentication)"
else
    echo "❌ Unexpected response from API endpoint"
fi

echo ""
echo "📋 Next steps:"
echo "1. Open your browser and go to http://localhost:3001/dashboard"
echo "2. Sign in and navigate to 'Shared with me' tab"
echo "3. Try to download a shared file"
echo "4. Check the browser console for detailed logs"
echo "5. Check the terminal where npm run dev is running for server logs"
echo ""
echo "🔍 The logs will show exactly where the download is failing"
