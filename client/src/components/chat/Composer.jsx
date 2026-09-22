import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { BarChart3, CalendarClock, Check, FileText, Image as ImageIcon, Mic, Paperclip, Send, Smile, Trash2, X } from 'lucide-react';
import { IconButton } from '../common/Button';
import Popover from '../common/Popover';
import Avatar from '../common/Avatar';
import AttachmentPreview from './AttachmentPreview';
import PollModal from './PollModal';
import ScheduleModal from './ScheduleModal';
import { useChat } from './ChatContext';
import { useTyping } from '../../hooks/useTyping';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { useMessageActions } from '../../hooks/useMessageActions';
import { editingSet, replyToSet, sendMessage } from '../../features/chat/chatSlice';
import { chatService } from '../../services/chatService';
import { isDarkNow } from '../../hooks/useTheme';
import { cn, errorMessage, formatDuration, messagePreview } from '../../lib/utils';

const EmojiPicker = lazy(() => import('emoji-picker-react'));
const drafts = new Map(); // unsent text survives switching between chats

export default function Composer() {
  const { conversationId, conv, meId, uploader } = useChat();
  const dispatch = useDispatch();
  const actions = useMessageActions();
  const enterToSend = useSelector((s) => s.ui.settings.enterToSend);
  const replyTo = useSelector((s) => s.chat.replyTo);
  const editing = useSelector((s) => s.chat.editing);
  const typing = useTyping(conversationId);
  const voice = useVoiceRecorder();

  const [text, setText] = useState(() => drafts.get(conversationId) || '');
  const [caret, setCaret] = useState(0);
  const [mentionIdx, setMentionIdx] = useState(0);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [sendingVoice, setSendingVoice] = useState(false);
  const area = useRef(null);
  const photoInput = useRef(null);
  const fileInput = useRef(null);
  const emojiAnchor = useRef(null);
  const attachAnchor = useRef(null);

  const isAi = conv.type === 'ai';
  const hasContent = text.trim().length > 0 || uploader.items.length > 0;
  const canSend = hasContent && !uploader.uploading && !(uploader.items.length && uploader.items.every((i) => i.status === 'error'));

  const setDraft = (value) => { setText(value); drafts.set(conversationId, value); };

  // Auto-grow the textarea up to ~6 lines.
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [text]);

  // Entering edit mode loads the message text into the box.
  useEffect(() => {
    if (editing) { setText(editing.text); area.current?.focus(); }
  }, [editing?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (replyTo) area.current?.focus(); }, [replyTo?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- @mention autocomplete (groups) ---- */
  const mention = useMemo(() => {
    if (conv.type !== 'group') return null;
    const m = /(^|\s)@([a-z0-9_]{0,20})$/i.exec(text.slice(0, caret));
    return m ? { query: m[2].toLowerCase(), start: caret - m[2].length - 1 } : null;
  }, [text, caret, conv.type]);

  const candidates = useMemo(() => {
    if (!mention) return [];
    return conv.participants
      .filter((p) => p._id !== meId && (p.username.startsWith(mention.query) || p.name.toLowerCase().includes(mention.query)))
      .slice(0, 5);
  }, [mention, conv.participants, meId]);

  const pickMention = (user) => {
    const before = text.slice(0, mention.start);
    const after = text.slice(caret);
    const next = `${before}@${user.username} ${after}`;
    setDraft(next);
    const pos = before.length + user.username.length + 2;
    requestAnimationFrame(() => { area.current?.focus(); area.current?.setSelectionRange(pos, pos); setCaret(pos); });
  };

  /* ---- sending ---- */
  const submit = useCallback(async ({ scheduledFor, poll } = {}) => {
    if (editing) {
      const value = text.trim();
      if (!value) return;
      if (value !== editing.text) await actions.edit(editing, value);
      dispatch(editingSet(null));
      setDraft('');
      return;
    }
    if (!poll && !canSend) return;
    dispatch(sendMessage({ conversationId, text: poll ? '' : text.trim(), attachments: poll ? [] : uploader.results(), replyTo, poll, scheduledFor }))
      .unwrap()
      .then((r) => r.scheduled && toast.success('Message scheduled'))
      .catch((e) => toast.error(errorMessage(e, 'Message could not be sent')));
    if (!poll) { setDraft(''); uploader.clear(); }
    dispatch(replyToSet(null));
    typing.stop();
  }, [editing, text, canSend, conversationId, replyTo, uploader, typing, actions, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendVoice = async () => {
    setSendingVoice(true);
    try {
      const rec = await voice.stop();
      if (!rec || rec.duration < 0.6) return; // accidental tap
      const { data } = await chatService.upload([rec.file]);
      const attachment = { ...data.files[0], type: 'audio', duration: Math.round(rec.duration) };
      dispatch(sendMessage({ conversationId, text: '', attachments: [attachment], replyTo }));
      dispatch(replyToSet(null));
    } catch (e) {
      toast.error(errorMessage(e, 'Could not send your voice message'));
    } finally {
      setSendingVoice(false);
    }
  };

  const onKeyDown = (e) => {
    if (candidates.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx((i) => (i + 1) % candidates.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIdx((i) => (i - 1 + candidates.length) % candidates.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickMention(candidates[mentionIdx % candidates.length]); return; }
    }
    if (e.key === 'Escape') {
      if (editing) { dispatch(editingSet(null)); setDraft(''); } else if (replyTo) dispatch(replyToSet(null));
      return;
    }
    const isComposing = e.nativeEvent.isComposing;
    if (e.key === 'Enter' && !isComposing) {
      const send = enterToSend ? !e.shiftKey : e.ctrlKey || e.metaKey;
      if (send) { e.preventDefault(); submit(); }
    }
  };

  const onPaste = (e) => {
    const files = Array.from(e.clipboardData?.files || []);
    if (files.length) { e.preventDefault(); uploader.addFiles(files); }
  };

  const insertEmoji = (emoji) => {
    const el = area.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    setDraft(text.slice(0, start) + emoji + text.slice(end));
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(start + emoji.length, start + emoji.length); });
  };

  const cancelContext = () => {
    if (editing) { dispatch(editingSet(null)); setDraft(''); } else dispatch(replyToSet(null));
  };

  return (
    <div className="relative border-t border-line bg-surface/80 px-3 pb-safe pt-2.5 backdrop-blur-xl sm:px-5">
      {/* Mention suggestions */}
      {candidates.length > 0 && (
        <div className="glass-strong absolute bottom-full left-3 mb-2 w-64 overflow-hidden rounded-2xl p-1.5 shadow-pop sm:left-5" role="listbox">
          {candidates.map((u, i) => (
            <button key={u._id} role="option" aria-selected={i === mentionIdx % candidates.length} onMouseDown={(e) => { e.preventDefault(); pickMention(u); }} className={cn('flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left', i === mentionIdx % candidates.length ? 'bg-brand/15' : 'hover:bg-surface-2')}>
              <Avatar src={u.avatar?.url} name={u.name} size="sm" />
              <span className="min-w-0"><span className="block truncate text-sm font-semibold">{u.name}</span><span className="block truncate text-xs text-sub">@{u.username}</span></span>
            </button>
          ))}
        </div>
      )}

      {/* Reply / edit context */}
      {(replyTo || editing) && (
        <div className="mb-2 flex items-center gap-3 rounded-xl border-l-4 border-brand bg-brand/10 px-3 py-2">
          <div className="min-w-0 flex-1 text-xs">
            <p className="font-semibold text-brand">{editing ? 'Editing message' : `Replying to ${replyTo.sender?.name || 'message'}`}</p>
            <p className="truncate text-sub">{messagePreview(editing || replyTo)}</p>
          </div>
          <IconButton label="Cancel" className="h-7 w-7" onClick={cancelContext}><X className="h-4 w-4" /></IconButton>
        </div>
      )}

      <AttachmentPreview items={uploader.items} onRemove={uploader.remove} />

      {voice.isRecording || sendingVoice ? (
        <div className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3 py-2">
          <IconButton label="Cancel recording" onClick={voice.cancel} disabled={sendingVoice}><Trash2 className="h-5 w-5 text-coral" /></IconButton>
          <span className="relative flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ring rounded-full bg-coral" /><span className="relative inline-flex h-3 w-3 rounded-full bg-coral" /></span>
          <span className="font-medium tabular-nums">{sendingVoice ? 'Sending…' : formatDuration(voice.seconds)}</span>
          <span className="flex-1 text-sm text-sub">{sendingVoice ? '' : 'Recording…'}</span>
          <button onClick={sendVoice} disabled={sendingVoice} aria-label="Send voice message" className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient text-white shadow-glow disabled:opacity-60"><Send className="h-5 w-5" /></button>
        </div>
      ) : (
        <div className="flex items-end gap-1.5">
          <span ref={attachAnchor} className="inline-flex"><IconButton label="Attach" active={attachOpen} onClick={() => setAttachOpen((o) => !o)} className="h-11 w-11"><Paperclip className="h-5 w-5" /></IconButton></span>
          <div className="flex min-w-0 flex-1 items-end rounded-2xl border border-line bg-surface-2 transition focus-within:border-brand focus-within:shadow-[0_0_0_3px_rgb(var(--brand)/0.16)]">
            <textarea
              ref={area}
              value={text}
              rows={1}
              maxLength={4000}
              placeholder={isAi ? 'Ask Cove AI anything…' : 'Write a message…'}
              aria-label="Message"
              onChange={(e) => { setDraft(e.target.value); setCaret(e.target.selectionStart); setMentionIdx(0); if (e.target.value) typing.onType(); else typing.stop(); }}
              onSelect={(e) => setCaret(e.target.selectionStart)}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-4 py-3 text-[15px] leading-snug outline-none placeholder:text-sub/70"
            />
            <span ref={emojiAnchor} className="inline-flex"><IconButton label="Emoji" active={emojiOpen} onClick={() => setEmojiOpen((o) => !o)} className="h-11 w-11"><Smile className="h-5 w-5" /></IconButton></span>
          </div>

          {!isAi && !editing && text.trim() && (
            <IconButton label="Schedule message" onClick={() => setScheduleOpen(true)} className="h-11 w-11"><CalendarClock className="h-5 w-5" /></IconButton>
          )}
          {hasContent || editing ? (
            <button onClick={() => submit()} disabled={editing ? !text.trim() : !canSend} aria-label={editing ? 'Save edit' : 'Send message'} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow transition hover:brightness-110 disabled:opacity-50">
              {editing ? <Check className="h-5 w-5" /> : <Send className="h-5 w-5" />}
            </button>
          ) : (
            <IconButton label="Record voice message" onClick={() => voice.start()} className="h-11 w-11 bg-surface-2"><Mic className="h-5 w-5" /></IconButton>
          )}
        </div>
      )}

      <input ref={photoInput} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => { uploader.addFiles(e.target.files); e.target.value = ''; }} />
      <input ref={fileInput} type="file" multiple hidden onChange={(e) => { uploader.addFiles(e.target.files); e.target.value = ''; }} />

      <Popover open={attachOpen} anchorRef={attachAnchor} onClose={() => setAttachOpen(false)} align="start" className="w-52 p-1.5">
        {[
          { label: 'Photo or video', icon: ImageIcon, onClick: () => photoInput.current.click() },
          { label: 'Document', icon: FileText, onClick: () => fileInput.current.click() },
          { label: 'Poll', icon: BarChart3, onClick: () => setPollOpen(true), hidden: isAi },
        ].filter((i) => !i.hidden).map((i) => (
          <button key={i.label} onClick={() => { setAttachOpen(false); i.onClick(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-surface-2"><i.icon className="h-4 w-4 text-brand" />{i.label}</button>
        ))}
      </Popover>

      <Popover open={emojiOpen} anchorRef={emojiAnchor} onClose={() => setEmojiOpen(false)} align="end" className="overflow-hidden">
        <Suspense fallback={<div className="flex h-[360px] w-[320px] items-center justify-center text-sm text-sub">Loading emoji…</div>}>
          <EmojiPicker onEmojiClick={(e) => insertEmoji(e.emoji)} theme={isDarkNow() ? 'dark' : 'light'} width={320} height={380} lazyLoadEmojis previewConfig={{ showPreview: false }} />
        </Suspense>
      </Popover>

      <PollModal open={pollOpen} onClose={() => setPollOpen(false)} onSubmit={(poll) => submit({ poll })} />
      <ScheduleModal open={scheduleOpen} onClose={() => setScheduleOpen(false)} onSubmit={(scheduledFor) => submit({ scheduledFor })} />
    </div>
  );
}
