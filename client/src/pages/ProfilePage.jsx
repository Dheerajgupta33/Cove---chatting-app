import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Activity, AtSign, BadgeCheck, Camera, KeyRound, User } from 'lucide-react';
import Avatar from '../components/common/Avatar';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Seo from '../components/common/Seo';
import { changePassword, updateAvatar, updateProfile } from '../features/auth/authSlice';
import { userService } from '../services/userService';
import { changePasswordSchema, profileSchema } from '../lib/schemas';
import { relative } from '../lib/time';

const PRESETS = [['💬', 'Available'], ['🎧', 'Focusing'], ['🍽️', 'At lunch'], ['🚗', 'Commuting'], ['🌴', 'On vacation'], ['🌙', 'Do not disturb']];
const ACTION_LABELS = { 'auth.login': 'Signed in', 'auth.register': 'Created account', 'auth.change_password': 'Changed password', 'auth.reset_password': 'Reset password', 'auth.forgot_password': 'Requested a password reset', 'profile.update': 'Updated profile', 'profile.avatar': 'Changed profile photo', 'user.block': 'Blocked a user', 'backup.export': 'Exported chat backup', 'report.create': 'Submitted a report' };

function Card({ icon: Icon, title, children }) {
  return (
    <section className="rounded-3xl border border-line bg-surface p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-2.5 font-bold"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/12 text-brand"><Icon className="h-4 w-4" /></span>{title}</h2>
      {children}
    </section>
  );
}

