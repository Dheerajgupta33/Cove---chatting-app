import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Lock } from 'lucide-react';
import AuthLayout from './AuthLayout';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { authService } from '../services/authService';
import { resetSchema } from '../lib/schemas';
import { errorMessage } from '../lib/utils';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(resetSchema) });

  const onSubmit = async ({ password }) => {
    setError('');
    try {
      await authService.resetPassword(token, password);
      toast.success('Password updated. Sign in with your new password.');
      navigate('/login', { replace: true });
    } catch (e) { setError(errorMessage(e)); }
  };

  return (
    <AuthLayout title="Choose a new password" seoTitle="New password" subtitle="You will be signed out of all other devices." footer={<Link to="/login" className="font-semibold text-brand hover:underline">Back to sign in</Link>}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input label="New password" type="password" icon={Lock} autoComplete="new-password" placeholder="8+ characters, with a number" error={errors.password?.message} {...register('password')} />
        <Input label="Confirm new password" type="password" icon={Lock} autoComplete="new-password" placeholder="Repeat your password" error={errors.confirm?.message} {...register('confirm')} />
        {error && <p role="alert" className="rounded-xl bg-coral/10 px-3.5 py-2.5 text-sm text-coral">{error} <Link to="/forgot-password" className="font-semibold underline">Request a new link</Link></p>}
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>Update password</Button>
      </form>
    </AuthLayout>
  );
}
