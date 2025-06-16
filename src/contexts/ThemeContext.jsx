import { createContext, useContext, useState, useEffect } from 'react';
import { themes, defaultTheme } from '../themes';

const ThemeContext = createContext();

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState(() => {
    const savedTheme = localStorage.getItem('healthify-theme');
    return savedTheme && themes[savedTheme] ? savedTheme : defaultTheme;
  });
  
  const theme = themes[currentTheme];
  
  const changeTheme = (themeName) => {
    if (themes[themeName]) {
      setCurrentTheme(themeName);
      localStorage.setItem('healthify-theme', themeName);
    }
  };
  
  const value = {
    currentTheme,
    theme,
    changeTheme,
    availableThemes: Object.keys(themes).map(key => ({
      id: key,
      name: themes[key].name
    }))
  };
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
} 