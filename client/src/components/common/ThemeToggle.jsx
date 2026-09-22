import { useDispatch, useSelector } from 'react-redux';
import { Moon, Sun } from 'lucide-react';
import { IconButton } from './Button';
import { themeSet } from '../../features/ui/uiSlice';
import { userService } from '../../services/userService';
import { isDarkNow } from '../../hooks/useTheme';

export default function ThemeToggle({ className }) {
  const dispatch = useDispatch();
  useSelector((s) => s.ui.theme); // re-render when the theme changes
  const dark = isDarkNow();
  const toggle = () => {
    const next = dark ? 'light' : 'dark';
    dispatch(themeSet(next));
    userService.updateSettings({ theme: next }).catch(() => {}); // best effort (fails silently when signed out)
  };
  return (
    <IconButton label={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggle} className={className}>
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </IconButton>
  );
}
