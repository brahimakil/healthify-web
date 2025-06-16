import { useState } from 'react';
import { collection, addDoc, serverTimestamp, doc, updateDoc, arrayUnion, increment, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function StartChat({ dietitianId, dietitianName, onChatStarted }) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [initialMessage, setInitialMessage] = useState('');
  const navigate = useNavigate();

  const handleStartChat = async (e) => {
    e.preventDefault();
    
    if (!initialMessage.trim()) return;
    
    setLoading(true);
    
    try {
      // Create new chat document
      const chatRef = await addDoc(collection(db, 'chats'), {
        userId: currentUser.uid,
        dietitianId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'waiting',
        lastMessage: initialMessage.trim(),
        unreadCount: {
          user: 0,
          dietitian: 1
        }
      });
      
      // Add first message
      await addDoc(collection(db, `chats/${chatRef.id}/messages`), {
        text: initialMessage.trim(),
        sender: currentUser.uid,
        senderType: 'user',
        timestamp: serverTimestamp(),
        read: false
      });
      
      // Update userChats
      const userChatRef = doc(db, 'userChats', currentUser.uid);
      await updateDoc(userChatRef, {
        activeChatIds: arrayUnion(chatRef.id)
      }).catch(async (error) => {
        // Create document if it doesn't exist
        if (error.code === 'not-found') {
          await setDoc(userChatRef, {
            activeChatIds: [chatRef.id],
            unreadCount: 0
          });
        } else {
          throw error;
        }
      });
      
      // Update dietitianChats
      const dietitianChatRef = doc(db, 'dietitianChats', dietitianId);
      await updateDoc(dietitianChatRef, {
        activeChatIds: arrayUnion(chatRef.id),
        unreadCount: increment(1)
      }).catch(async (error) => {
        // Create document if it doesn't exist
        if (error.code === 'not-found') {
          await setDoc(dietitianChatRef, {
            activeChatIds: [chatRef.id],
            unreadCount: 1,
            availability: 'online'
          });
        } else {
          throw error;
        }
      });
      
      setLoading(false);
      
      if (onChatStarted) {
        onChatStarted(chatRef.id);
      } else {
        navigate('/chats');
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Start a chat with {dietitianName}
      </h3>
      <form onSubmit={handleStartChat}>
        <div className="mb-4">
          <label htmlFor="initialMessage" className="block text-sm font-medium text-gray-700 mb-1">
            Initial Message
          </label>
          <textarea
            id="initialMessage"
            value={initialMessage}
            onChange={(e) => setInitialMessage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            rows="3"
            placeholder="Hi, I'd like to discuss my nutrition plan..."
            required
          ></textarea>
        </div>
        <button
          type="submit"
          disabled={loading || !initialMessage.trim()}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-400"
        >
          {loading ? 'Starting Chat...' : 'Start Chat'}
        </button>
      </form>
    </div>
  );
}