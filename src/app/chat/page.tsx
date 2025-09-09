'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
  MessageCircle, 
  Send, 
  Users, 
  Plus, 
  Search,
  MoreVertical,
  ArrowLeft,
  Cloud,
  Smile,
  Paperclip,
  User,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'
import EmojiPicker from 'emoji-picker-react'

interface Conversation {
  id: string
  name: string
  type: 'direct' | 'group'
  last_message?: {
    content: string
    created_at: string
    sender: {
      username: string
    }
  }
  participants: Array<{
    id: string
    username: string
    avatar_url?: string
  }>
  unread_count?: number
}

interface Message {
  id: string
  content: string
  created_at: string
  message_type: 'text' | 'image' | 'file'
  sender: {
    id: string
    username: string
    avatar_url?: string
  }
  reply_to?: {
    id: string
    content: string
    sender: {
      username: string
    }
  }
}

interface Friend {
  id: string
  username: string
  avatar_url?: string
}

export default function ChatPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [friends, setFriends] = useState<Friend[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'chats' | 'friends'>('chats')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/auth/signin')
    }
  }, [user, router])

  // Load conversations
  useEffect(() => {
    if (!user) return
    
    const loadConversations = async () => {
      try {
        const response = await fetch('/api/chat/conversations')
        if (response.ok) {
          const data = await response.json()
          setConversations(data.conversations || [])
        }
      } catch (error) {
        console.error('Error loading conversations:', error)
        toast.error('Failed to load conversations')
      } finally {
        setLoading(false)
      }
    }

    loadConversations()
  }, [user])

  // Load friends
  useEffect(() => {
    if (!user) return

    const loadFriends = async () => {
      try {
        const response = await fetch('/api/friends/list')
        if (response.ok) {
          const data = await response.json()
          setFriends(data.friends || [])
        }
      } catch (error) {
        console.error('Error loading friends:', error)
      }
    }

    loadFriends()
  }, [user])

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedConversation) return

    const loadMessages = async () => {
      try {
        const response = await fetch(`/api/chat/messages?conversationId=${selectedConversation.id}`)
        if (response.ok) {
          const data = await response.json()
          setMessages(data.messages || [])
        }
      } catch (error) {
        console.error('Error loading messages:', error)
        toast.error('Failed to load messages')
      }
    }

    loadMessages()
  }, [selectedConversation])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          content: newMessage.trim(),
          messageType: 'text'
        })
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(prev => [...prev, data.message])
        setNewMessage('')
        
        // Update conversation with new last message
        setConversations(prev => prev.map(conv => 
          conv.id === selectedConversation.id 
            ? { ...conv, last_message: data.message }
            : conv
        ))
      } else {
        toast.error('Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    }
  }

  const startNewChat = async (friendId: string) => {
    try {
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          friendId,
          type: 'direct'
        })
      })

      if (response.ok) {
        const data = await response.json()
        const newConversation = data.conversation
        
        // Add to conversations list
        setConversations(prev => [newConversation, ...prev])
        setSelectedConversation(newConversation)
        setActiveTab('chats') // Switch to chats tab
        toast.success('Chat started!')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to start chat')
      }
    } catch (error) {
      console.error('Error starting chat:', error)
      toast.error('Failed to start chat')
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  const getConversationName = (conversation: Conversation) => {
    if (conversation.type === 'group') {
      return conversation.name
    }
    
    // For direct messages, show the other participant's name
    const otherParticipant = conversation.participants.find(p => p.id !== user?.id)
    return otherParticipant?.username || 'Unknown User'
  }

  const getConversationAvatar = (conversation: Conversation) => {
    if (conversation.type === 'group') {
      return null // Group avatar placeholder
    }
    
    const otherParticipant = conversation.participants.find(p => p.id !== user?.id)
    return otherParticipant?.avatar_url
  }

  const onEmojiClick = (emojiObject: any) => {
    setNewMessage(prev => prev + emojiObject.emoji)
    setShowEmojiPicker(false)
  }

  // Single awesome gradient for all user messages
  const getCoolGradient = () => {
    // A really cool multi-color gradient inspired by modern UI trends
    return 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)'
  }

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showEmojiPicker) {
        const target = event.target as Element
        if (!target.closest('.emoji-picker-container') && !target.closest('[data-emoji-button]')) {
          setShowEmojiPicker(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showEmojiPicker])

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="flex items-center space-x-3 group">
                <div className="h-8 w-8 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center group-hover:opacity-90">
                  <Cloud className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-xl font-semibold text-slate-900 dark:text-white group-hover:opacity-90">iCloudEZ</h1>
              </Link>
              
              <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
                <MessageCircle className="h-5 w-5" />
                <span className="font-medium">Messages</span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Dashboard</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-full">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full" style={{ height: 'calc(100vh - 112px)' }}>
          {/* Left Sidebar - Chats & Friends */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Messages</h2>
              </div>
              
              {/* Tabs */}
              <div className="flex space-x-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('chats')}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'chats'
                      ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Chats
                </button>
                <button
                  onClick={() => setActiveTab('friends')}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'friends'
                      ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Friends
                </button>
              </div>
              
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={activeTab === 'chats' ? 'Search conversations...' : 'Search friends...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Content based on active tab */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'chats' ? (
                // Conversations List
                loading ? (
                  <div className="p-4 text-center text-slate-500">Loading conversations...</div>
                ) : conversations.length === 0 ? (
                  <div className="p-4 text-center text-slate-500">
                    <MessageCircle className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                    <p>No conversations yet</p>
                    <p className="text-sm">Start a chat with a friend!</p>
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {conversations
                      .filter(conv => 
                        getConversationName(conv).toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((conversation) => (
                      <button
                        key={conversation.id}
                        onClick={() => setSelectedConversation(conversation)}
                        className={`w-full p-3 rounded-lg text-left transition-colors ${
                          selectedConversation?.id === conversation.id
                            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            {getConversationAvatar(conversation) ? (
                              <Image
                                src={getConversationAvatar(conversation)!}
                                alt={getConversationName(conversation)}
                                width={40}
                                height={40}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 bg-slate-300 dark:bg-slate-600 rounded-full flex items-center justify-center">
                                <Users className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                {getConversationName(conversation)}
                              </p>
                              {conversation.last_message && (
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {formatTime(conversation.last_message.created_at)}
                                </p>
                              )}
                            </div>
                            
                            {conversation.last_message && (
                              <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                                {conversation.last_message.sender.username}: {conversation.last_message.content}
                              </p>
                            )}
                          </div>
                          
                          {conversation.unread_count && conversation.unread_count > 0 && (
                            <div className="flex-shrink-0">
                              <span className="inline-flex items-center justify-center h-5 w-5 bg-blue-600 text-white text-xs font-medium rounded-full">
                                {conversation.unread_count}
                              </span>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )
              ) : (
                // Friends List
                <div className="space-y-1 p-2">
                  {friends
                    .filter(friend => 
                      friend.username.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((friend) => (
                    <button
                      key={friend.id}
                      onClick={() => startNewChat(friend.id)}
                      className="w-full p-3 rounded-lg text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          {friend.avatar_url ? (
                            <Image
                              src={friend.avatar_url}
                              alt={friend.username}
                              width={40}
                              height={40}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 bg-slate-300 dark:bg-slate-600 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                            {friend.username}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Click to start chatting
                          </p>
                        </div>
                        
                        <div className="flex-shrink-0">
                          <MessageCircle className="h-4 w-4 text-slate-400" />
                        </div>
                      </div>
                    </button>
                  ))}
                  
                  {friends.length === 0 && (
                    <div className="p-4 text-center text-slate-500">
                      <Users className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                      <p>No friends yet</p>
                      <p className="text-sm">Add friends to start chatting!</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col min-h-0">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getConversationAvatar(selectedConversation) ? (
                        <Image
                          src={getConversationAvatar(selectedConversation)!}
                          alt={getConversationName(selectedConversation)}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 bg-slate-300 dark:bg-slate-600 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                          {getConversationName(selectedConversation)}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {selectedConversation.type === 'direct' ? 'Direct message' : 'Group chat'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                  {messages.length === 0 ? (
                    <div className="text-center text-slate-500 py-8">
                      <MessageCircle className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                      <p>No messages yet</p>
                      <p className="text-sm">Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender.id === user.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex space-x-2 max-w-xs lg:max-w-md ${message.sender.id === user.id ? 'flex-row-reverse space-x-reverse' : ''}`}>
                          {message.sender.id !== user.id && (
                            <div className="flex-shrink-0">
                              {message.sender.avatar_url ? (
                                <Image
                                  src={message.sender.avatar_url}
                                  alt={message.sender.username}
                                  width={32}
                                  height={32}
                                  className="h-8 w-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-8 w-8 bg-slate-300 dark:bg-slate-600 rounded-full flex items-center justify-center">
                                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                    {message.sender.username.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div 
                            className={`px-4 py-2 rounded-lg text-white ${
                              message.sender.id === user.id
                                ? 'text-white shadow-lg shadow-black/20'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                            }`}
                            style={message.sender.id === user.id ? {
                              background: getCoolGradient(),
                              backgroundAttachment: 'fixed',
                              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
                            } : {}}
                          >
                            {message.sender.id !== user.id && (
                              <p className="text-xs font-medium mb-1 opacity-70">
                                {message.sender.username}
                              </p>
                            )}
                            <p className="text-sm">{message.content}</p>
                            <p className={`text-xs mt-1 ${
                              message.sender.id === user.id ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'
                            }`}>
                              {formatTime(message.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 relative">
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                      <Paperclip className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      data-emoji-button
                    >
                      <Smile className="h-5 w-5" />
                    </button>
                    
                    <div className="flex-1">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Type a message..."
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                  
                  {/* Emoji Picker */}
                  {showEmojiPicker && (
                    <div className="absolute bottom-16 left-4 z-50 emoji-picker-container">
                      <EmojiPicker
                        onEmojiClick={onEmojiClick}
                        width={350}
                        height={400}
                        searchDisabled={false}
                        skinTonesDisabled={false}
                        previewConfig={{
                          showPreview: true
                        }}
                        theme="auto"
                      />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-slate-500">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                  <p className="text-sm">Choose a conversation from the sidebar or start a new chat with a friend</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}