// Debug script for encryption functionality
// Run this in the browser console on the chat page

async function debugEncryption() {
  console.log('🔍 Debugging encryption functionality...')
  
  try {
    // Test 1: Check if Web Crypto API is available
    console.log('1. Web Crypto API Support:')
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      console.log('   ✅ Web Crypto API is available')
    } else {
      console.log('   ❌ Web Crypto API is not available')
      return
    }
    
    // Test 2: Check conversations API
    console.log('2. Conversations API:')
    const conversationsResponse = await fetch('/api/chat/conversations')
    if (conversationsResponse.ok) {
      const { conversations } = await conversationsResponse.json()
      console.log('   ✅ Conversations API working')
      console.log('   📊 Found', conversations.length, 'conversations')
      
      if (conversations.length > 0) {
        const firstConv = conversations[0]
        console.log('   📋 First conversation:', {
          id: firstConv.id,
          name: firstConv.name,
          participants: firstConv.participants?.length || 0
        })
      }
    } else {
      console.log('   ❌ Conversations API failed:', conversationsResponse.status)
    }
    
    // Test 3: Check encryption API
    console.log('3. Encryption API:')
    const encryptionResponse = await fetch('/api/chat/encryption?conversationId=test&action=status')
    console.log('   📊 Encryption API response:', encryptionResponse.status)
    
    // Test 4: Check if encryption components are loaded
    console.log('4. Encryption Components:')
    const shieldIcon = document.querySelector('[title*="encryption"]')
    if (shieldIcon) {
      console.log('   ✅ Encryption status component found')
    } else {
      console.log('   ❌ Encryption status component not found')
    }
    
    // Test 5: Check for any console errors
    console.log('5. Console Errors:')
    console.log('   Check the console above for any error messages')
    
  } catch (error) {
    console.error('❌ Debug error:', error)
  }
}

// Run the debug
debugEncryption()
