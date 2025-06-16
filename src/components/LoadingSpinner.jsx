import { useTheme } from '../contexts/ThemeContext';

export default function LoadingSpinner() {
  const { theme } = useTheme();
  
  return (
    <div className="flex justify-center items-center h-full">
      <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-${theme.colors.primary}`}></div>
    </div>
  );
}
