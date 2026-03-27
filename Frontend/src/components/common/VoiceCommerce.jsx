import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Volume2, X, ShoppingCart, Search, Package, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useGlobal } from '../../contexts/GlobalContext'
import { useAuth } from '../../contexts/AuthContext'
import axios from 'axios'
import { toast } from 'react-toastify'

const VoiceCommerce = () => {
  const [isListening, setIsListening] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [recognition, setRecognition] = useState(null)
  const [isSupported, setIsSupported] = useState(true)
  const [conversationHistory, setConversationHistory] = useState([])

  const navigate = useNavigate()
  const { cartItems } = useGlobal()
  const cart = cartItems?.cart || []
  const { currentUser, token } = useAuth()

  // Initialize Web Speech API
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognitionInstance = new SpeechRecognition()
      
      recognitionInstance.continuous = false
      recognitionInstance.interimResults = true
      recognitionInstance.lang = 'en-US'

      recognitionInstance.onresult = (event) => {
        const current = event.resultIndex
        const transcriptText = event.results[current][0].transcript
        setTranscript(transcriptText)
        
        if (event.results[current].isFinal) {
          handleVoiceCommand(transcriptText)
        }
      }

      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
        if (event.error === 'not-allowed') {
          toast.error('Microphone access denied. Please enable it in browser settings.')
        }
      }

      recognitionInstance.onend = () => {
        setIsListening(false)
      }

      setRecognition(recognitionInstance)
    } else {
      setIsSupported(false)
    }
  }, [])

  // Text-to-speech response
  const speak = useCallback((text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1
      utterance.pitch = 1
      window.speechSynthesis.speak(utterance)
    }
  }, [])

  // Parse voice commands using NLP-like intent detection
  const parseIntent = (command) => {
    const lowerCommand = command.toLowerCase()
    
    // Search/Find products
    if (lowerCommand.includes('find') || lowerCommand.includes('search') || 
        lowerCommand.includes('show me') || lowerCommand.includes('looking for')) {
      // Extract price constraints
      const priceMatch = lowerCommand.match(/under\s*\$?(\d+)/i) || 
                         lowerCommand.match(/below\s*\$?(\d+)/i) ||
                         lowerCommand.match(/less than\s*\$?(\d+)/i)
      const maxPrice = priceMatch ? parseInt(priceMatch[1]) : null
      
      // Extract search terms (remove common words)
      const searchTerms = lowerCommand
        .replace(/find|search|show me|looking for|under|below|less than|\$?\d+|please|can you|i want|i need/gi, '')
        .trim()
      
      return { intent: 'search', query: searchTerms, maxPrice }
    }
    
    // Add to cart
    if (lowerCommand.includes('add to cart') || lowerCommand.includes('add this to cart') ||
        lowerCommand.includes('buy this') || lowerCommand.includes('purchase')) {
      return { intent: 'add_to_cart' }
    }
    
    // Check cart
    if (lowerCommand.includes("what's in my cart") || lowerCommand.includes('show cart') ||
        lowerCommand.includes('my cart') || lowerCommand.includes('view cart')) {
      return { intent: 'view_cart' }
    }
    
    // Track order
    if (lowerCommand.includes('track') || lowerCommand.includes('where is my order') ||
        lowerCommand.includes('order status')) {
      return { intent: 'track_order' }
    }
    
    // Checkout
    if (lowerCommand.includes('checkout') || lowerCommand.includes('check out') ||
        lowerCommand.includes('pay now') || lowerCommand.includes('complete order')) {
      return { intent: 'checkout' }
    }
    
    // Help
    if (lowerCommand.includes('help') || lowerCommand.includes('what can you do')) {
      return { intent: 'help' }
    }
    
    // Reorder
    if (lowerCommand.includes('reorder') || lowerCommand.includes('order again') ||
        lowerCommand.includes('my usual')) {
      return { intent: 'reorder' }
    }

    return { intent: 'unknown', query: command }
  }

  // Handle voice commands
  const handleVoiceCommand = async (command) => {
    setIsProcessing(true)
    const { intent, query, maxPrice } = parseIntent(command)
    
    let responseText = ''
    
    try {
      switch (intent) {
        case 'search':
          // Build search URL
          let searchUrl = `/?search=${encodeURIComponent(query || '')}`
          if (maxPrice) {
            searchUrl += `&priceRange=0,${maxPrice}`
          }
          
          responseText = query 
            ? `Searching for ${query}${maxPrice ? ` under $${maxPrice}` : ''}. Let me show you what we have.`
            : `Showing all products${maxPrice ? ` under $${maxPrice}` : ''}.`
          
          speak(responseText)
          setTimeout(() => {
            navigate(searchUrl)
            setIsOpen(false)
          }, 1500)
          break
          
        case 'view_cart':
          if (cart && cart.length > 0) {
            const itemCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0)
            const total = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0)
            responseText = `You have ${itemCount} item${itemCount !== 1 ? 's' : ''} in your cart, totaling $${total.toFixed(2)}. Would you like to checkout?`
          } else {
            responseText = "Your cart is empty. Would you like me to help you find some products?"
          }
          speak(responseText)
          break
          
        case 'checkout':
          if (cart && cart.length > 0) {
            responseText = "Taking you to checkout now."
            speak(responseText)
            setTimeout(() => {
              navigate('/checkout')
              setIsOpen(false)
            }, 1000)
          } else {
            responseText = "Your cart is empty. Let me help you find something first."
            speak(responseText)
          }
          break
          
        case 'track_order':
          if (currentUser) {
            responseText = "Let me show you your orders."
            speak(responseText)
            setTimeout(() => {
              navigate('/user-dashboard')
              setIsOpen(false)
            }, 1000)
          } else {
            responseText = "Please log in to track your orders."
            speak(responseText)
          }
          break
          
        case 'reorder':
          if (currentUser) {
            responseText = "Checking your previous orders for quick reorder."
            speak(responseText)
            setTimeout(() => {
              navigate('/user-dashboard')
              setIsOpen(false)
            }, 1000)
          } else {
            responseText = "Please log in to see your previous orders."
            speak(responseText)
          }
          break
          
        case 'help':
          responseText = "I can help you search for products, check your cart, track orders, or complete checkout. Try saying 'Find red sneakers under $50' or 'What's in my cart?'"
          speak(responseText)
          break
          
        default:
          // Try to search for the query anyway
          responseText = `I'll search for "${command}" for you.`
          speak(responseText)
          setTimeout(() => {
            navigate(`/?search=${encodeURIComponent(command)}`)
            setIsOpen(false)
          }, 1500)
      }
      
      setResponse(responseText)
      setConversationHistory(prev => [...prev, 
        { type: 'user', text: command },
        { type: 'assistant', text: responseText }
      ])
      
    } catch (error) {
      console.error('Voice command error:', error)
      responseText = "Sorry, I encountered an error. Please try again."
      speak(responseText)
      setResponse(responseText)
    }
    
    setIsProcessing(false)
  }

  const startListening = () => {
    if (recognition) {
      setTranscript('')
      setResponse('')
      recognition.start()
      setIsListening(true)
    }
  }

  const stopListening = () => {
    if (recognition) {
      recognition.stop()
      setIsListening(false)
    }
  }

  if (!isSupported) return null

  return (
    <>
      {/* Voice Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-40 w-14 h-14 rounded-full shadow-xl flex items-center justify-center glow-soft"
        style={{ 
          background: 'linear-gradient(135deg, hsl(280, 70%, 50%), hsl(320, 60%, 55%))',
          boxShadow: '0 4px 20px hsla(280, 70%, 50%, 0.4)'
        }}
      >
        <Mic size={24} color="white" />
      </motion.button>

      {/* Voice Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed bottom-24 left-6 right-6 sm:left-auto sm:right-auto sm:bottom-28 sm:left-1/2 sm:-translate-x-1/2 w-auto sm:w-96 max-w-[calc(100vw-3rem)] glass-panel-strong z-50 p-6 rounded-3xl"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, hsl(280, 70%, 50%), hsl(320, 60%, 55%))' }}>
                    <Volume2 size={20} color="white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Voice Shopping</h3>
                    <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      Speak your command
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="glass-button p-2 rounded-xl">
                  <X size={18} />
                </button>
              </div>

              {/* Suggestions */}
              <div className="mb-4 flex flex-wrap gap-2">
                {['Find sneakers', "What's in my cart?", 'Track my order'].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleVoiceCommand(suggestion)}
                    className="tag-pill text-xs font-medium hover:scale-105 transition-transform cursor-pointer"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              {/* Transcript Display */}
              {transcript && (
                <div className="glass-inner p-3 rounded-xl mb-4">
                  <p className="text-sm flex items-center gap-2">
                    <Mic size={14} style={{ color: 'hsl(var(--primary))' }} />
                    "{transcript}"
                  </p>
                </div>
              )}

              {/* Response Display */}
              {response && (
                <div className="glass-inner p-3 rounded-xl mb-4" 
                  style={{ background: 'rgba(139, 92, 246, 0.1)', borderColor: 'rgba(139, 92, 246, 0.2)' }}>
                  <p className="text-sm flex items-start gap-2">
                    <Volume2 size={14} className="mt-0.5 shrink-0" style={{ color: 'hsl(280, 70%, 60%)' }} />
                    {response}
                  </p>
                </div>
              )}

              {/* Microphone Button */}
              <div className="flex justify-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={isListening ? stopListening : startListening}
                  disabled={isProcessing}
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                    isListening ? 'animate-pulse' : ''
                  }`}
                  style={{
                    background: isListening 
                      ? 'linear-gradient(135deg, hsl(0, 70%, 55%), hsl(30, 70%, 50%))'
                      : 'linear-gradient(135deg, hsl(280, 70%, 50%), hsl(320, 60%, 55%))',
                    boxShadow: isListening
                      ? '0 0 30px hsla(0, 70%, 55%, 0.5)'
                      : '0 4px 20px hsla(280, 70%, 50%, 0.4)'
                  }}
                >
                  {isProcessing ? (
                    <Loader2 size={32} color="white" className="animate-spin" />
                  ) : isListening ? (
                    <MicOff size={32} color="white" />
                  ) : (
                    <Mic size={32} color="white" />
                  )}
                </motion.button>
              </div>

              <p className="text-center text-xs mt-3" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {isListening ? 'Listening... Tap to stop' : 'Tap microphone to speak'}
              </p>

              {/* Quick Actions */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                <button 
                  onClick={() => handleVoiceCommand('search products')}
                  className="glass-button p-3 rounded-xl flex flex-col items-center gap-1"
                >
                  <Search size={18} style={{ color: 'hsl(var(--primary))' }} />
                  <span className="text-xs">Search</span>
                </button>
                <button 
                  onClick={() => handleVoiceCommand("what's in my cart")}
                  className="glass-button p-3 rounded-xl flex flex-col items-center gap-1"
                >
                  <ShoppingCart size={18} style={{ color: 'hsl(200, 80%, 55%)' }} />
                  <span className="text-xs">Cart</span>
                </button>
                <button 
                  onClick={() => handleVoiceCommand('track my order')}
                  className="glass-button p-3 rounded-xl flex flex-col items-center gap-1"
                >
                  <Package size={18} style={{ color: 'hsl(150, 60%, 45%)' }} />
                  <span className="text-xs">Orders</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default VoiceCommerce
