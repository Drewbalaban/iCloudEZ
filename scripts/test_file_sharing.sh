#!/bin/bash

# CloudEZ File Sharing Test Script
# This script tests the database connection and file sharing functionality

echo "🧪 Testing CloudEZ File Sharing Functionality..."
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

# Check Supabase credentials
echo "🔍 Checking Supabase configuration..."
SUPABASE_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" .env.local | cut -d '=' -f2)
SUPABASE_KEY=$(grep "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local | cut -d '=' -f2)

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    echo "❌ Error: Supabase credentials not found in .env.local"
    exit 1
fi

echo "✅ Supabase URL: ${SUPABASE_URL:0:50}..."
echo "✅ Supabase Key: ${SUPABASE_KEY:0:20}..."
echo ""

# Test database connection
echo "🔍 Testing database connection..."
curl -s -o /dev/null -w "%{http_code}" "$SUPABASE_URL/rest/v1/" > /tmp/status_code

if [ "$(cat /tmp/status_code)" = "401" ]; then
    echo "✅ Database connection successful (401 expected for unauthenticated access)"
else
    echo "❌ Database connection failed or unexpected response: $(cat /tmp/status_code)"
fi

echo ""

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

echo "✅ Dependencies ready"
echo ""

# Start the development server for testing
echo "🚀 Starting development server for testing..."
echo "📍 Server will be available at: http://localhost:3000"
echo "🔍 Open the dashboard and navigate to 'Shared with me' tab"
echo "🧪 Use the debug buttons to test file sharing functionality"
echo ""
echo "⏹️  Press Ctrl+C to stop the server when done testing"
echo ""

npm run dev