export default function ProfilePage() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const fileInput = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [emoji, setEmoji] = useState(user.statusEmoji || '');
  const [statusText, setStatusText] = useState(user.statusText || '');
  const [savingStatus, setSavingStatus] = useState(false);
  const [activity, setActivity] = useState(null);

  const profile = useForm({ resolver: zodResolver(profileSchema), defaultValues: { name: user.name, username: user.username, bio: user.bio || '' } });
  const password = useForm({ resolver: zodResolver(changePasswordSchema) });

  useEffect(() => { userService.activity().then(({ data }) => setActivity(data)).catch(() => setActivity(false)); }, []);

  const onAvatar = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try { await dispatch(updateAvatar(file)).unwrap(); toast.success('Profile photo updated'); }
    catch (err) { toast.error(err?.message || 'Upload failed'); } finally { setUploading(false); }
  };

  const saveProfile = async (values) => {
    try { await dispatch(updateProfile(values)).unwrap(); toast.success('Profile saved'); profile.reset(values); }
    catch (err) { if (/username/i.test(err?.message)) profile.setError('username', { message: err.message }); else toast.error(err?.message || 'Could not save'); }
  };

  const saveStatus = async (e = emoji, t = statusText) => {
    setSavingStatus(true);
    try { await dispatch(updateProfile({ statusEmoji: e, statusText: t })).unwrap(); toast.success(t || e ? 'Status updated' : 'Status cleared'); }
    catch (err) { toast.error(err?.message || 'Could not save'); } finally { setSavingStatus(false); }
  };

  const savePassword = async ({ confirm, ...values }) => {
    try { await dispatch(changePassword(values)).unwrap(); toast.success('Password changed. Other devices were signed out.'); password.reset(); }
    catch (err) { toast.error(err?.message || 'Could not change password'); }
  };

  return (
    <div className="h-full overflow-y-auto">
      <Seo title="Your profile" noindex />
      <div className="mx-auto max-w-3xl space-y-4 p-5 pb-24 md:p-10">
        <section className="overflow-hidden rounded-3xl border border-line bg-surface">
          <div className="h-28 bg-brand-gradient sm:h-36" />
          <div className="flex flex-col gap-4 px-5 pb-6 sm:flex-row sm:items-end sm:px-8">
            <div className="relative -mt-14 w-fit">
              <Avatar src={user.avatar?.url} name={user.name} size="2xl" className="ring-4 ring-surface" />
              <button onClick={() => fileInput.current.click()} disabled={uploading} aria-label="Change profile photo" className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white shadow-glow disabled:opacity-60">
                <Camera className="h-4 w-4" />
              </button>
              <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={onAvatar} />
            </div>
            <div className="min-w-0 pb-1">
              <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold">{user.name}{user.isVerified && <BadgeCheck className="h-5 w-5 text-brand" aria-label="Email verified" />}</h1>
              <p className="text-sm text-sub">@{user.username} · {user.email}</p>
              {(user.statusEmoji || user.statusText) && <p className="mt-2 inline-block rounded-full bg-surface-2 px-3 py-1 text-sm">{user.statusEmoji} {user.statusText}</p>}
            </div>
          </div>
        </section>

        <Card icon={User} title="Profile">
          <form onSubmit={profile.handleSubmit(saveProfile)} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Full name" error={profile.formState.errors.name?.message} {...profile.register('name')} />
              <Input label="Username" icon={AtSign} error={profile.formState.errors.username?.message} {...profile.register('username')} />
            </div>
            <div>
              <label htmlFor="bio" className="mb-1.5 block text-sm font-medium">Bio</label>
              <textarea id="bio" rows={3} className="field resize-none" placeholder="A line about you" {...profile.register('bio')} />
              {profile.formState.errors.bio && <p className="mt-1.5 text-xs text-coral">{profile.formState.errors.bio.message}</p>}
            </div>
            <div className="flex justify-end"><Button type="submit" loading={profile.formState.isSubmitting} disabled={!profile.formState.isDirty}>Save profile</Button></div>
          </form>
        </Card>

        <Card icon={Activity} title="Custom status">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(([e, t]) => (
              <button key={t} onClick={() => { setEmoji(e); setStatusText(t); saveStatus(e, t); }} className="rounded-full border border-line px-3 py-1.5 text-sm transition hover:border-brand hover:bg-brand/10">{e} {t}</button>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <input className="field w-16 text-center text-lg" maxLength={4} value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="🙂" aria-label="Status emoji" />
            <input className="field" maxLength={80} value={statusText} onChange={(e) => setStatusText(e.target.value)} placeholder="What are you up to?" aria-label="Status text" />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setEmoji(''); setStatusText(''); saveStatus('', ''); }}>Clear</Button>
            <Button variant="secondary" loading={savingStatus} onClick={() => saveStatus()}>Save status</Button>
          </div>
        </Card>

        <Card icon={KeyRound} title={user.hasPassword ? 'Change password' : 'Set a password'}>
          <form onSubmit={password.handleSubmit(savePassword)} className="space-y-4" noValidate>
            {user.hasPassword && <Input label="Current password" type="password" autoComplete="current-password" error={password.formState.errors.currentPassword?.message} {...password.register('currentPassword')} />}
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="New password" type="password" autoComplete="new-password" error={password.formState.errors.newPassword?.message} {...password.register('newPassword')} />
              <Input label="Confirm new password" type="password" autoComplete="new-password" error={password.formState.errors.confirm?.message} {...password.register('confirm')} />
            </div>
            <div className="flex justify-end"><Button type="submit" loading={password.formState.isSubmitting}>Update password</Button></div>
          </form>
        </Card>

        <Card icon={Activity} title="Activity">
          {activity === null && <p className="text-sm text-sub">Loading…</p>}
          {activity && (
            <>
              <dl className="grid grid-cols-3 gap-3 text-center">
                {[['Sign-ins', activity.activity?.loginCount ?? 0], ['Messages sent', activity.activity?.messagesSent ?? 0], ['Member since', activity.joinedAt ? format(new Date(activity.joinedAt), 'MMM yyyy') : '-']].map(([k, v]) => (
                  <div key={k} className="rounded-2xl bg-surface-2 p-3"><dd className="font-display text-xl font-extrabold tabular-nums">{v}</dd><dt className="text-xs text-sub">{k}</dt></div>
                ))}
              </dl>
              <ul className="mt-4 divide-y divide-line">
                {activity.logs.map((l) => (
                  <li key={l._id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><span>{ACTION_LABELS[l.action] || l.message || l.action}</span><time className="shrink-0 text-xs text-sub">{relative(l.createdAt)}</time></li>
                ))}
                {!activity.logs.length && <li className="py-3 text-sm text-sub">No activity yet.</li>}
              </ul>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
