import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { Link, useNavigate } from 'react-router-dom';

export default function Users() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [chatData, setChatData] = useState({});
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!currentUser?.uid) return;
    
    // Load all users
    loadUsers();
    
    // Subscribe to chats for this dietitian to get real-time updates
    const chatsQuery = query(
      collection(db, 'chats'),
      where('dietitianId', '==', currentUser.uid)
    );
    
    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      const chats = {};
      
      snapshot.docs.forEach(doc => {
        const chat = doc.data();
        const userId = chat.userId;
        
        if (!chats[userId]) {
          chats[userId] = {
            chatId: doc.id,
            status: chat.status,
            unreadCount: chat.unreadCount?.dietitian || 0,
            lastMessage: chat.lastMessage,
            updatedAt: chat.updatedAt
          };
        } else if (chat.updatedAt && (!chats[userId].updatedAt || 
                  chat.updatedAt.toDate() > chats[userId].updatedAt.toDate())) {
          // Update if this is a newer chat
          chats[userId] = {
            chatId: doc.id,
            status: chat.status,
            unreadCount: chat.unreadCount?.dietitian || 0,
            lastMessage: chat.lastMessage,
            updatedAt: chat.updatedAt
          };
        }
      });
      
      setChatData(chats);
    });
    
    return () => unsubscribe();
  }, [currentUser?.uid]);
  
  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Get all users - we'll filter client-side for more control
      const usersQuery = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(usersQuery);
      const usersList = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(user => {
          // Exclude current user
          if (user.id === currentUser.uid) return false;
          
          // Exclude dietitians (multiple role values to be safe)
          if (user.role === 'dietitian' || user.role === 'admin') return false;
          
          // Include users with no role (legacy users) or explicit user/client roles
          return true;
        });
      
      setUsers(usersList);
      setLoading(false);
    } catch (error) {
      console.error('Error loading users:', error);
      setLoading(false);
    }
  };
  
  const handleOpenChat = (userId, existingChatId) => {
    navigate('/dietitian-chats', { state: { userId, chatId: existingChatId } });
  };
  
  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.displayName?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">All Users</h1>
        <div className="flex items-center">
          <div className="relative">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <button 
            onClick={loadUsers}
            className="ml-2 p-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
      
      {filteredUsers.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <h3 className="text-xl font-medium text-gray-900 mb-2">No users found</h3>
          <p className="text-gray-500">
            {searchTerm ? `No results match "${searchTerm}"` : "No users are registered in the system"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map(user => {
            const userChat = chatData[user.id] || {};
            const hasUnreadMessages = userChat.unreadCount > 0;
            const hasActiveChat = userChat.chatId && (userChat.status === 'active' || userChat.status === 'waiting');
            
            return (
              <div key={user.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center mb-4">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.displayName} className="w-12 h-12 rounded-full" />
                        ) : (
                          <span className="text-gray-500 font-semibold text-lg">
                            {user.displayName?.charAt(0) || 'U'}
                          </span>
                        )}
                      </div>
                      {hasUnreadMessages && (
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {userChat.unreadCount}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{user.displayName || 'User'}</h3>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-4 mt-2">
                    {hasActiveChat && (
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            userChat.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {userChat.status === 'active' ? 'Active Chat' : 'Waiting for Response'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {userChat.updatedAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || ''}
                          </span>
                        </div>
                        {userChat.lastMessage && (
                          <p className="text-sm text-gray-600 truncate">
                            Last message: {userChat.lastMessage}
                          </p>
                        )}
                      </div>
                    )}
                    
                    <button
                      onClick={() => handleOpenChat(user.id, userChat.chatId)}
                      className={`w-full py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center justify-center gap-2 ${
                        hasActiveChat
                          ? hasUnreadMessages
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : userChat.status === 'waiting'
                              ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                      </svg>
                      {hasActiveChat 
                        ? hasUnreadMessages 
                          ? `Reply (${userChat.unreadCount} new)`
                          : userChat.status === 'waiting'
                            ? 'Respond to Request'
                            : 'Continue Chat'
                        : 'Start Chat'
                      }
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
} 