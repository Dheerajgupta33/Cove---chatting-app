import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Bell, CalendarClock, Download, Lock, LogOut, Monitor, Moon, Palette, Shield, Sun } from 'lucide-react';
import Switch from '../components/common/Switch';
import Tabs from '../components/common/Tabs';
import Button from '../components/common/Button';
import Seo from '../components/common/Seo';
import MessageListModal from '../components/chat/MessageListModal';
import { logoutUser } from '../features/auth/authSlice';
import { settingsLoaded, themeSet } from '../features/ui/uiSlice';
import { userService } from '../services/userService';
import { downloadBlob, errorMessage } from '../lib/utils';

function Section({ icon: Icon, title, description, children }) {
  return (
    <section className="rounded-3xl border border-line bg-surface p-5 sm:p-6">
      <div className="mb-2 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/12 text-brand"><Icon className="h-5 w-5" /></span>
        <div><h2 className="font-bold">{title}</h2>{description && <p className="text-sm text-sub">{description}</p>}</div>
      </div>
      <div className="divide-y divide-line">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const settings = useSelector((s) => s.ui.settings);
  const theme = useSelector((s) => s.ui.theme);
  const [scheduledOpen, setScheduledOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Optimistic: update the UI first, then persist; roll back if the server refuses.
  const save = async (patch, merged) => {
    const previous = settings;
    dispatch(settingsLoaded(merged));
    try { await userService.updateSettings(patch); } catch (e) { dispatch(settingsLoaded(previous)); toast.error(errorMessage(e)); }
  };
  const setGroup = (group, key) => (value) => save({ [group]: { [key]: value } }, { [group]: { [key]: value } });

  const toggleDesktop = async (on) => {
    if (on && 'Notification' in window && Notification.permission !== 'granted') {
      const result = await Notification.requestPermission();
      if (result !== 'granted') { toast.error('Allow notifications in your browser to turn this on'); return; }
    }
    setGroup('notifications', 'desktop')(on);
  };

  const exportBackup = async () => {
    setExporting(true);
    try { const { data } = await userService.backup(); downloadBlob(data, `cove-backup-${new Date().toISOString().slice(0, 10)}.json`); toast.success('Backup downloaded'); }
    catch (e) { toast.error(errorMessage(e, 'Could not create the backup')); } finally { setExporting(false); }
  };

  const chooseTheme = (t) => { dispatch(themeSet(t)); userService.updateSettings({ theme: t }).catch(() => {}); };

  return (
    <div className="h-full overflow-y-auto">
      <Seo title="Settings" noindex />
      <div className="mx-auto max-w-2xl space-y-4 p-5 pb-24 md:p-10">
        <h1 className="font-display text-3xl font-extrabold">Settings</h1>

        <Section icon={Palette} title="Appearance" description="Choose how Cove looks on this device.">
          <div className="py-3">
            <Tabs id="theme" value={theme} onChange={chooseTheme} tabs={[
              { id: 'system', label: <span className="inline-flex items-center gap-1.5"><Monitor className="h-4 w-4" />System</span> },
              { id: 'light', label: <span className="inline-flex items-center gap-1.5"><Sun className="h-4 w-4" />Light</span> },
              { id: 'dark', label: <span className="inline-flex items-center gap-1.5"><Moon className="h-4 w-4" />Dark</span> },
            ]} />
          </div>
          <Switch label="Enter sends the message" description="Turn off to send with Ctrl/⌘ + Enter and use Enter for new lines." checked={settings.enterToSend} onChange={(v) => save({ enterToSend: v }, { enterToSend: v })} />
        </Section>

        <Section icon={Bell} title="Notifications">
          <Switch label="Sound" description="Play a soft ping for new messages." checked={settings.notifications.sound} onChange={setGroup('notifications', 'sound')} />
          <Switch label="Desktop notifications" description="Show a browser notification when Cove is in the background." checked={settings.notifications.desktop} onChange={toggleDesktop} />
          <Switch label="Message previews" description="Show message text in notifications." checked={settings.notifications.preview} onChange={setGroup('notifications', 'preview')} />
        </Section>

        <Section icon={Shield} title="Privacy" description="Applies to everyone, including friends.">
          <Switch label="Show when I'm online" checked={settings.privacy.showOnline} onChange={setGroup('privacy', 'showOnline')} />
          <Switch label="Show my last seen" checked={settings.privacy.showLastSeen} onChange={setGroup('privacy', 'showLastSeen')} />
          <Switch label="Send read receipts" description="If you turn this off, you won't see other people's read receipts either." checked={settings.privacy.readReceipts} onChange={setGroup('privacy', 'readReceipts')} />
        </Section>

        <Section icon={Download} title="Your data">
          <div className="flex items-center justify-between gap-4 py-3">
            <div><p className="text-sm font-semibold">Chat backup</p><p className="text-xs text-sub">Download your conversations as a JSON file (latest 5,000 messages per chat).</p></div>
            <Button variant="secondary" size="sm" loading={exporting} onClick={exportBackup}><Download className="h-4 w-4" />Export</Button>
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <div><p className="text-sm font-semibold">Scheduled messages</p><p className="text-xs text-sub">Review or cancel messages waiting to be sent.</p></div>
            <Button variant="secondary" size="sm" onClick={() => setScheduledOpen(true)}><CalendarClock className="h-4 w-4" />View</Button>
          </div>
        </Section>

        <Section icon={Lock} title="Account">
          <div className="flex items-center justify-between gap-4 py-3">
            <div><p className="text-sm font-semibold">Password and profile</p><p className="text-xs text-sub">Change your password, photo, name and status.</p></div>
            <Link to="/app/profile" className="rounded-xl bg-surface-2 px-3.5 py-2 text-sm font-semibold hover:bg-surface-3">Open profile</Link>
          </div>
          <div className="py-3"><Button variant="danger-ghost" onClick={() => dispatch(logoutUser()).then(() => navigate('/login'))}><LogOut className="h-4 w-4" />Sign out</Button></div>
        </Section>
      </div>
      <MessageListModal open={scheduledOpen} kind="scheduled" onClose={() => setScheduledOpen(false)} />
    </div>
  );
}
