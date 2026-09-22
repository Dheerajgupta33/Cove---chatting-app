import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Mail, MailCheck } from 'lucide-react';
import AuthLayout from './AuthLayout';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { authService } from '../services/authService';
import { forgotSchema } from '../lib/schemas';
import { errorMessage } from '../lib/utils';

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(forgotSchema) });

  const onSubmit = async ({ email }) => {
    setError('');
    try { await authService.forgotPassword(email); setSent(true); } catch (e) { setError(errorMessage(e)); }
  };

  const back = <Link to="/login" className="inline-flex items-center gap-1.5 font-semibold text-brand hover:underline"><ArrowLeft className="h-4 w-4" />Back to sign in</Link>;

  return (
    <AuthLayout title={sent ? 'Check your inbox' : 'Forgot your password?'} seoTitle="Reset password" subtitle={sent ? 'If that email has an account, a reset link is on its way. It expires in 30 minutes.' : 'Enter your email and we will send you a link to choose a new one.'} footer={back}>
      {sent ? (
        <div className="flex justify-center"><span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand/15 text-brand"><MailCheck className="h-10 w-10" /></span></div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input label="Email" type="email" icon={Mail} autoComplete="email" placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
          {error && <p role="alert" className="rounded-xl bg-coral/10 px-3.5 py-2.5 text-sm text-coral">{error}</p>}
          <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>Send reset link</Button>
        </form>
      )}
    </AuthLayout>
  );
}
