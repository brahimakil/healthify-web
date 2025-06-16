import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

export default function DietitianDashboard() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [activeChats, setActiveChats] = useState([]);
  const [waitingChats, setWaitingChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);

  useEffect(() => {
    if (!currentUser?.uid) return;
    
    // Load users
    const loadUsers = async () => {
      try {
        const usersQuery = query(
          collection(db, 'users'),
          where('role', '==', 'user')
        );
        const usersSnapshot = await getDocs(usersQuery);
        const usersData = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUsers(usersData);
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };
    
    // Subscribe to dietitian's chats
    const subscribeToDietitianChats = () => {
      const chatsQuery = query(
        collection(db, 'chats'),
        where('dietitianId', '==', currentUser.uid),
        orderBy('updatedAt', 'desc')
      );
      
      return onSnapshot(chatsQuery, (snapshot) => {
        const activeChatsList = [];
        const waitingChatsList = [];
        
        snapshot.docs.forEach(doc => {
          const chatData = { id: doc.id, ...doc.data() };
          
          if (chatData.status === 'waiting') {
            waitingChatsList.push(chatData);
          } else if (chatData.status === 'active') {
            activeChatsList.push(chatData);
          }
        });
        
        setActiveChats(activeChatsList);
        setWaitingChats(waitingChatsList);
        setLoading(false);
      });
    };
    
    loadUsers();
    const unsubscribe = subscribeToDietitianChats();
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser?.uid]);
  
  // Find user details for a chat
  const getUserForChat = (chat) => {
    return users.find(user => user.id === chat.userId) || {};
  };
  
  const handleChatSelect = (chat) => {
    setSelectedChat(chat);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar with chat list */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Dietitian Dashboard</h2>
          <p className="text-sm text-gray-500">Manage your patient chats</p>
        </div>
        
        {/* Waiting chats section */}
        {waitingChats.length > 0 && (
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-medium text-yellow-500 uppercase tracking-wider mb-2">
              Waiting ({waitingChats.length})
            </h3>
            <div className="space-y-2">
              {waitingChats.map(chat => {
                const user = getUserForChat(chat);
                return (
                  <div 
                    key={chat.id}
                    className="p-3 bg-yellow-50 rounded-lg cursor-pointer hover:bg-yellow-100"
                    onClick={() => handleChatSelect(chat)}
                  >
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-yellow-200 flex items-center justify-center mr-3">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.displayName} className="w-10 h-10 rounded-full" />
                        ) : (
                          <span className="text-yellow-500 font-semibold">
                            {user.displayName?.charAt(0) || user.email?.charAt(0) || '?'}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{user.displayName || user.email}</p>
                        <p className="text-xs text-gray-500">
                          Waiting since {new Date(chat.createdAt?.toDate()).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Active chats section */}
        <div className="p-4 flex-1 overflow-y-auto">
          <h3 className="text-sm font-medium text-green-500 uppercase tracking-wider mb-2">
            Active Chats ({activeChats.length})
          </h3>
          <div className="space-y-2">
            {activeChats.map(chat => {
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
                        : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  onClick={() => handleChatSelect(chat)}
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName} className="w-10 h-10 rounded-full" />
                      ) : (
                        <span className="text-gray-500 font-semibold">
                          {user.displayName?.charAt(0) || user.email?.charAt(0) || '?'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <p className="font-medium text-gray-800">{user.displayName || user.email}</p>
                        {hasUnread && (
                          <span className="bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {chat.unreadCount.dietitian}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">{chat.lastMessage || 'No messages yet'}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {activeChats.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No active chats</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <ChatInterface 
            chat={selectedChat} 
            user={getUserForChat(selectedChat)} 
            currentUser={currentUser} 
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="text-gray-400 text-5xl mb-4">💬</div>
              <h3 className="text-xl font-medium text-gray-700 mb-2">Select a chat to start messaging</h3>
              <p className="text-gray-500">
                {waitingChats.length > 0 
                  ? `You have ${waitingChats.length} users waiting for assistance` 
                  : 'No pending chat requests'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Chat interface component
function ChatInterface({ chat, user, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!chat?.id) return;
    
    // Mark messages as read when dietitian opens the chat
    const markMessagesAsRead = async () => {
      try {
        const messagesRef = collection(db, `chats/${chat.id}/messages`);
        const unreadMessagesQuery = query(
          messagesRef,
          where('senderType', '==', 'user'),
          where('read', '==', false)
        );
        
        const unreadSnapshot = await getDocs(unreadMessagesQuery);
        
        const batch = db.batch();
        unreadSnapshot.docs.forEach(doc => {
          batch.update(doc.ref, { read: true });
        });
        
        if (unreadSnapshot.docs.length > 0) {
          // Reset dietitian unread count
          const chatRef = doc(db, 'chats', chat.id);
          batch.update(chatRef, { 'unreadCount.dietitian': 0 });
          
          await batch.commit();
        }
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    };
    
    // Subscribe to messages
    const subscribeToMessages = () => {
      const messagesQuery = query(
        collection(db, `chats/${chat.id}/messages`),
        orderBy('timestamp', 'asc')
      );
      
      return onSnapshot(messagesQuery, (snapshot) => {
        const messagesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setMessages(messagesList);
        setLoading(false);
      });
    };
    
    // If chat is in waiting status, update to active
    const activateChat = async () => {
      if (chat.status === 'waiting') {
        try {
          const chatRef = doc(db, 'chats', chat.id);
          await updateDoc(chatRef, {
            status: 'active',
            updatedAt: serverTimestamp()
          });
          
          // Add to dietitian's active chats
          const dietitianChatsRef = doc(db, 'dietitianChats', currentUser.uid);
          const dietitianChatsDoc = await getDoc(dietitianChatsRef);
          
          if (dietitianChatsDoc.exists()) {
            await updateDoc(dietitianChatsRef, {
              activeChatIds: arrayUnion(chat.id)
            });
          } else {
            await setDoc(dietitianChatsRef, {
              activeChatIds: [chat.id],
              unreadCount: 0,
              availability: 'online'
            });
          }
        } catch (error) {
          console.error('Error activating chat:', error);
        }
      }
    };
    
    markMessagesAsRead();
    activateChat();
    const unsubscribe = subscribeToMessages();
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [chat?.id, currentUser?.uid]);
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    try {
      const messageData = {
        text: newMessage.trim(),
        sender: currentUser.uid,
        senderType: 'dietitian',
        timestamp: serverTimestamp(),
        read: false
      };
      
      // Add message to collection
      await addDoc(collection(db, `chats/${chat.id}/messages`), messageData);
      
      // Update chat document
      await updateDoc(doc(db, 'chats', chat.id), {
        lastMessage: newMessage.trim(),
        updatedAt: serverTimestamp(),
        'unreadCount.user': increment(1)
      });
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }
  
  return (
    <>
      {/* Chat header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName} className="w-10 h-10 rounded-full" />
            ) : (
              <span className="text-gray-500 font-semibold">
                {user.displayName?.charAt(0) || user.email?.charAt(0) || '?'}
              </span>
            )}
          </div>
          <div>
            <h3 className="font-medium text-gray-800">{user.displayName || user.email}</h3>
            <p className="text-xs text-gray-500">
              Chat started {new Date(chat.createdAt?.toDate()).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
      
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map(message => {
              const isDietitian = message.senderType === 'dietitian';
              const messageDate = message.timestamp?.toDate() || new Date();
              
              return (
                <div 
                  key={message.id} 
                  className={`flex ${isDietitian ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-xs md:max-w-md rounded-lg px-4 py-2 ${
                      isDietitian 
                        ? 'bg-indigo-600 text-white rounded-br-none' 
                        : 'bg-white text-gray-800 rounded-bl-none'
                    }`}
                  >
                    <p>{message.text}</p>
                    <p className={`text-xs mt-1 text-right ${isDietitian ? 'text-indigo-200' : 'text-gray-500'}`}>
                      {messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      
      {/* Message input */}
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
            disabled={!newMessage.trim()}
            className="bg-indigo-600 text-white px-4 py-2 rounded-r-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </>
  );
} 