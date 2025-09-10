// Simple test script to verify message sending works
// Run this in the browser console on the chat page

async function testMessageSending() {
  console.log('🧪 Testing message sending...')
  
  try {
    // Test 1: Check if the API endpoint is accessible
    const response = await fetch('/api/chat/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationId: 'test-conversation-id',
        content: 'Test message',
        messageType: 'text'
      })
    })
    
    console.log('API Response Status:', response.status)
    const responseText = await response.text()
    console.log('API Response:', responseText)
    
    if (response.status === 401) {
      console.log('✅ API is working (unauthorized as expected - need to be logged in)')
    } else if (response.status === 400) {
      console.log('✅ API is working (bad request as expected - invalid conversation ID)')
    } else {
      console.log('❌ Unexpected response:', response.status)
    }
    
  } catch (error) {
    console.error('❌ Error testing message sending:', error)
  }
  
  // Test 2: Check if encryption services are available
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      console.log('✅ Web Crypto API is available')
    } else {
      console.log('❌ Web Crypto API is not available')
    }
  } catch (error) {
    console.log('❌ Error checking Web Crypto API:', error)
  }
  
  // Test 3: Check if the chat page components are loaded
  try {
    const chatInput = document.querySelector('input[placeholder*="message"]')
    if (chatInput) {
      console.log('✅ Chat input found')
    } else {
      console.log('❌ Chat input not found')
    }
  } catch (error) {
    console.log('❌ Error checking chat input:', error)
  }
}

// Run the test
testMessageSending()
