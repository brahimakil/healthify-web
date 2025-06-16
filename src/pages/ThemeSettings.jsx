import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeSettings() {
  const { currentTheme, availableThemes, changeTheme, theme } = useTheme();
  
  return (
    <div className="p-6">
      <h1 className={`text-2xl font-bold mb-6 text-${theme.colors.text.dark}`}>Theme Settings</h1>
      
      <div className={`bg-${theme.card.background} shadow rounded-lg p-6 mb-6`}>
        <h2 className={`text-xl font-semibold mb-4 text-${theme.colors.text.dark}`}>Choose Theme</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableThemes.map((themeOption) => (
            <button
              key={themeOption.id}
              onClick={() => changeTheme(themeOption.id)}
              className={`p-4 rounded-lg border-2 flex flex-col items-center ${
                currentTheme === themeOption.id 
                  ? `border-${theme.colors.primary} bg-${theme.colors.primary} bg-opacity-10` 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="w-full flex mb-3 gap-2">
                <div className={`w-full h-8 rounded-md bg-${themeOption.id === 'default' ? 'indigo' : themeOption.id}-800`}></div>
                <div className={`w-full h-8 rounded-md bg-${themeOption.id === 'default' ? 'indigo' : themeOption.id}-600`}></div>
                <div className={`w-full h-8 rounded-md bg-${themeOption.id === 'default' ? 'indigo' : themeOption.id}-400`}></div>
              </div>
              <span className={`text-sm font-medium ${currentTheme === themeOption.id ? `text-${theme.colors.primary}` : ''}`}>
                {themeOption.name}
              </span>
            </button>
          ))}
        </div>
      </div>
      
      <div className={`bg-${theme.card.background} shadow rounded-lg p-6`}>
        <h2 className={`text-xl font-semibold mb-4 text-${theme.colors.text.dark}`}>Preview</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className={`text-lg font-medium mb-2 text-${theme.colors.text.dark}`}>Buttons</h3>
            <div className="flex flex-wrap gap-2">
              <button className={`px-4 py-2 bg-${theme.button.primary} text-white rounded-md hover:bg-${theme.button.primaryHover}`}>
                Primary Button
              </button>
              <button className={`px-4 py-2 bg-${theme.button.secondary} text-white rounded-md hover:bg-${theme.button.secondaryHover}`}>
                Secondary Button
              </button>
              <button className={`px-4 py-2 border border-${theme.colors.primary} text-${theme.colors.primary} rounded-md hover:bg-${theme.colors.primary} hover:bg-opacity-10`}>
                Outlined Button
              </button>
            </div>
          </div>
          
          <div>
            <h3 className={`text-lg font-medium mb-2 text-${theme.colors.text.dark}`}>Alert Colors</h3>
            <div className="space-y-2">
              <div className={`p-3 bg-${theme.colors.success} bg-opacity-10 text-${theme.colors.success} rounded-md`}>
                Success message
              </div>
              <div className={`p-3 bg-${theme.colors.danger} bg-opacity-10 text-${theme.colors.danger} rounded-md`}>
                Error message
              </div>
              <div className={`p-3 bg-${theme.colors.warning} bg-opacity-10 text-${theme.colors.warning} rounded-md`}>
                Warning message
              </div>
              <div className={`p-3 bg-${theme.colors.info} bg-opacity-10 text-${theme.colors.info} rounded-md`}>
                Info message
              </div>
            </div>
          </div>
          
          <div>
            <h3 className={`text-lg font-medium mb-2 text-${theme.colors.text.dark}`}>Typography</h3>
            <div className="space-y-2">
              <h1 className={`text-2xl font-bold text-${theme.colors.text.dark}`}>Heading 1</h1>
              <h2 className={`text-xl font-bold text-${theme.colors.text.dark}`}>Heading 2</h2>
              <h3 className={`text-lg font-bold text-${theme.colors.text.dark}`}>Heading 3</h3>
              <p className={`text-${theme.colors.text.light}`}>Regular paragraph text</p>
              <p className={`text-sm text-${theme.colors.text.muted}`}>Small muted text</p>
              <p>Text with <a href="#" className={`text-${theme.colors.primary} hover:underline`}>link</a> inside</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 