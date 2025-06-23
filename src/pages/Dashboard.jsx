import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({
    myClients: 0,
    activeChats: 0,
    totalPlans: 0,
    plansSuggested: 0,
    messagesThisWeek: 0,
    responseRate: 0
  });
  
  const [recentActivity, setRecentActivity] = useState([]);
  const [chatStats, setChatStats] = useState([]);
  const [planUsage, setPlanUsage] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.role === 'dietitian') {
      fetchDietitianDashboardData();
    } else {
      // For regular users, show different dashboard
      fetchUserDashboardData();
    }
  }, [currentUser]);

  const fetchUserDashboardData = async () => {
    if (!currentUser) return;
    
    try {
      // For regular users, show their own activity
      const userChatsQuery = query(
        collection(db, 'chats'),
        where('userId', '==', currentUser.uid)
      );
      const userChatsSnapshot = await getDocs(userChatsQuery);
      const userChats = userChatsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      setStats({
        myClients: 0,
        activeChats: userChats.filter(chat => chat.status === 'active').length,
        totalPlans: 0,
        plansSuggested: 0,
        messagesThisWeek: 0,
        responseRate: 0
      });

      setRecentActivity([]);
      setChatStats([]);
      setPlanUsage([]);
    } catch (error) {
      console.error("Error fetching user dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDietitianDashboardData = async () => {
    if (!currentUser) return;
    
    try {
      // Get dietitian's chats
      const chatsQuery = query(
        collection(db, 'chats'),
        where('dietitianId', '==', currentUser.uid)
      );
      const chatsSnapshot = await getDocs(chatsQuery);
      const chats = chatsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Count active chats
      const activeChats = chats.filter(chat => chat.status === 'active').length;
      const uniqueClients = new Set(chats.map(chat => chat.userId)).size;

      // Get dietitian's plans
      const plansQuery = query(
        collection(db, 'nutrition_plans'),
        where('dietitianId', '==', currentUser.uid)
      );
      const plansSnapshot = await getDocs(plansQuery);
      const totalPlans = plansSnapshot.size;

      // Get messages from this week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const messagesQuery = query(
        collection(db, 'messages'),
        where('senderId', '==', currentUser.uid),
        where('timestamp', '>=', oneWeekAgo)
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      const messagesThisWeek = messagesSnapshot.size;

      // Count plan suggestions
      const planSuggestionsQuery = query(
        collection(db, 'messages'),
        where('senderId', '==', currentUser.uid),
        where('messageType', '==', 'plan_suggestion')
      );
      const planSuggestionsSnapshot = await getDocs(planSuggestionsQuery);
      const plansSuggested = planSuggestionsSnapshot.size;

      // Calculate response rate (simplified)
      const responseRate = chats.length > 0 ? Math.round((activeChats / chats.length) * 100) : 0;

      setStats({
        myClients: uniqueClients,
        activeChats,
        totalPlans,
        plansSuggested,
        messagesThisWeek,
        responseRate
      });

      // Generate recent activity
      const activity = [];
      
      // Add recent chats
      const recentChats = chats
        .sort((a, b) => (b.updatedAt?.toDate() || 0) - (a.updatedAt?.toDate() || 0))
        .slice(0, 3);
      
      for (const chat of recentChats) {
        activity.push({
          type: 'chat',
          message: `New message in chat`,
          time: chat.updatedAt?.toDate(),
          status: chat.status
        });
      }

      // Add recent plan suggestions
      const recentPlanSuggestions = planSuggestionsSnapshot.docs
        .sort((a, b) => (b.data().timestamp?.toDate() || 0) - (a.data().timestamp?.toDate() || 0))
        .slice(0, 2);
        
      for (const suggestion of recentPlanSuggestions) {
        activity.push({
          type: 'plan',
          message: `Suggested plan: ${suggestion.data().planData?.name || 'Nutrition Plan'}`,
          time: suggestion.data().timestamp?.toDate()
        });
      }

      setRecentActivity(activity.sort((a, b) => (b.time || 0) - (a.time || 0)).slice(0, 5));

      // Generate chat statistics for the last 7 days
      const chatStatsData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date.setHours(0, 0, 0, 0));
        const dayEnd = new Date(date.setHours(23, 59, 59, 999));
        
        const dayMessages = messagesSnapshot.docs.filter(doc => {
          const msgTime = doc.data().timestamp?.toDate();
          return msgTime >= dayStart && msgTime <= dayEnd;
        });

        chatStatsData.push({
          date: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
          messages: dayMessages.length,
          chats: new Set(dayMessages.map(doc => doc.data().chatId)).size
        });
      }
      setChatStats(chatStatsData);

      // Generate plan usage data
      const planUsageData = planSuggestionsSnapshot.docs.reduce((acc, doc) => {
        const planName = doc.data().planData?.name || 'Unknown Plan';
        acc[planName] = (acc[planName] || 0) + 1;
        return acc;
      }, {});

      const planUsageArray = Object.entries(planUsageData)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setPlanUsage(planUsageArray);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  // Show different dashboard based on user role
  if (currentUser?.role !== 'dietitian') {
    return (
      <div className="w-full pr-2">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {currentUser?.displayName || 'User'}!
          </h1>
          <p className="text-gray-600">Your health journey dashboard</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
            <h2 className="text-sm font-medium text-gray-500">Active Chats</h2>
            <p className="text-3xl font-bold text-blue-600">{stats.activeChats}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
            <h2 className="text-sm font-medium text-gray-500">Plans Received</h2>
            <p className="text-3xl font-bold text-green-600">0</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
            <h2 className="text-sm font-medium text-gray-500">Goals Achieved</h2>
            <p className="text-3xl font-bold text-purple-600">0</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Get Started</h2>
          <div className="text-center py-8 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p>Start by finding a dietitian to chat with!</p>
            <p className="text-sm mt-1">Browse available dietitians and begin your health journey.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pr-2">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {currentUser?.displayName || 'Dietitian'}!
        </h1>
        <p className="text-gray-600">Here's your practice overview</p>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <h2 className="text-sm font-medium text-gray-500">My Clients</h2>
          <p className="text-3xl font-bold text-blue-600">{stats.myClients}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <h2 className="text-sm font-medium text-gray-500">Active Chats</h2>
          <p className="text-3xl font-bold text-green-600">{stats.activeChats}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
          <h2 className="text-sm font-medium text-gray-500">My Plans</h2>
          <p className="text-3xl font-bold text-purple-600">{stats.totalPlans}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
          <h2 className="text-sm font-medium text-gray-500">Plans Suggested</h2>
          <p className="text-3xl font-bold text-yellow-600">{stats.plansSuggested}</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-indigo-500">
          <h2 className="text-sm font-medium text-gray-500">Messages (7d)</h2>
          <p className="text-3xl font-bold text-indigo-600">{stats.messagesThisWeek}</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
          <h2 className="text-sm font-medium text-gray-500">Response Rate</h2>
          <p className="text-3xl font-bold text-red-600">{stats.responseRate}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Chat Activity Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Weekly Chat Activity</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chatStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="messages" fill="#4f46e5" name="Messages" />
                <Bar dataKey="chats" fill="#10b981" name="Active Chats" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Plan Usage Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Most Suggested Plans</h2>
          <div className="h-64">
            {planUsage.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planUsage}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {planUsage.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p>No plans suggested yet</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
        </div>
        <div className="p-6">
          {recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    activity.type === 'chat' ? 'bg-blue-100' : 'bg-green-100'
                  }`}>
                    {activity.type === 'chat' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                    <p className="text-sm text-gray-500">
                      {activity.time ? activity.time.toLocaleString() : 'Recently'}
                    </p>
                  </div>
                  {activity.status && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      activity.status === 'active' ? 'bg-green-100 text-green-800' :
                      activity.status === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {activity.status}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>No recent activity</p>
              <p className="text-sm mt-1">Start chatting with clients or create nutrition plans to see activity here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}