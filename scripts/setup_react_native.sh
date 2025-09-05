#!/bin/bash

# CloudEZ React Native iOS Setup Script
echo "🚀 Setting up CloudEZ React Native iOS project..."
echo "=================================================="
echo ""

# Check if React Native CLI is installed
if ! command -v react-native &> /dev/null; then
    echo "📦 Installing React Native CLI..."
    npm install -g @react-native-community/cli
    echo "✅ React Native CLI installed"
else
    echo "✅ React Native CLI already installed"
fi

echo ""

# Create React Native project
echo "🏗️ Creating React Native project..."
echo "Project name: CloudEZMobile"
echo "Template: TypeScript"
echo ""

# Check if project directory already exists
if [ -d "CloudEZMobile" ]; then
    echo "⚠️  CloudEZMobile directory already exists!"
    echo "Do you want to remove it and create a new one? (y/n)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo "🗑️  Removing existing directory..."
        rm -rf CloudEZMobile
    else
        echo "❌ Setup cancelled. Please remove CloudEZMobile directory manually."
        exit 1
    fi
fi

# Create the project
npx react-native init CloudEZMobile --template react-native-template-typescript

if [ $? -eq 0 ]; then
    echo "✅ React Native project created successfully!"
else
    echo "❌ Failed to create React Native project"
    exit 1
fi

echo ""

# Navigate to project directory
cd CloudEZMobile

echo "📱 Installing iOS dependencies..."
echo "This may take a few minutes..."

# Install iOS dependencies
cd ios && pod install && cd ..

if [ $? -eq 0 ]; then
    echo "✅ iOS dependencies installed successfully!"
else
    echo "❌ Failed to install iOS dependencies"
    echo "You may need to run 'cd ios && pod install' manually"
fi

echo ""

# Install additional dependencies for CloudEZ
echo "📦 Installing CloudEZ-specific dependencies..."

npm install @supabase/supabase-js \
    react-native-vector-icons \
    react-native-fs \
    react-native-background-upload \
    react-native-push-notification \
    react-native-background-fetch \
    @react-native-async-storage/async-storage \
    react-native-image-picker \
    react-native-gesture-handler \
    react-native-reanimated \
    react-native-safe-area-context \
    react-native-screens \
    @react-navigation/native \
    @react-navigation/stack \
    @react-navigation/bottom-tabs

echo "✅ Dependencies installed!"

echo ""

# Create project structure
echo "📁 Creating project structure..."

mkdir -p src/{components,contexts,lib,screens,navigation,types,utils}

# Create basic files
cat > src/types/index.ts << 'EOF'
export interface User {
  id: string
  email: string
  created_at: string
}

export interface FileItem {
  id: string
  name: string
  file_path: string
  file_size: number
  mime_type: string
  file_type: string
  folder: string
  created_at: string
  url: string
}

export interface SyncStatus {
  isConnected: boolean
  hasFileWatcher: boolean
  deviceType: 'mobile' | 'desktop' | 'unknown'
}
EOF

cat > src/lib/supabase.ts << 'EOF'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'your_supabase_url'
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your_supabase_anon_key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
EOF

cat > src/contexts/AuthContext.tsx << 'EOF'
import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { User } from '../types'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check current user
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          created_at: session.user.created_at
        })
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email!,
            created_at: session.user.created_at
          })
        } else {
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
EOF

echo "✅ Project structure created!"

echo ""

# Create environment file template
echo "🔧 Creating environment file template..."

cat > .env.example << 'EOF'
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# iOS Configuration
IOS_BUNDLE_IDENTIFIER=com.yourcompany.cloudez
IOS_TEAM_ID=your_ios_team_id

# Android Configuration
ANDROID_PACKAGE_NAME=com.yourcompany.cloudez
ANDROID_APPLICATION_ID=com.yourcompany.cloudez
EOF

echo "✅ Environment file template created!"

echo ""

# Instructions
echo "🎉 Setup Complete! Here's what to do next:"
echo ""
echo "1. 📱 Test on iOS Simulator:"
echo "   cd CloudEZMobile"
echo "   npx react-native run-ios"
echo ""
echo "2. 🔧 Configure environment:"
echo "   cp .env.example .env"
echo "   # Edit .env with your Supabase credentials"
echo ""
echo "3. 📱 Test on device:"
echo "   npx react-native run-ios --device"
echo ""
echo "4. 🚀 Start developing:"
echo "   # Edit src/screens/HomeScreen.tsx"
echo "   # Add your CloudEZ components"
echo "   # Test real-time sync features"
echo ""
echo "5. 📚 Read the documentation:"
echo "   # Check REACT_NATIVE_IOS_PLAN.md for detailed plan"
echo "   # Visit React Native docs: https://reactnative.dev"
echo ""
echo "=================================================="
echo "🚀 Your CloudEZ iOS app is ready to build!"
echo "=================================================="
