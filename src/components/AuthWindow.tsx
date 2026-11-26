import { AuthForm } from './AuthForm';
import { AuthShell } from './AuthShell';
import { useApp } from '../providers/AppProvider';
import { useNavigate } from 'react-router-dom';
export function AuthWindow() {
  const { user, auth, isDevMode } = useApp();
  const navigate = useNavigate();
  if (user) return null;
  return <AuthShell appName="Dailio" logo="/dailio.svg" modal>
    <AuthForm allowUsername={isDevMode} onResetPassword={auth.resetPassword} onAuthenticate={async (email, password, signUpMode) => {
      await (signUpMode ? auth.signUp(email, password) : auth.signIn(email, password));
      navigate('/today');
    }} />
  </AuthShell>;
}
