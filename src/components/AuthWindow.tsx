import { AuthForm } from './AuthForm';
import { AuthShell } from './AuthShell';
import { useApp } from '../providers/AppProvider';
import { useNavigate } from 'react-router-dom';
export function AuthWindow() {
  const { user, auth, isDevMode } = useApp();
  const navigate = useNavigate();
  if (user) return null;
  return <AuthShell appName="Dailio" logo="/icon.svg" modal><AuthForm allowUsername={isDevMode} onAuthenticate={async (email, password, signUpMode) => { if (signUpMode) await auth.signUp(email, password); else await auth.signIn(email, password); navigate('/today'); }} /></AuthShell>;
}
