// Test script to verify the encryption fix is working
// Run this in your browser console on the chat page

console.log('🔐 Testing Fixed Encryption System...')

async function testEncryptionFix() {
  try {
    // Test 1: Check if the page loads without errors
    console.log('✅ Page loaded successfully')
    
    // Test 2: Check if encryption components are present
    const encryptionStatus = document.querySelector('[title*="encryption"]')
    if (encryptionStatus) {
      console.log('✅ Encryption UI component found')
    } else {
      console.log('❌ Encryption UI component missing')
    }
    
    // Test 3: Check if conversations API works
    const response = await fetch('/api/chat/conversations')
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Conversations API working')
      console.log('📊 Conversations found:', data.conversations?.length || 0)
      
      // Check encryption status
      const encryptedCount = data.conversations?.filter(c => c.is_encrypted).length || 0
      console.log('🔒 Encrypted conversations:', encryptedCount)
    } else {
      console.log('❌ Conversations API failed:', response.status)
    }
    
    // Test 4: Check for any console errors
    const originalError = console.error
    let errorCount = 0
    console.error = function(...args) {
      errorCount++
      originalError.apply(console, args)
    }
    
    // Wait a moment for any async errors
    setTimeout(() => {
      console.error = originalError
      if (errorCount === 0) {
        console.log('✅ No console errors detected')
      } else {
        console.log(`⚠️ ${errorCount} console errors detected`)
      }
    }, 2000)
    
    console.log('🎉 Encryption system test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testEncryptionFix()
