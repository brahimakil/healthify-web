import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, arrayUnion, addDoc, increment, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import StartChat from '../components/StartChat';
import { useNavigate } from 'react-router-dom';

export default function Dietitians() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dietitians, setDietitians] = useState([]);
  const [selectedDietitian, setSelectedDietitian] = useState(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [waitingForDietitian, setWaitingForDietitian] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatUnsubscribes, setChatUnsubscribes] = useState([]);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDietitians = async () => {
      try {
        const dietitiansQuery = query(
          collection(db, 'users'),
          where('role', '==', 'dietitian')
        );
        
        const snapshot = await getDocs(dietitiansQuery);
        const dietitiansList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setDietitians(dietitiansList);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dietitians:', error);
        setLoading(false);
      }
    };
    
    fetchDietitians();
  }, []);
  
  const handleChatStarted = () => {
    setSelectedDietitian(null);
    // Navigate to chat history
    navigate('/chats');
  };

  const openChat = async (dietitian) => {
    try {
      setSelectedDietitian(dietitian);
      setShowChatModal(true);
      setWaitingForDietitian(true);
      
      // Check if there's an existing active chat with this dietitian
      const existingChatsQuery = query(
        collection(db, 'chats'),
        where('userId', '==', currentUser.uid),
        where('dietitianId', '==', dietitian.id),
        where('status', 'in', ['active', 'waiting'])
      );
      
      const existingChatsSnapshot = await getDocs(existingChatsQuery);
      
      let chatId;
      
      if (!existingChatsSnapshot.empty) {
        // Use existing chat
        const existingChat = existingChatsSnapshot.docs[0];
        chatId = existingChat.id;
        
        // If chat was already active, we can show messages immediately
        if (existingChat.data().status === 'active') {
          setWaitingForDietitian(false);
        }
      } else {
        // Create new chat
        const chatData = {
          userId: currentUser.uid,
          dietitianId: dietitian.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          status: 'waiting',
          lastMessage: '',
          unreadCount: {
            user: 0,
            dietitian: 0
          }
        };
        
        const chatRef = await addDoc(collection(db, 'chats'), chatData);
        chatId = chatRef.id;
        
        // Add to user's active chats
        const userChatsRef = doc(db, 'userChats', currentUser.uid);
        const userChatsDoc = await getDoc(userChatsRef);
        
        if (userChatsDoc.exists()) {
          await updateDoc(userChatsRef, {
            activeChatIds: arrayUnion(chatId)
          });
        } else {
          await setDoc(userChatsRef, {
            activeChatIds: [chatId],
            unreadCount: 0
          });
        }
      }
      
      // Set current chat ID
      setCurrentChatId(chatId);
      
      // Subscribe to chat status changes
      const chatRef = doc(db, 'chats', chatId);
      const unsubscribeChatStatus = onSnapshot(chatRef, (doc) => {
        if (doc.exists()) {
          const chatData = doc.data();
          if (chatData.status === 'active') {
            setWaitingForDietitian(false);
          }
        }
      });
      
      // Subscribe to messages
      const messagesQuery = query(
        collection(db, `chats/${chatId}/messages`),
        orderBy('timestamp', 'asc')
      );
      
      const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
        const messagesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setChatMessages(messagesList.map(msg => ({
          text: msg.text,
          sender: msg.senderType === 'user' ? 'user' : 'dietitian',
          timestamp: msg.timestamp?.toDate() || new Date()
        })));
        
        // Mark dietitian messages as read
        const batch = db.batch();
        let unreadCount = 0;
        
        snapshot.docs.forEach(doc => {
          const msgData = doc.data();
          if (msgData.senderType === 'dietitian' && !msgData.read) {
            batch.update(doc.ref, { read: true });
            unreadCount++;
          }
        });
        
        if (unreadCount > 0) {
          batch.update(chatRef, { 'unreadCount.user': 0 });
          batch.commit();
        }
      });
      
      // Store unsubscribe functions for cleanup
      setChatUnsubscribes([unsubscribeChatStatus, unsubscribeMessages]);
      
    } catch (error) {
      console.error('Error opening chat:', error);
      alert('Failed to open chat. Please try again.');
      setWaitingForDietitian(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !currentChatId) return;
    
    try {
      const messageData = {
        text: message.trim(),
        sender: currentUser.uid,
        senderType: 'user',
        timestamp: serverTimestamp(),
        read: false
      };
      
      // Add message to collection
      await addDoc(collection(db, `chats/${currentChatId}/messages`), messageData);
      
      // Update chat document
      await updateDoc(doc(db, 'chats', currentChatId), {
        lastMessage: message.trim(),
        updatedAt: serverTimestamp(),
        'unreadCount.dietitian': increment(1)
      });
      
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  const closeChat = () => {
    // Clean up listeners
    chatUnsubscribes.forEach(unsubscribe => unsubscribe());
    
    setShowChatModal(false);
    setSelectedDietitian(null);
    setMessage('');
    setChatMessages([]);
    setCurrentChatId(null);
    setChatUnsubscribes([]);
  };

  if (loading) {
    return <LoadingSpinner />;
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Available Dietitians</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dietitians.length === 0 ? (
          <p className="text-gray-500 col-span-full text-center py-8">No dietitians available at the moment.</p>
        ) : (
          dietitians.map(dietitian => (
            <div key={dietitian.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-4">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                    {dietitian.photoURL ? (
                      <img src={dietitian.photoURL} alt={dietitian.displayName} className="w-12 h-12 rounded-full" />
                    ) : (
                      <span className="text-gray-500 font-semibold text-lg">
                        {dietitian.displayName?.charAt(0) || 'D'}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{dietitian.displayName}</h3>
                    <div className="flex items-center">
                      <span className={`w-2 h-2 rounded-full mr-1 ${
                        dietitian.availability === 'online' ? 'bg-green-500' : 
                        dietitian.availability === 'busy' ? 'bg-yellow-500' : 'bg-gray-500'
                      }`}></span>
                      <span className="text-sm text-gray-500">
                        {dietitian.availability === 'online' ? 'Online' : 
                         dietitian.availability === 'busy' ? 'Busy' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-4 mt-2">
                  <h4 className="text-sm font-semibold text-blue-600 mb-2">Areas of Expertise</h4>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {dietitian.profile?.areasOfExpertise?.map(area => (
                      <span 
                        key={area} 
                        className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                      >
                        {area}
                      </span>
                    )) || <span className="text-sm text-gray-500 italic">No expertise areas specified</span>}
                  </div>
                  
                  <h4 className="text-sm font-semibold text-green-600 mb-2">Diet Approaches</h4>
                  <div className="flex flex-wrap gap-1 mb-4">
                    {dietitian.profile?.dietApproaches?.map(approach => (
                      <span 
                        key={approach} 
                        className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full"
                      >
                        {approach}
                      </span>
                    )) || <span className="text-sm text-gray-500 italic">No diet approaches specified</span>}
                  </div>
                  
                  <button
                    onClick={() => openChat(dietitian)}
                    className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                    </svg>
                    Chat Now
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Chat modal */}
      {showChatModal && selectedDietitian && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full h-3/4 flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                  {selectedDietitian.photoURL ? (
                    <img src={selectedDietitian.photoURL} alt={selectedDietitian.displayName} className="w-10 h-10 rounded-full" />
                  ) : (
                    <span className="text-gray-500 font-semibold">
                      {selectedDietitian.displayName?.charAt(0) || 'D'}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{selectedDietitian.displayName}</h3>
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-1 ${waitingForDietitian ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
                    <span className="text-xs text-gray-500">
                      {waitingForDietitian ? 'Waiting to join...' : 'Online'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={closeChat}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {waitingForDietitian ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
                  <p className="text-gray-600 text-center">Waiting for dietitian to join...</p>
                  <p className="text-gray-500 text-sm mt-2 text-center">This may take a moment. You'll be notified when they're ready.</p>
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-gray-600 text-center">Start the conversation by sending a message</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {chatMessages.map((message, index) => (
                    <div 
                      key={index}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs md:max-w-md rounded-lg px-4 py-2 ${
                        message.sender === 'user' 
                          ? 'bg-indigo-600 text-white rounded-br-none' 
                          : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
                      }`}>
                        <p>{message.text}</p>
                        <p className={`text-xs mt-1 ${message.sender === 'user' ? 'text-indigo-200' : 'text-gray-500'}`}>
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="border-t border-gray-200 p-4">
              <div className="flex">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Type your message..."
                  disabled={waitingForDietitian}
                />
                <button 
                  onClick={sendMessage}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-r-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center"
                  disabled={waitingForDietitian || !message.trim()}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 