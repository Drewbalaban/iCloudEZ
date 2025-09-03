# CloudEZ - Your Personal iCloud

A secure, private cloud storage platform built with Next.js, Supabase, and Vercel. CloudEZ gives you complete control over your data with enterprise-grade security and privacy.

## 🚀 Features

- **🔐 Secure Authentication** - Supabase Auth with email/password
- **🛡️ End-to-End Security** - Encrypted file storage and transmission
- **☁️ Cloud Storage** - Supabase Storage for reliable file management
- **📱 Modern UI** - Responsive design with dark mode support
- **🔍 Smart Search** - Find your documents quickly
- **📁 Folder Organization** - Organize files in a familiar structure
- **🌐 Global CDN** - Vercel edge network for fast global access
- **🔒 Privacy First** - No data mining, no ads, no third-party access

## 🏗️ Tech Stack

- **Frontend**: Next.js 14+ with App Router
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL (via Supabase)
- **Storage**: Supabase Storage
- **Deployment**: Vercel
- **Icons**: Lucide React
- **Language**: TypeScript

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Vercel account (for deployment)

## 🛠️ Setup Instructions

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd cloudez
npm install
```

### 2. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Get your project URL and anon key from Settings > API
3. Create a new storage bucket called `documents`
4. Set up Row Level Security (RLS) policies

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Supabase Service Role Key (for server-side operations)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Database Setup

Run these SQL commands in your Supabase SQL editor:

```sql
-- Create documents table
CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_public BOOLEAN DEFAULT FALSE,
  share_token TEXT UNIQUE
);

-- Create folders table
CREATE TABLE folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for documents
CREATE POLICY "Users can view their own documents" ON documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents" ON documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" ON documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" ON documents
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for folders
CREATE POLICY "Users can view their own folders" ON folders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own folders" ON folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders" ON folders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders" ON folders
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_folder_id ON documents(folder_id);
CREATE INDEX idx_folders_user_id ON folders(user_id);
CREATE INDEX idx_folders_parent_id ON folders(parent_id);
```

### 5. Storage Policies

In your Supabase dashboard, go to Storage > Policies and add these policies for the `documents` bucket:

```sql
-- Allow users to upload files
CREATE POLICY "Users can upload files" ON storage.objects
  FOR INSERT WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to view their files
CREATE POLICY "Users can view their files" ON storage.objects
  FOR SELECT USING (auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to update their files
CREATE POLICY "Users can update their files" ON storage.objects
  FOR UPDATE USING (auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their files
CREATE POLICY "Users can delete their files" ON storage.objects
  FOR DELETE USING (auth.uid()::text = (storage.foldername(name))[1]);
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🚀 Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add your environment variables in Vercel dashboard
4. Deploy!

### Environment Variables for Production

Make sure to update your environment variables in Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_supabase_service_role_key
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

## 🔒 Security Features

- **Row Level Security (RLS)** - Database-level access control
- **Encrypted Storage** - Files encrypted at rest
- **Secure Authentication** - Supabase Auth with session management
- **CORS Protection** - Configured for your domains only
- **Rate Limiting** - Built-in protection against abuse

## 📱 Usage

1. **Sign Up** - Create your account with email and password
2. **Upload Files** - Drag and drop or click to upload documents
3. **Organize** - Create folders and organize your files
4. **Search** - Find files quickly with the search feature
5. **Access Anywhere** - Your files are available on any device

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues:

1. Check the [Issues](https://github.com/yourusername/cloudez/issues) page
2. Create a new issue with detailed information
3. Check the Supabase documentation for authentication/storage issues

## 🔮 Roadmap

- [ ] File sharing with expiring links
- [ ] Collaborative folders
- [ ] Mobile app
- [ ] Advanced search with OCR
- [ ] File versioning
- [ ] Backup and sync
- [ ] API for third-party integrations

---

Built with ❤️ using Next.js, Supabase, and Vercel
