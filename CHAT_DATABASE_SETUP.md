# Chat System Database Setup

## Overview
The CloudEZ chat system works in two modes:

1. **Demo Mode** (Works immediately): Uses Supabase Broadcast for real-time messaging without database tables
2. **Full Mode** (Optional): Uses database tables for persistent messages, read receipts, and advanced features

**Good news**: You can start chatting right away! The system automatically falls back to demo mode if database tables aren't set up.

## Real-time Chat Options

### ✅ Option 1: Demo Mode (Works Now!)
**No setup required!** The chat system automatically uses Supabase Broadcast for real-time messaging:
- ✅ Real-time messaging works immediately
- ✅ Messages appear instantly between users
- ✅ Works without any database setup
- ⚠️ Messages are not persistent (lost on page refresh)
- ⚠️ No message history or read receipts

### 🚀 Option 2: Full Database Mode (Optional)
For persistent messages and advanced features:

## Database Setup (Optional)
1. **Go to your Supabase Dashboard**
   - Navigate to your project dashboard
   - URL: `https://supabase.com/dashboard/project/[your-project-id]`

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the Chat Schema**
   - Copy the entire contents of `database_schema_chat.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute the schema

4. **Enable Realtime (Optional)**
   - Go to "Database" → "Replication"
   - Enable realtime for these tables:
     - `conversations`
     - `messages`
     - `message_reactions`
     - `user_presence`
     - `conversation_participants`

### Option 2: Using Supabase CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref [your-project-id]

# Push the schema
supabase db push
```

## What Gets Created

The chat schema creates these tables:
- `conversations` - Chat conversations (direct messages and group chats)
- `conversation_participants` - Who can participate in each conversation
- `messages` - Individual messages with support for text, files, and images
- `message_reactions` - Emoji reactions on messages
- `message_read_receipts` - Read status tracking
- `user_presence` - Online status and typing indicators
- `chat_settings` - User preferences for chat

## Features Enabled

After setup, you'll have:
- ✅ Real-time messaging
- ✅ File and image sharing
- ✅ Emoji reactions
- ✅ Read receipts
- ✅ Typing indicators
- ✅ Group chats
- ✅ Direct messages
- ✅ Message editing and deletion
- ✅ User presence status

## Verification

After running the schema, you can verify it worked by:
1. Going to "Database" → "Tables" in Supabase
2. You should see the new chat tables listed
3. Visit `/chat` in your app - it should show "Chat System Ready" instead of errors

## Troubleshooting

### Error: "relation 'conversations' does not exist"
- The chat schema hasn't been applied yet
- Follow the setup steps above

### Error: "Unauthorized"
- Make sure you're signed in to the app
- Check that your Supabase authentication is working

### No conversations showing
- This is normal if you haven't created any conversations yet
- Add friends first, then start conversations

## Next Steps

1. **Add Friends**: Use the friends system to connect with other users
2. **Start Conversations**: Click "New Conversation" to start chatting
3. **Test Features**: Try sending messages, files, and emoji reactions
4. **Customize**: Adjust chat settings in your profile

The chat system is now ready to use! 🎉
