import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [areasOfExpertise, setAreasOfExpertise] = useState([]);
  const [dietApproaches, setDietApproaches] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // For multi-step form
  const { signup } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  // Areas of expertise options
  const expertiseOptions = [
    'Clinical Nutrition',
    'Sports Nutrition',
    'Pediatric Nutrition',
    'Renal Diets',
    'Weight Management',
    'Eating Disorders',
    'Diabetic Nutrition',
    'Geriatric Nutrition',
    'Oncology Nutrition'
  ];

  // Diet approaches options
  const dietOptions = [
    'Ketogenic',
    'Mediterranean',
    'Vegan / Plant-Based',
    'Low FODMAP',
    'Intermittent Fasting',
    'Gluten-Free'
  ];

  // Handle expertise checkbox changes
  const handleExpertiseChange = (expertise) => {
    if (areasOfExpertise.includes(expertise)) {
      setAreasOfExpertise(areasOfExpertise.filter(item => item !== expertise));
    } else {
      setAreasOfExpertise([...areasOfExpertise, expertise]);
    }
  };

  // Handle diet approach checkbox changes
  const handleDietChange = (diet) => {
    if (dietApproaches.includes(diet)) {
      setDietApproaches(dietApproaches.filter(item => item !== diet));
    } else {
      setDietApproaches([...dietApproaches, diet]);
    }
  };

  // Handle profile photo upload with resizing
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Create an image element to resize the image
      const img = new Image();
      img.onload = () => {
        // Create a canvas to resize the image
        const canvas = document.createElement('canvas');
        
        // Calculate new dimensions (max 300x300 pixels)
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        
        // Resize the image
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to base64 with reduced quality
        const resizedImage = canvas.toDataURL('image/jpeg', 0.7); // 70% quality JPEG
        setProfilePhoto(resizedImage);
      };
      
      // Load the image from the file
      img.src = URL.createObjectURL(file);
    }
  };

  // Handle form submission
  async function handleSubmit(e) {
    e.preventDefault();
    
    try {
      setError('');
      setLoading(true);
      
      // Create user with all the additional information
      await signup(
        email, 
        password, 
        name, 
        profilePhoto, 
        areasOfExpertise, 
        dietApproaches
      );
      
      navigate('/dashboard');
    } catch (error) {
      setError('Failed to create an account.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  // Handle next step - separate from form submission
  const goToNextStep = () => {
    setStep(step + 1);
  };

  // Handle previous step
  const goToPrevStep = () => {
    setStep(step - 1);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-${theme.colors.background.light} py-12 px-4 sm:px-6 lg:px-8`}>
      <div className={`max-w-md w-full space-y-8 bg-${theme.card.background} p-8 rounded-xl shadow-lg`}>
        <div>
          <h2 className={`mt-6 text-center text-3xl font-extrabold text-${theme.colors.text.dark}`}>
            Create your account
          </h2>
          <p className={`mt-2 text-center text-sm text-${theme.colors.text.muted}`}>
            Join Healthify's professional dietitian portal
          </p>
        </div>
        
        {error && (
          <div className={`p-3 rounded-md bg-${theme.colors.danger} bg-opacity-10 text-${theme.colors.danger}`}>
            {error}
          </div>
        )}
        
        {/* Step indicator */}
        <div className="flex justify-center space-x-4 mb-6">
          {[1, 2, 3].map((stepNumber) => (
            <div key={stepNumber} className="flex flex-col items-center">
              <div 
                className={`h-8 w-8 rounded-full flex items-center justify-center ${
                  step === stepNumber 
                    ? 'bg-indigo-600 text-white' 
                    : stepNumber < step 
                      ? 'bg-indigo-200 text-indigo-800' 
                      : 'bg-gray-200 text-gray-600'
                }`}
              >
                {stepNumber}
              </div>
              <div className="text-xs mt-1 text-gray-500">
                {stepNumber === 1 ? 'Basic Info' : stepNumber === 2 ? 'Expertise' : 'Diet Approaches'}
              </div>
            </div>
          ))}
        </div>
        
        {/* Step 1: Basic Information */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full name</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Your full name"
              />
            </div>
            
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-gray-700">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Your email address"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Create a password"
              />
            </div>
            
            <div>
              <label htmlFor="profile-photo" className="block text-sm font-medium text-gray-700">Profile Photo</label>
              <div className="mt-1 flex items-center space-x-4">
                <div className="flex-shrink-0">
                  {profilePhoto ? (
                    <img 
                      src={profilePhoto} 
                      alt="Profile preview" 
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                      <svg className="h-8 w-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                  )}
                </div>
                <label className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  Upload Photo
                  <input 
                    id="profile-photo" 
                    name="profile-photo" 
                    type="file" 
                    accept="image/*"
                    className="sr-only"
                    onChange={handlePhotoChange}
                  />
                </label>
              </div>
            </div>
            
            <div className="pt-4">
              <button
                type="button"
                onClick={goToNextStep}
                disabled={!name || !email || !password}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
        
        {/* Step 2: Areas of Expertise */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Areas of Expertise</h3>
            <p className="text-sm text-gray-500">Select all that apply to your practice</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {expertiseOptions.map((expertise) => (
                <div key={expertise} className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id={`expertise-${expertise}`}
                      name={`expertise-${expertise}`}
                      type="checkbox"
                      checked={areasOfExpertise.includes(expertise)}
                      onChange={() => handleExpertiseChange(expertise)}
                      className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor={`expertise-${expertise}`} className="font-medium text-gray-700">
                      {expertise}
                    </label>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={goToPrevStep}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={goToNextStep}
                className="inline-flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Next
              </button>
            </div>
          </div>
        )}
        
        {/* Step 3: Diet Approaches */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Diet Approaches Used</h3>
            <p className="text-sm text-gray-500">Select all that you use in your practice</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {dietOptions.map((diet) => (
                <div key={diet} className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id={`diet-${diet}`}
                      name={`diet-${diet}`}
                      type="checkbox"
                      checked={dietApproaches.includes(diet)}
                      onChange={() => handleDietChange(diet)}
                      className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor={`diet-${diet}`} className="font-medium text-gray-700">
                      {diet}
                    </label>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={goToPrevStep}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Previous
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {loading ? <LoadingSpinner /> : 'Sign up'}
              </button>
            </div>
          </form>
        )}
        
        <div className="text-center mt-4">
          <Link to="/login" className={`font-medium text-${theme.colors.primary} hover:text-${theme.button.primaryHover}`}>
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
