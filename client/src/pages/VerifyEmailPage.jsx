import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import AuthLayout from './AuthLayout';
import { buttonStyles } from '../components/common/Button';
import { authService } from '../services/authService';
import { userPatched } from '../features/auth/authSlice';
import { errorMessage } from '../lib/utils';

export default function VerifyEmailPage() {
  const { token } = useParams();
  const dispatch = useDispatch();
  const signedIn = useSelector((s) => s.auth.status === 'authenticated');
  const [state, setState] = useState({ status: 'loading', message: '' });
  const ran = useRef(false); // the link is single-use, so never call twice (StrictMode)

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    authService.verifyEmail(token)
      .then(({ data }) => { setState({ status: 'ok', message: data.message }); dispatch(userPatched({ isVerified: true })); })
      .catch((e) => setState({ status: 'error', message: errorMessage(e) }));
  }, [token, dispatch]);

  return (
    <AuthLayout title={state.status === 'ok' ? 'Email confirmed' : state.status === 'error' ? 'Link problem' : 'Confirming your email…'} seoTitle="Confirm email">
      <div className="flex flex-col items-center rounded-3xl border border-line bg-surface p-8 text-center">
        {state.status === 'loading' && <Loader2 className="h-10 w-10 animate-spin text-brand" />}
        {state.status === 'ok' && <CheckCircle2 className="h-12 w-12 text-emerald-400" />}
        {state.status === 'error' && <XCircle className="h-12 w-12 text-coral" />}
        {state.message && <p className="mt-4 text-sm text-sub">{state.message}</p>}
        {state.status !== 'loading' && <Link to={signedIn ? '/app/chat' : '/login'} className={buttonStyles({ className: 'mt-6' })}>{signedIn ? 'Open Cove' : 'Go to sign in'}</Link>}
      </div>
    </AuthLayout>
  );
}
