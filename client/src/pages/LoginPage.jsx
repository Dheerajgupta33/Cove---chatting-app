import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Mail } from 'lucide-react';
import AuthLayout from './AuthLayout';
import GoogleButton from './GoogleButton';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { loginUser } from '../features/auth/authSlice';
import { loginSchema } from '../lib/schemas';

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values) => {
    setError('');
    try {
      await dispatch(loginUser(values)).unwrap();
      navigate(location.state?.from?.pathname || '/app/chat', { replace: true });
    } catch (e) { setError(e?.message || 'Could not sign in'); }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to pick up where you left off." seoTitle="Sign in"
      footer={<>New to Cove? <Link to="/register" className="font-semibold text-brand hover:underline">Create an account</Link></>}>
      <GoogleButton />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input label="Email or username" icon={Mail} autoComplete="username" placeholder="you@example.com" error={errors.identifier?.message} {...register('identifier')} />
        <div>
          <Input label="Password" type="password" icon={Lock} autoComplete="current-password" placeholder="Your password" error={errors.password?.message} {...register('password')} />
          <div className="mt-2 text-right"><Link to="/forgot-password" className="text-sm font-medium text-brand hover:underline">Forgot password?</Link></div>
        </div>
        {error && <p role="alert" className="rounded-xl bg-coral/10 px-3.5 py-2.5 text-sm text-coral">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>Sign in</Button>
      </form>
    </AuthLayout>
  );
}
