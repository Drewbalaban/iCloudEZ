#!/bin/bash

# CloudEZ Development Server Starter
# This script starts the Next.js development server

echo "🚀 Starting CloudEZ Development Server..."
echo "📍 Project: CloudEZ - Your Personal iCloud"
echo "🌐 URL: http://localhost:3000"
echo ""

# Change to the project root directory (parent of scripts folder)
cd "$(dirname "$0")/.."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found!"
    echo "Please run this script from the cloudez project directory."
    echo ""
    echo "Current directory: $(pwd)"
    echo "Expected location: /path/to/CloudEZ/cloudez/"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local not found!"
    echo "Please create this file with your Supabase credentials:"
    echo ""
    echo "NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url"
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key"
    echo "SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key"
    echo "NEXT_PUBLIC_APP_URL=http://localhost:3000"
    echo ""
    echo "You can still run the server, but authentication won't work."
    echo ""
fi

echo "✅ Starting development server..."
echo "🔄 Server will be available at: http://localhost:3000"
echo "⏹️  Press Ctrl+C to stop the server"
echo ""

# Start the development server
npm run dev
