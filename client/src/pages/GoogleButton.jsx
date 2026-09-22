import { useDispatch } from 'react-redux';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { googleLogin } from '../features/auth/authSlice';

export const googleEnabled = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

// Renders Google's official button; the returned ID token is verified server-side.
export default function GoogleButton() {
  const dispatch = useDispatch();
  if (!googleEnabled) return null;
  return (
    <>
      <div className="flex justify-center">
        <GoogleLogin
          onSuccess={(res) => dispatch(googleLogin(res.credential)).unwrap().catch((e) => toast.error(e?.message || 'Google sign-in failed'))}
          onError={() => toast.error('Google sign-in was cancelled')}
          shape="pill" text="continue_with" width="360"
        />
      </div>
      <div className="my-6 flex items-center gap-3 text-xs text-sub"><span className="h-px flex-1 bg-line" />or use your email<span className="h-px flex-1 bg-line" /></div>
    </>
  );
}
