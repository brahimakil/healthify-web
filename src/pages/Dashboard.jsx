import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Dashboard() {
  const auth = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalMealEntries: 0,
    totalWaterEntries: 0,
    totalWorkouts: 0
  });
  
  const [nutritionData, setNutritionData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!auth || !auth.currentUser) return;
      
      try {
        // Count total users
        const usersQuery = query(collection(db, 'users'), where('role', '==', 'user'));
        const userSnapshot = await getDocs(usersQuery);
        const totalUsers = userSnapshot.size;
        
        // Count active users (users with entries in the last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const mealQuery = query(collection(db, 'meal_entries'), where('createdAt', '>=', sevenDaysAgo));
        const mealSnapshot = await getDocs(mealQuery);
        
        // Count unique users from meal entries
        const activeUserIds = new Set();
        mealSnapshot.forEach(doc => {
          activeUserIds.add(doc.data().userId);
        });
        
        // Get total counts
        const waterQuery = query(collection(db, 'waterEntries'));
        const waterSnapshot = await getDocs(waterQuery);
        
        const workoutQuery = query(collection(db, 'workouts'));
        const workoutSnapshot = await getDocs(workoutQuery);
        
        setStats({
          totalUsers,
          activeUsers: activeUserIds.size,
          totalMealEntries: mealSnapshot.size,
          totalWaterEntries: waterSnapshot.size,
          totalWorkouts: workoutSnapshot.size
        });
        
        // Generate sample nutrition data for the chart
        const mockNutritionData = [
          { date: 'Mon', calories: 2100, protein: 120, carbs: 240, fat: 70 },
          { date: 'Tue', calories: 2200, protein: 130, carbs: 220, fat: 75 },
          { date: 'Wed', calories: 2050, protein: 125, carbs: 210, fat: 72 },
          { date: 'Thu', calories: 2300, protein: 140, carbs: 230, fat: 80 },
          { date: 'Fri', calories: 2150, protein: 135, carbs: 215, fat: 74 },
          { date: 'Sat', calories: 1900, protein: 110, carbs: 190, fat: 65 },
          { date: 'Sun', calories: 2000, protein: 120, carbs: 200, fat: 70 },
        ];
        
        setNutritionData(mockNutritionData);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchDashboardData();
  }, [auth]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="w-full pr-2">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Dietitian Dashboard</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-sm font-medium text-gray-500">Total Users</h2>
          <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-sm font-medium text-gray-500">Active Users (7d)</h2>
          <p className="text-3xl font-bold text-gray-900">{stats.activeUsers}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-sm font-medium text-gray-500">Total Meal Entries</h2>
          <p className="text-3xl font-bold text-gray-900">{stats.totalMealEntries}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-sm font-medium text-gray-500">Total Water Entries</h2>
          <p className="text-3xl font-bold text-gray-900">{stats.totalWaterEntries}</p>
        </div>
      </div>
      
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Average Nutrition Intake (Last 7 Days)</h2>
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={nutritionData}
              margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="calories" stroke="#4f46e5" strokeWidth={2} />
              <Line type="monotone" dataKey="protein" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="carbs" stroke="#f59e0b" strokeWidth={2} />
              <Line type="monotone" dataKey="fat" stroke="#ef4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Macronutrient Distribution</h2>
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={nutritionData}
              margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="protein" fill="#10b981" />
              <Bar dataKey="carbs" fill="#f59e0b" />
              <Bar dataKey="fat" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}