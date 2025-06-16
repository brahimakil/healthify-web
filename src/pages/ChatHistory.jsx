import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, increment, addDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ChatHistory() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState([]);
  const [dietitians, setDietitians] = useState({});
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    if (!currentUser?.uid) return;
    
    // Subscribe to user's chats
    const chatsQuery = query(
      collection(db, 'chats'),
      where('userId', '==', currentUser.uid),
      orderBy('updatedAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(chatsQuery, async (snapshot) => {
      const chatsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setChats(chatsList);
      
      // Load dietitian details for all chats
      const dietitianIds = [...new Set(chatsList.map(chat => chat.dietitianId))];
      const dietitiansData = {};
      
      for (const dietitianId of dietitianIds) {
        try {
          const dietitianDoc = await getDoc(doc(db, 'users', dietitianId));
          if (dietitianDoc.exists()) {
            dietitiansData[dietitianId] = dietitianDoc.data();
          }
        } catch (error) {
          console.error(`Error loading dietitian ${dietitianId}:`, error);
        }
      }
      
      setDietitians(dietitiansData);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [currentUser?.uid]);
  
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
        batch.update(doc(db, 'chats', selectedChat.id), { 'unreadCount.user': 0 });
        batch.commit();
      }
    });
    
    return () => unsubscribe();
  }, [selectedChat]);
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedChat) return;
    
    try {
      const messageData = {
        text: newMessage.trim(),
        sender: currentUser.uid,
        senderType: 'user',
        timestamp: serverTimestamp(),
        read: false
      };
      
      // Add message to collection
      await addDoc(collection(db, `chats/${selectedChat.id}/messages`), messageData);
      
      // Update chat document
      await updateDoc(doc(db, 'chats', selectedChat.id), {
        lastMessage: newMessage.trim(),
        updatedAt: serverTimestamp(),
        'unreadCount.dietitian': increment(1)
      });
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  
  const getDietitianForChat = (chat) => {
    return dietitians[chat.dietitianId] || {};
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar with chat list */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Chat History</h2>
          <p className="text-sm text-gray-500">Your conversations with dietitians</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {chats.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No chat history found</p>
              <p className="text-sm mt-2">Start a conversation with a dietitian</p>
            </div>
          ) : (
            <div className="space-y-2">
              {chats.map(chat => {
                const dietitian = getDietitianForChat(chat);
                const hasUnread = chat.unreadCount?.user > 0;
                
                return (
                  <div 
                    key={chat.id}
                    className={`p-3 rounded-lg cursor-pointer ${
                      selectedChat?.id === chat.id 
                        ? 'bg-indigo-100' 
                        : hasUnread 
                          ? 'bg-green-50 hover:bg-green-100' 
                          : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => setSelectedChat(chat)}
                  >
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                        {dietitian.photoURL ? (
                          <img src={dietitian.photoURL} alt={dietitian.displayName} className="w-10 h-10 rounded-full" />
                        ) : (
                          <span className="text-gray-500 font-semibold">
                            {dietitian.displayName?.charAt(0) || '?'}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <p className="font-medium text-gray-800">{dietitian.displayName || 'Dietitian'}</p>
                          {hasUnread && (
                            <span className="bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                              {chat.unreadCount.user}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-gray-500 truncate">{chat.lastMessage || 'No messages yet'}</p>
                          <span className="text-xs text-gray-400">
                            {chat.updatedAt?.toDate().toLocaleDateString() || ''}
                          </span>
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
            <div className="bg-white p-4 border-b border-gray-200 flex items-center">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                {dietitians[selectedChat.dietitianId]?.photoURL ? (
                  <img 
                    src={dietitians[selectedChat.dietitianId].photoURL} 
                    alt={dietitians[selectedChat.dietitianId].displayName} 
                    className="w-10 h-10 rounded-full" 
                  />
                ) : (
                  <span className="text-gray-500 font-semibold">
                    {dietitians[selectedChat.dietitianId]?.displayName?.charAt(0) || '?'}
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-medium text-gray-800">
                  {dietitians[selectedChat.dietitianId]?.displayName || 'Dietitian'}
                </h3>
                <p className="text-xs text-gray-500">
                  {selectedChat.status === 'active' ? 'Active conversation' : 
                   selectedChat.status === 'waiting' ? 'Waiting for dietitian' : 'Conversation closed'}
                </p>
              </div>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No messages yet</p>
                  <p className="text-sm mt-2">Start the conversation by sending a message</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map(message => (
                    <div 
                      key={message.id}
                      className={`flex ${message.senderType === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs md:max-w-md rounded-lg px-4 py-2 ${
                        message.senderType === 'user' 
                          ? 'bg-indigo-600 text-white rounded-br-none' 
                          : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
                      }`}>
                        <p>{message.text}</p>
                        <p className={`text-xs mt-1 ${message.senderType === 'user' ? 'text-indigo-200' : 'text-gray-500'}`}>
                          {message.timestamp?.toDate().toLocaleTimeString() || ''}
                          {message.read && message.senderType === 'user' && (
                            <span className="ml-1">✓</span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Message input */}
            {selectedChat.status === 'active' && (
              <div className="bg-white border-t border-gray-200 p-4">
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
                    className="bg-indigo-600 text-white px-4 py-2 rounded-r-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={!newMessage.trim()}
                  >
                    Send
                  </button>
                </form>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center p-8">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Select a conversation</h3>
              <p className="text-gray-500">Choose a chat from the sidebar to view messages</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}