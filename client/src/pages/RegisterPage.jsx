import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AtSign, Lock, Mail, MailCheck, User } from 'lucide-react';
import AuthLayout from './AuthLayout';
import GoogleButton from './GoogleButton';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { registerUser } from '../features/auth/authSlice';
import { registerSchema } from '../lib/schemas';

export default function RegisterPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(registerSchema) });

  const onSubmit = async ({ confirm, ...values }) => {
    setError('');
    try {
      const res = await dispatch(registerUser(values)).unwrap();
      if (res.requiresVerification) setSentTo(values.email); else navigate('/app/chat', { replace: true });
    } catch (e) { setError(e?.message || 'Could not create your account'); }
  };

  if (sentTo) {
    return (
      <AuthLayout title="Check your inbox" seoTitle="Confirm your email" subtitle={`We sent a confirmation link to ${sentTo}.`}>
        <div className="flex flex-col items-center rounded-3xl border border-line bg-surface p-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-brand/15 text-brand"><MailCheck className="h-8 w-8" /></span>
          <p className="mt-4 text-sm text-sub">Open the link to activate your account, then sign in. It can take a minute to arrive.</p>
          <Button className="mt-6" onClick={() => navigate('/login')}>Go to sign in</Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create your account" subtitle="It takes less than a minute." seoTitle="Create account"
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-brand hover:underline">Sign in</Link></>}>
      <GoogleButton />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Full name" icon={User} autoComplete="name" placeholder="Ada Lovelace" error={errors.name?.message} {...register('name')} />
          <Input label="Username" icon={AtSign} autoComplete="username" placeholder="ada_l" error={errors.username?.message} {...register('username')} />
        </div>
        <Input label="Email" type="email" icon={Mail} autoComplete="email" placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
        <Input label="Password" type="password" icon={Lock} autoComplete="new-password" placeholder="8+ characters, with a number" error={errors.password?.message} {...register('password')} />
        <Input label="Confirm password" type="password" icon={Lock} autoComplete="new-password" placeholder="Repeat your password" error={errors.confirm?.message} {...register('confirm')} />
        {error && <p role="alert" className="rounded-xl bg-coral/10 px-3.5 py-2.5 text-sm text-coral">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>Create account</Button>
      </form>
    </AuthLayout>
  );
}
