#!/bin/bash

# CloudEZ Database Setup Script
# This script helps you set up your Supabase database with the production schema

echo "🚀 CloudEZ Database Setup"
echo "=========================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with your Supabase credentials first."
    exit 1
fi

# Load environment variables
source .env

# Check if Supabase credentials are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "❌ Error: Supabase credentials not found in .env file!"
    echo "Please make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set."
    exit 1
fi

echo "✅ Supabase credentials found"
echo ""

echo "📋 Next Steps to Complete Database Setup:"
echo "=========================================="
echo ""
echo "1. 📊 Go to your Supabase Dashboard:"
echo "   $NEXT_PUBLIC_SUPABASE_URL"
echo ""
echo "2. 🔑 Sign in with your Supabase account"
echo ""
echo "3. 📝 Navigate to SQL Editor in the left sidebar"
echo ""
echo "4. 📄 Copy the contents of database_schema_production.sql"
echo ""
echo "5. 🚀 Paste and run the SQL script in the SQL Editor"
echo ""
echo "6. 🗂️  Create Storage Bucket:"
echo "    - Go to Storage in the left sidebar"
echo "    - Click 'Create a new bucket'"
echo "    - Name: 'documents'"
echo "    - Public: false"
echo "    - File size limit: 1GB"
echo ""
echo "7. 🔒 Set Storage Policies (run in SQL Editor):"
echo "    - Copy the storage policies from the bottom of database_schema_production.sql"
echo "    - Run them in the SQL Editor"
echo ""
echo "8. ✅ Verify Setup:"
echo "    - Check Tables section shows: profiles, documents, file_shares, user_sessions"
echo "    - Check Storage section shows: documents bucket"
echo "    - Check Authentication > Policies shows RLS enabled"
echo ""
echo "🎯 After completing these steps, your database will be ready!"
echo ""
echo "💡 Tip: You can also use the Supabase CLI for automated setup:"
echo "   npm install -g supabase"
echo "   supabase login"
echo "   supabase db push"
echo ""

# Check if Supabase CLI is installed
if command -v supabase &> /dev/null; then
    echo "✅ Supabase CLI is installed"
    echo "Would you like to try automated setup? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "🚀 Attempting automated setup..."
        supabase db push
    fi
else
    echo "💡 Install Supabase CLI for automated setup:"
    echo "   npm install -g supabase"
fi

echo ""
echo "🎉 Setup script completed! Follow the manual steps above to finish database setup."
