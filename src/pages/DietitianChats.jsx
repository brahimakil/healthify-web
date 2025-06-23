import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  doc, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  increment,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { useLocation } from 'react-router-dom';

export default function DietitianChats() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [chats, setChats] = useState([]);
  const [users, setUsers] = useState({});
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [availability, setAvailability] = useState('online');
  const location = useLocation();
  
  // Get userId and chatId from location state if navigating from Users page
  const userId = location.state?.userId;
  const chatId = location.state?.chatId;

  // Plan suggestion states
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);

  useEffect(() => {
    if (!currentUser?.uid) return;
    
    // Set initial availability
    const dietitianChatRef = doc(db, 'dietitianChats', currentUser.uid);
    getDoc(dietitianChatRef).then(docSnap => {
      if (docSnap.exists()) {
        setAvailability(docSnap.data().availability || 'online');
      } else {
        // Create dietitian chat document if it doesn't exist
        setDoc(dietitianChatRef, {
          activeChatIds: [],
          unreadCount: 0,
          availability: 'online'
        });
      }
    });
    
    // Subscribe to dietitian's chats
    const chatsQuery = query(
      collection(db, 'chats'),
      where('dietitianId', '==', currentUser.uid),
      orderBy('updatedAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(chatsQuery, async (snapshot) => {
      const chatsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setChats(chatsList);
      
      // Load user details for all chats
      const userIds = [...new Set(chatsList.map(chat => chat.userId))];
      const usersData = {};
      
      for (const userId of userIds) {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            usersData[userId] = userDoc.data();
          }
        } catch (error) {
          console.error(`Error loading user ${userId}:`, error);
        }
      }
      
      setUsers(usersData);
      setLoading(false);
      setInitialLoading(false);
      
      // If we have a chatId from navigation, select it
      if (chatId && initialLoading) {
        const selectedChat = chatsList.find(chat => chat.id === chatId);
        if (selectedChat) {
          setSelectedChat(selectedChat);
        }
      }
      // If we have a userId but no chatId, create a new chat
      else if (userId && !chatId && initialLoading) {
        handleCreateNewChat(userId);
      }
    });
    
    return () => unsubscribe();
  }, [currentUser?.uid, chatId, userId, initialLoading]);
  
  // Load messages when a chat is selected
  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }
    
    const messagesQuery = query(
      collection(db, `chats/${selectedChat.id}/messages`),
      orderBy('timestamp', 'asc')
    );
    
    const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
      const messagesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setMessages(messagesList);
      
      // Mark user messages as read
      let unreadCount = 0;
      const updatePromises = [];
      
      snapshot.docs.forEach(doc => {
        const msgData = doc.data();
        if (msgData.senderType === 'user' && !msgData.read) {
          updatePromises.push(updateDoc(doc.ref, { read: true }));
          unreadCount++;
        }
      });
      
      if (unreadCount > 0) {
        // Also reset the unread count for the dietitian in the chat document
        updatePromises.push(updateDoc(doc(db, 'chats', selectedChat.id), { 
          'unreadCount.dietitian': 0 
        }));
      }
      
      if (updatePromises.length > 0) {
        try {
          await Promise.all(updatePromises);
        } catch (error) {
          console.error('Error updating read status:', error);
        }
      }
    });
    
    return () => unsubscribe();
  }, [selectedChat]);
  
  const handleCreateNewChat = async (userId) => {
    try {
      // Check if there's an existing active chat with this user
      const existingChatsQuery = query(
        collection(db, 'chats'),
        where('userId', '==', userId),
        where('dietitianId', '==', currentUser.uid),
        where('status', 'in', ['active', 'waiting'])
      );
      
      const existingChatsSnapshot = await getDocs(existingChatsQuery);
      
      if (!existingChatsSnapshot.empty) {
        // Use existing chat
        const existingChat = existingChatsSnapshot.docs[0];
        setSelectedChat({
          id: existingChat.id,
          ...existingChat.data()
        });
        return;
      }
      
      // Create new chat
      const chatData = {
        userId: userId,
        dietitianId: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'active', // Dietitian initiated, so active immediately
        lastMessage: '',
        unreadCount: {
          user: 0,
          dietitian: 0
        }
      };
      
      const chatRef = await addDoc(collection(db, 'chats'), chatData);
      
      // Add to user's active chats
      const userChatsRef = doc(db, 'userChats', userId);
      const userChatsDoc = await getDoc(userChatsRef);
      
      if (userChatsDoc.exists()) {
        await updateDoc(userChatsRef, {
          activeChatIds: arrayUnion(chatRef.id)
        });
      } else {
        await setDoc(userChatsRef, {
          activeChatIds: [chatRef.id],
          unreadCount: 0
        });
      }
      
      // Add to dietitian's active chats
      const dietitianChatRef = doc(db, 'dietitianChats', currentUser.uid);
      const dietitianChatDoc = await getDoc(dietitianChatRef);
      
      if (dietitianChatDoc.exists()) {
        await updateDoc(dietitianChatRef, {
          activeChatIds: arrayUnion(chatRef.id)
        });
      }
      
      // Select the new chat
      setSelectedChat({
        id: chatRef.id,
        ...chatData
      });
      
    } catch (error) {
      console.error('Error creating new chat:', error);
      alert('Failed to create new chat. Please try again.');
    }
  };
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    // Add status check to prevent sending messages to closed chats
    if (!newMessage.trim() || !selectedChat || selectedChat.status !== 'active') return;
    
    try {
      const messageData = {
        text: newMessage.trim(),
        sender: currentUser.uid,
        senderType: 'dietitian',
        timestamp: serverTimestamp(),
        read: false
      };
      
      // Add message to collection
      await addDoc(collection(db, `chats/${selectedChat.id}/messages`), messageData);
      
      // Update chat document
      await updateDoc(doc(db, 'chats', selectedChat.id), {
        lastMessage: newMessage.trim(),
        updatedAt: serverTimestamp(),
        'unreadCount.user': increment(1),
        status: 'active' // Ensure chat is active when dietitian responds
      });
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  
  const handleAvailabilityChange = async (newStatus) => {
    setAvailability(newStatus);
    
    try {
      await updateDoc(doc(db, 'dietitianChats', currentUser.uid), {
        availability: newStatus
      });
    } catch (error) {
      console.error('Error updating availability:', error);
    }
  };
  
  const acceptChat = async (chatId) => {
    try {
      await updateDoc(doc(db, 'chats', chatId), {
        status: 'active'
      });
      
      // Update local state to reflect the new status
      setSelectedChat(prev => ({
        ...prev,
        status: 'active'
      }));
      
      // Send automatic welcome message
      const welcomeMessage = {
        text: `Hello! I'm ${currentUser.displayName || 'your dietitian'}. How can I help you today?`,
        sender: currentUser.uid,
        senderType: 'dietitian',
        timestamp: serverTimestamp(),
        read: false
      };
      
      await addDoc(collection(db, `chats/${chatId}/messages`), welcomeMessage);
      
      // Update chat document
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: welcomeMessage.text,
        updatedAt: serverTimestamp(),
        'unreadCount.user': increment(1)
      });
    } catch (error) {
      console.error('Error accepting chat:', error);
    }
  };
  
  const closeChat = async (chatId) => {
    try {
      await updateDoc(doc(db, 'chats', chatId), {
        status: 'closed'
      });
      
      // Update local state to reflect the new status
      setSelectedChat(prev => ({
        ...prev,
        status: 'closed'
      }));
      
      // Send automatic closing message
      const closingMessage = {
        text: 'This chat has been closed. Thank you for your consultation!',
        sender: currentUser.uid,
        senderType: 'dietitian',
        timestamp: serverTimestamp(),
        read: false
      };
      
      await addDoc(collection(db, `chats/${chatId}/messages`), closingMessage);
      
      // Update chat document
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: closingMessage.text,
        updatedAt: serverTimestamp(),
        'unreadCount.user': increment(1)
      });
    } catch (error) {
      console.error('Error closing chat:', error);
    }
  };
  
  const getUserForChat = (chat) => {
    return users[chat.userId] || {};
  };

  const loadAvailablePlans = async () => {
    try {
      // Load user's custom plans
      const userPlansQuery = query(
        collection(db, 'nutrition_plans'),
        where('dietitianId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      const userPlansSnapshot = await getDocs(userPlansQuery);
      const userPlans = userPlansSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isDefault: false
      }));

      // Load default plans
      const defaultPlansQuery = query(
        collection(db, 'nutrition_plans'),
        where('isDefault', '==', true),
        orderBy('createdAt', 'desc')
      );
      const defaultPlansSnapshot = await getDocs(defaultPlansQuery);
      const defaultPlans = defaultPlansSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isDefault: true
      }));

      setAvailablePlans([...userPlans, ...defaultPlans]);
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  };

  const handleSuggestPlan = async (plan) => {
    if (!selectedChat || !plan) return;

    try {
      // Create a formatted message with plan details
      const planMessage = `🎯 **Nutrition Plan Suggestion: ${plan.name}**\n\n📋 ${plan.description}\n\n📊 **7-Day Overview:**\n${plan.days.map(day => 
        `**${day.dayName}:**\n• ${day.calories} calories\n• ${day.protein}g protein, ${day.carbs}g carbs, ${day.fat}g fat\n• ${day.waterIntake} cups water\n• ${day.sleepHours}h sleep${day.workouts.length > 0 ? `\n• Workouts: ${day.workouts.map(w => `${w.name} (${w.duration}min)`).join(', ')}` : ''}`
      ).join('\n\n')}\n\n💡 This plan is designed to help you achieve your health goals. Would you like me to customize it further for your specific needs?`;

      // Add message to Firestore
      await addDoc(collection(db, `chats/${selectedChat.id}/messages`), {
        text: planMessage,
        sender: currentUser.uid,
        senderType: 'dietitian',
        timestamp: serverTimestamp(),
        read: false,
        messageType: 'plan_suggestion',
        planId: plan.id,
        planData: plan
      });

      // Update local messages state
      setMessages(prev => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          text: planMessage,
          senderType: 'dietitian',
          timestamp: new Date(),
          messageType: 'plan_suggestion',
          planId: plan.id,
          planData: plan
        }
      ]);
      
      // Update chat document
      await updateDoc(doc(db, 'chats', selectedChat.id), {
        lastMessage: `Suggested nutrition plan: ${plan.name}`,
        updatedAt: serverTimestamp(),
        'unreadCount.user': increment(1)
      });

      setShowPlanModal(false);
      setSelectedPlan(null);
    } catch (error) {
      console.error('Error suggesting plan:', error);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar with chat list */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">User Chats</h2>
            <div className="flex items-center">
              <span className={`w-3 h-3 rounded-full mr-1 ${
                availability === 'online' ? 'bg-green-500' : 
                availability === 'busy' ? 'bg-yellow-500' : 'bg-gray-500'
              }`}></span>
              <select 
                value={availability}
                onChange={(e) => handleAvailabilityChange(e.target.value)}
                className="text-sm border-none bg-transparent focus:outline-none focus:ring-0"
              >
                <option value="online">Online</option>
                <option value="busy">Busy</option>
                <option value="offline">Offline</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {chats.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No user chats yet</p>
              <p className="text-sm mt-2">Users will appear here when they start a conversation</p>
            </div>
          ) : (
            <div className="space-y-2">
              {chats.map(chat => {
                const user = getUserForChat(chat);
                const hasUnread = chat.unreadCount?.dietitian > 0;
                
                return (
                  <div 
                    key={chat.id}
                    className={`p-3 rounded-lg cursor-pointer ${
                      selectedChat?.id === chat.id 
                        ? 'bg-indigo-100' 
                        : hasUnread 
                          ? 'bg-green-50 hover:bg-green-100' 
                          : chat.status === 'waiting'
                            ? 'bg-yellow-50 hover:bg-yellow-100'
                            : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => setSelectedChat(chat)}
                  >
                    <div className="flex items-center">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                          {user.photoURL ? (
                            <img src={user.photoURL} alt={user.displayName} className="w-10 h-10 rounded-full" />
                          ) : (
                            <span className="text-gray-500 font-semibold">
                              {user.displayName?.charAt(0) || '?'}
                            </span>
                          )}
                        </div>
                        {hasUnread && (
                          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {chat.unreadCount.dietitian}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <p className="font-medium text-gray-800">{user.displayName || 'User'}</p>
                          <span className="text-xs text-gray-400">
                            {chat.updatedAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || ''}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <p className="text-sm text-gray-500 truncate">{chat.lastMessage || 'No messages yet'}</p>
                        </div>
                        <div className="mt-1">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            chat.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : chat.status === 'waiting' 
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}>
                            {chat.status === 'active' ? 'Active' : chat.status === 'waiting' ? 'Waiting' : 'Closed'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat header */}
            <div className="bg-white p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                  {users[selectedChat.userId]?.photoURL ? (
                    <img 
                      src={users[selectedChat.userId].photoURL} 
                      alt={users[selectedChat.userId].displayName} 
                      className="w-10 h-10 rounded-full" 
                    />
                  ) : (
                    <span className="text-gray-500 font-semibold">
                      {users[selectedChat.userId]?.displayName?.charAt(0) || '?'}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">
                    {users[selectedChat.userId]?.displayName || 'User'}
                  </h3>
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-1 ${
                      selectedChat.status === 'active' ? 'bg-green-500' : 
                      selectedChat.status === 'waiting' ? 'bg-yellow-500' : 'bg-gray-500'
                    }`}></span>
                    <p className="text-xs text-gray-500">
                      {selectedChat.status === 'active' ? 'Active conversation' : 
                       selectedChat.status === 'waiting' ? 'Waiting for response' : 'Conversation closed'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {selectedChat.status === 'waiting' && (
                  <button 
                    onClick={() => acceptChat(selectedChat.id)}
                    className="bg-green-500 text-white text-sm px-3 py-1 rounded hover:bg-green-600 flex items-center gap-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Accept Chat
                  </button>
                )}
                {selectedChat.status !== 'closed' && (
                  <button 
                    onClick={() => closeChat(selectedChat.id)}
                    className="bg-gray-500 text-white text-sm px-3 py-1 rounded hover:bg-gray-600 flex items-center gap-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Close Chat
                  </button>
                )}
              </div>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {selectedChat.status === 'waiting' ? (
                    <>
                      <div className="flex justify-center mb-4">
                        <svg className="animate-spin rounded-full h-8 w-8 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                      <p>New chat request</p>
                      <p className="text-sm mt-2">
                        Accept the chat to start responding
                      </p>
                    </>
                  ) : (
                    <>
                      <p>No messages yet</p>
                      <p className="text-sm mt-2">
                        Start the conversation by sending a message
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map(message => {
                    const date = message.timestamp?.toDate 
                      ? message.timestamp.toDate() 
                      : message.timestamp;
                    const timeString = date 
                      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                      : '';

                    return (
                      <div 
                        key={message.id}
                        className={`flex ${message.senderType === 'dietitian' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-xs md:max-w-md rounded-lg px-4 py-2 ${
                          message.senderType === 'dietitian' 
                            ? 'bg-indigo-600 text-white rounded-br-none' 
                            : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
                        }`}>
                          {message.messageType === 'plan_suggestion' ? (
                            <div>
                              <div className="whitespace-pre-line">{message.text}</div>
                              {message.planData && (
                                <div className="mt-2 p-2 bg-indigo-500 rounded text-sm">
                                  <strong>Plan Details Available</strong>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="whitespace-pre-line">{message.text}</p>
                          )}
                          <p className={`text-xs mt-1 ${message.senderType === 'dietitian' ? 'text-indigo-200' : 'text-gray-500'}`}>
                            {timeString}
                            {message.read && message.senderType === 'dietitian' && (
                              <span className="ml-1">✓</span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Message input with Suggest Plan button */}
            {selectedChat && selectedChat.status === 'active' && (
              <div className="bg-white border-t border-gray-200 p-4">
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => {
                      loadAvailablePlans();
                      setShowPlanModal(true);
                    }}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center gap-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Suggest Plan
                  </button>
                </div>
                <form onSubmit={handleSendMessage} className="flex">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Type your message..."
                  />
                  <button 
                    type="submit"
                    className="bg-indigo-600 text-white px-4 py-2 rounded-r-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center gap-2"
                    disabled={!newMessage.trim()}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Send
                  </button>
                </form>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center p-8">
              <div className="mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Your User Conversations</h3>
              <p className="text-gray-500 max-w-md">
                Select a chat from the sidebar to view messages or wait for new user requests to appear.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Plan Selection Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Select a Plan to Suggest</h2>
                <button
                  onClick={() => setShowPlanModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availablePlans.map(plan => (
                  <div key={plan.id} className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 cursor-pointer"
                       onClick={() => setSelectedPlan(plan)}>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                      {plan.isDefault && (
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{plan.description}</p>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Avg Calories:</span>
                        <span className="font-medium ml-1">
                          {Math.round(plan.days.reduce((sum, day) => sum + day.calories, 0) / 7)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Avg Protein:</span>
                        <span className="font-medium ml-1">
                          {Math.round(plan.days.reduce((sum, day) => sum + day.protein, 0) / 7)}g
                        </span>
                      </div>
                    </div>
                    
                    {selectedPlan?.id === plan.id && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSuggestPlan(plan);
                          }}
                          className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700"
                        >
                          Send This Plan
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {availablePlans.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No plans available</p>
                  <p className="text-sm mt-2">Create some plans first to suggest to users</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}