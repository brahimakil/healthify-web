import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Plans() {
  const { currentUser } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // Form states
  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    category: 'weight-loss',
    days: Array(7).fill().map((_, i) => ({
      day: i + 1,
      dayName: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i],
      calories: 2000,
      protein: 150,
      carbs: 200,
      fat: 80,
      fiber: 25,
      waterIntake: 8,
      sleepHours: 8,
      workouts: []
    }))
  });

  const [workoutForm, setWorkoutForm] = useState({
    name: '',
    duration: 30,
    type: 'cardio',
    intensity: 'moderate',
    calories: 200
  });

  const categories = [
    { value: 'weight-loss', label: 'Weight Loss' },
    { value: 'muscle-gain', label: 'Muscle Gain' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'therapeutic', label: 'Therapeutic' },
    { value: 'sports', label: 'Sports Nutrition' }
  ];

  const workoutTypes = [
    { value: 'cardio', label: 'Cardio' },
    { value: 'strength', label: 'Strength Training' },
    { value: 'flexibility', label: 'Flexibility/Yoga' },
    { value: 'hiit', label: 'HIIT' },
    { value: 'sports', label: 'Sports Activity' }
  ];

  useEffect(() => {
    loadPlans();
    loadDefaultPlans();
  }, [currentUser]);

  const loadPlans = async () => {
    if (!currentUser) return;

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

      setPlans([...userPlans, ...defaultPlans]);
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultPlans = async () => {
    // Check if default plans exist, if not create them
    const defaultPlansQuery = query(
      collection(db, 'nutrition_plans'),
      where('isDefault', '==', true)
    );
    const defaultPlansSnapshot = await getDocs(defaultPlansQuery);
    
    if (defaultPlansSnapshot.empty) {
      await createDefaultPlans();
    }
  };

  const createDefaultPlans = async () => {
    const defaultPlans = [
      {
        name: 'Healthy Weight Loss Plan',
        description: 'A balanced 7-day plan for sustainable weight loss with moderate exercise',
        category: 'weight-loss',
        isDefault: true,
        createdAt: serverTimestamp(),
        days: Array(7).fill().map((_, i) => ({
          day: i + 1,
          dayName: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i],
          calories: 1800,
          protein: 120,
          carbs: 180,
          fat: 60,
          fiber: 30,
          waterIntake: 10,
          sleepHours: 8,
          workouts: i % 2 === 0 ? [
            { name: 'Morning Walk', duration: 30, type: 'cardio', intensity: 'moderate', calories: 150 }
          ] : i === 1 || i === 3 || i === 5 ? [
            { name: 'Strength Training', duration: 45, type: 'strength', intensity: 'moderate', calories: 200 }
          ] : []
        }))
      },
      {
        name: 'Muscle Building Plan',
        description: 'High-protein plan with strength training for muscle gain',
        category: 'muscle-gain',
        isDefault: true,
        createdAt: serverTimestamp(),
        days: Array(7).fill().map((_, i) => ({
          day: i + 1,
          dayName: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i],
          calories: 2400,
          protein: 180,
          carbs: 240,
          fat: 80,
          fiber: 25,
          waterIntake: 12,
          sleepHours: 8,
          workouts: i === 6 ? [] : [
            { 
              name: i % 2 === 0 ? 'Upper Body Strength' : 'Lower Body Strength', 
              duration: 60, 
              type: 'strength', 
              intensity: 'high', 
              calories: 300 
            }
          ]
        }))
      },
      {
        name: 'Mediterranean Diet Plan',
        description: 'Heart-healthy Mediterranean-style eating plan',
        category: 'maintenance',
        isDefault: true,
        createdAt: serverTimestamp(),
        days: Array(7).fill().map((_, i) => ({
          day: i + 1,
          dayName: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i],
          calories: 2000,
          protein: 140,
          carbs: 200,
          fat: 90,
          fiber: 35,
          waterIntake: 8,
          sleepHours: 8,
          workouts: i % 3 === 0 ? [
            { name: 'Mediterranean Walk', duration: 45, type: 'cardio', intensity: 'moderate', calories: 180 }
          ] : []
        }))
      }
    ];

    for (const plan of defaultPlans) {
      await addDoc(collection(db, 'nutrition_plans'), plan);
    }
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      await addDoc(collection(db, 'nutrition_plans'), {
        ...planForm,
        dietitianId: currentUser.uid,
        dietitianName: currentUser.displayName,
        isDefault: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setShowCreateModal(false);
      resetPlanForm();
      loadPlans();
    } catch (error) {
      console.error('Error creating plan:', error);
    }
  };

  const handleDeletePlan = async (planId, isDefault) => {
    if (isDefault) {
      alert('Cannot delete default plans');
      return;
    }

    if (window.confirm('Are you sure you want to delete this plan?')) {
      try {
        await deleteDoc(doc(db, 'nutrition_plans', planId));
        loadPlans();
      } catch (error) {
        console.error('Error deleting plan:', error);
      }
    }
  };

  const resetPlanForm = () => {
    setPlanForm({
      name: '',
      description: '',
      category: 'weight-loss',
      days: Array(7).fill().map((_, i) => ({
        day: i + 1,
        dayName: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i],
        calories: 2000,
        protein: 150,
        carbs: 200,
        fat: 80,
        fiber: 25,
        waterIntake: 8,
        sleepHours: 8,
        workouts: []
      }))
    });
  };

  const addWorkoutToDay = (dayIndex) => {
    if (!workoutForm.name) return;

    const updatedDays = [...planForm.days];
    updatedDays[dayIndex].workouts.push({ ...workoutForm });
    setPlanForm({ ...planForm, days: updatedDays });
    
    setWorkoutForm({
      name: '',
      duration: 30,
      type: 'cardio',
      intensity: 'moderate',
      calories: 200
    });
  };

  const removeWorkoutFromDay = (dayIndex, workoutIndex) => {
    const updatedDays = [...planForm.days];
    updatedDays[dayIndex].workouts.splice(workoutIndex, 1);
    setPlanForm({ ...planForm, days: updatedDays });
  };

  const updateDayNutrition = (dayIndex, field, value) => {
    const updatedDays = [...planForm.days];
    updatedDays[dayIndex][field] = parseInt(value) || 0;
    setPlanForm({ ...planForm, days: updatedDays });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nutrition Plans</h1>
          <p className="text-gray-600">Create and manage 7-day nutrition and workout plans</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create New Plan
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map(plan => (
          <div key={plan.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
              </div>
              {plan.isDefault && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  Default
                </span>
              )}
            </div>
            
            <div className="mb-4">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                plan.category === 'weight-loss' ? 'bg-red-100 text-red-800' :
                plan.category === 'muscle-gain' ? 'bg-green-100 text-green-800' :
                plan.category === 'maintenance' ? 'bg-blue-100 text-blue-800' :
                plan.category === 'therapeutic' ? 'bg-purple-100 text-purple-800' :
                'bg-orange-100 text-orange-800'
              }`}>
                {categories.find(c => c.value === plan.category)?.label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <span className="text-gray-500">Avg Calories:</span>
                <p className="font-medium">{Math.round(plan.days.reduce((sum, day) => sum + day.calories, 0) / 7)}</p>
              </div>
              <div>
                <span className="text-gray-500">Avg Protein:</span>
                <p className="font-medium">{Math.round(plan.days.reduce((sum, day) => sum + day.protein, 0) / 7)}g</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedPlan(plan);
                  setShowViewModal(true);
                }}
                className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded hover:bg-gray-200 text-sm"
              >
                View Details
              </button>
              {!plan.isDefault && (
                <button
                  onClick={() => handleDeletePlan(plan.id, plan.isDefault)}
                  className="bg-red-100 text-red-700 px-3 py-2 rounded hover:bg-red-200 text-sm"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Plan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Create New Nutrition Plan</h2>
            </div>
            
            <form onSubmit={handleCreatePlan} className="p-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Plan Name</label>
                  <input
                    type="text"
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={planForm.category}
                    onChange={(e) => setPlanForm({ ...planForm, category: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows="3"
                  required
                />
              </div>

              {/* 7-Day Plan */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-4">7-Day Plan Details</h3>
                <div className="space-y-6">
                  {planForm.days.map((day, dayIndex) => (
                    <div key={dayIndex} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">
                        Day {day.day} - {day.dayName}
                      </h4>
                      
                      {/* Nutrition */}
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Calories</label>
                          <input
                            type="number"
                            value={day.calories}
                            onChange={(e) => updateDayNutrition(dayIndex, 'calories', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Protein (g)</label>
                          <input
                            type="number"
                            value={day.protein}
                            onChange={(e) => updateDayNutrition(dayIndex, 'protein', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Carbs (g)</label>
                          <input
                            type="number"
                            value={day.carbs}
                            onChange={(e) => updateDayNutrition(dayIndex, 'carbs', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Fat (g)</label>
                          <input
                            type="number"
                            value={day.fat}
                            onChange={(e) => updateDayNutrition(dayIndex, 'fat', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Fiber (g)</label>
                          <input
                            type="number"
                            value={day.fiber}
                            onChange={(e) => updateDayNutrition(dayIndex, 'fiber', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Water (cups)</label>
                          <input
                            type="number"
                            value={day.waterIntake}
                            onChange={(e) => updateDayNutrition(dayIndex, 'waterIntake', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Sleep (hrs)</label>
                          <input
                            type="number"
                            value={day.sleepHours}
                            onChange={(e) => updateDayNutrition(dayIndex, 'sleepHours', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </div>
                      </div>

                      {/* Workouts */}
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Workouts</h5>
                        {day.workouts.map((workout, workoutIndex) => (
                          <div key={workoutIndex} className="flex items-center gap-2 mb-2 p-2 bg-gray-50 rounded">
                            <span className="text-sm flex-1">
                              {workout.name} - {workout.duration}min ({workout.type}, {workout.intensity})
                            </span>
                            <button
                              type="button"
                              onClick={() => removeWorkoutFromDay(dayIndex, workoutIndex)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        
                        {/* Add Workout Form */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-2">
                          <input
                            type="text"
                            placeholder="Workout name"
                            value={workoutForm.name}
                            onChange={(e) => setWorkoutForm({ ...workoutForm, name: e.target.value })}
                            className="border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                          <input
                            type="number"
                            placeholder="Duration"
                            value={workoutForm.duration}
                            onChange={(e) => setWorkoutForm({ ...workoutForm, duration: parseInt(e.target.value) })}
                            className="border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                          <select
                            value={workoutForm.type}
                            onChange={(e) => setWorkoutForm({ ...workoutForm, type: e.target.value })}
                            className="border border-gray-300 rounded px-2 py-1 text-sm"
                          >
                            {workoutTypes.map(type => (
                              <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                          </select>
                          <select
                            value={workoutForm.intensity}
                            onChange={(e) => setWorkoutForm({ ...workoutForm, intensity: e.target.value })}
                            className="border border-gray-300 rounded px-2 py-1 text-sm"
                          >
                            <option value="low">Low</option>
                            <option value="moderate">Moderate</option>
                            <option value="high">High</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => addWorkoutToDay(dayIndex)}
                            className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetPlanForm();
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Create Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Plan Modal */}
      {showViewModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold">{selectedPlan.name}</h2>
                  <p className="text-gray-600">{selectedPlan.description}</p>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-6">
                {selectedPlan.days.map((day, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-3">
                      Day {day.day} - {day.dayName}
                    </h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center p-3 bg-blue-50 rounded">
                        <div className="text-2xl font-bold text-blue-600">{day.calories}</div>
                        <div className="text-sm text-gray-600">Calories</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded">
                        <div className="text-2xl font-bold text-green-600">{day.protein}g</div>
                        <div className="text-sm text-gray-600">Protein</div>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 rounded">
                        <div className="text-2xl font-bold text-yellow-600">{day.carbs}g</div>
                        <div className="text-sm text-gray-600">Carbs</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded">
                        <div className="text-2xl font-bold text-red-600">{day.fat}g</div>
                        <div className="text-sm text-gray-600">Fat</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                      <div>
                        <span className="text-gray-600">Fiber:</span> <strong>{day.fiber}g</strong>
                      </div>
                      <div>
                        <span className="text-gray-600">Water:</span> <strong>{day.waterIntake} cups</strong>
                      </div>
                      <div>
                        <span className="text-gray-600">Sleep:</span> <strong>{day.sleepHours} hours</strong>
                      </div>
                    </div>

                    {day.workouts.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Workouts:</h4>
                        <div className="space-y-2">
                          {day.workouts.map((workout, workoutIndex) => (
                            <div key={workoutIndex} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                              <div className="flex-1">
                                <span className="font-medium">{workout.name}</span>
                                <span className="text-gray-600 ml-2">
                                  {workout.duration} min • {workout.type} • {workout.intensity} intensity
                                </span>
                              </div>
                              <span className="text-sm text-gray-500">{workout.calories} cal</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 