import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { Link } from 'react-router-dom';

// Define expertise areas and diet approaches
const EXPERTISE_AREAS = [
  "Clinical Nutrition",
  "Sports Nutrition",
  "Pediatric Nutrition",
  "Renal Diets",
  "Weight Management",
  "Eating Disorders",
  "Diabetic Nutrition",
  "Geriatric Nutrition",
  "Oncology Nutrition"
];

const DIET_APPROACHES = [
  "Ketogenic",
  "Mediterranean",
  "Vegan / Plant-Based",
  "Low FODMAP",
  "Intermittent Fasting",
  "Gluten-Free"
];

export default function DietitianClients() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    loadClients();
  }, []);
  
  const loadClients = async () => {
    try {
      setLoading(true);
      
      // Get all users with role 'client'
      const clientsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'client')
      );
      
      const snapshot = await getDocs(clientsQuery);
      const clientsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Get all chats for this dietitian
      const chatsQuery = query(
        collection(db, 'chats'),
        where('dietitianId', '==', currentUser.uid)
      );
      
      const chatsSnapshot = await getDocs(chatsQuery);
      const chats = chatsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Add chat info to clients
      const enhancedClients = clientsList.map(client => {
        const clientChats = chats.filter(chat => chat.userId === client.id);
        return {
          ...client,
          hasActiveChat: clientChats.some(chat => chat.status === 'active' || chat.status === 'waiting'),
          chatId: clientChats.length > 0 ? clientChats[0].id : null,
          chatStatus: clientChats.length > 0 ? clientChats[0].status : null,
          // Add random expertise and diet approaches for demo purposes if not present
          profile: {
            ...client.profile,
            areasOfExpertise: client.profile?.areasOfExpertise || getRandomItems(EXPERTISE_AREAS, 2 + Math.floor(Math.random() * 3)),
            dietApproaches: client.profile?.dietApproaches || getRandomItems(DIET_APPROACHES, 1 + Math.floor(Math.random() * 3))
          }
        };
      });
      
      setClients(enhancedClients);
      setLoading(false);
    } catch (error) {
      console.error('Error loading clients:', error);
      setLoading(false);
    }
  };
  
  const getRandomItems = (array, count) => {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };
  
  const filteredClients = clients.filter(client => {
    const searchLower = searchTerm.toLowerCase();
    return (
      client.displayName?.toLowerCase().includes(searchLower) ||
      client.email?.toLowerCase().includes(searchLower) ||
      client.profile?.areasOfExpertise?.some(area => area.toLowerCase().includes(searchLower)) ||
      client.profile?.dietApproaches?.some(approach => approach.toLowerCase().includes(searchLower))
    );
  });

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Clients</h1>
        <div className="flex items-center">
          <div className="relative">
            <input
              type="text"
              placeholder="Search clients..."
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
            onClick={loadClients}
            className="ml-2 p-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
      
      {filteredClients.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <h3 className="text-xl font-medium text-gray-900 mb-2">No clients found</h3>
          <p className="text-gray-500">
            {searchTerm ? `No results match "${searchTerm}"` : "You don't have any clients yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map(client => (
            <div key={client.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-4">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                    {client.photoURL ? (
                      <img src={client.photoURL} alt={client.displayName} className="w-12 h-12 rounded-full" />
                    ) : (
                      <span className="text-gray-500 font-semibold text-lg">
                        {client.displayName?.charAt(0) || 'C'}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{client.displayName || 'Client'}</h3>
                    <p className="text-sm text-gray-500">{client.email}</p>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-4 mt-2">
                  <h4 className="text-sm font-semibold text-blue-600 mb-2">Areas of Interest</h4>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {client.profile?.areasOfExpertise?.map(area => (
                      <span 
                        key={area} 
                        className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                  
                  <h4 className="text-sm font-semibold text-green-600 mb-2">Diet Preferences</h4>
                  <div className="flex flex-wrap gap-1 mb-4">
                    {client.profile?.dietApproaches?.map(approach => (
                      <span 
                        key={approach} 
                        className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full"
                      >
                        {approach}
                      </span>
                    ))}
                  </div>
                  
                  {client.hasActiveChat ? (
                    <Link 
                      to="/dietitian-chats" 
                      state={{ chatId: client.chatId }}
                      className="block w-full bg-indigo-600 text-white text-center py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {client.chatStatus === 'waiting' ? 'Respond to Request' : 'Continue Chat'}
                    </Link>
                  ) : (
                    <button
                      className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                      disabled
                    >
                      No Active Chat
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}