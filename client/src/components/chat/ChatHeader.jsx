import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Archive, ArchiveRestore, Ban, ChevronLeft, Flag, Info, LogOut, MoreVertical, Phone, Search, Video } from 'lucide-react';
import Avatar from '../common/Avatar';
import { IconButton } from '../common/Button';
import Menu from '../common/Menu';
import ConfirmDialog from '../common/ConfirmDialog';
import ReportModal from './ReportModal';
import { Dots } from './TypingIndicator';
import { useChat } from './ChatContext';
import { useCall } from '../../hooks/useCall';
import { archivedSet } from '../../features/chat/chatSlice';
import { infoPanelOpened, infoPanelToggled } from '../../features/ui/uiSlice';
import { chatService } from '../../services/chatService';
import { userService } from '../../services/userService';
import { lastSeenLabel } from '../../lib/time';
import { errorMessage } from '../../lib/utils';

export default function ChatHeader() {
  const { conv, meta } = useChat();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const call = useCall();
  const typing = Object.values(useSelector((s) => s.chat.typing[conv._id]) || {});
  const infoOpen = useSelector((s) => s.ui.infoPanel.open);
  const [confirm, setConfirm] = useState(null); // 'block' | 'leave'
  const [reportOpen, setReportOpen] = useState(false);

  const { peer, isGroup, isAi } = meta;
  const archived = conv.me.archived;

  const subtitle = typing.length
    ? <span className="flex items-center gap-1.5 text-brand"><Dots />{typing.length === 1 && isGroup ? `${typing[0]} is typing` : 'typing'}</span>
    : isGroup ? `${conv.participants.length} members` : isAi ? 'AI assistant · always online' : lastSeenLabel(peer);

  const toggleArchive = async () => {
    try {
      await chatService.archive(conv._id, !archived);
      dispatch(archivedSet({ id: conv._id, archived: !archived }));
      toast.success(archived ? 'Chat restored' : 'Chat archived');
      if (!archived) navigate('/app/chat');
    } catch (e) { toast.error(errorMessage(e)); }
  };

  const doConfirm = async () => {
    try {
      if (confirm === 'block') { await userService.block(peer._id); toast.success(`${peer.name} is blocked`); }
      if (confirm === 'leave') { await chatService.leaveGroup(conv.group._id); toast.success('You left the group'); }
    } catch (e) { toast.error(errorMessage(e)); }
    setConfirm(null);
  };

  return (
    <header className="glass z-10 flex items-center gap-2 border-x-0 border-t-0 px-2 py-2.5 sm:px-4">
      <IconButton label="Back to chats" onClick={() => navigate('/app/chat')} className="md:hidden"><ChevronLeft className="h-6 w-6" /></IconButton>
      <button onClick={() => dispatch(infoPanelOpened('about'))} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 text-left transition hover:bg-surface-2/60" aria-label="Open conversation details">
        <Avatar src={meta.avatar} name={meta.title} isBot={isAi} online={!isGroup && !isAi ? Boolean(peer?.isOnline) : undefined} />
        <span className="min-w-0">
          <span className="block truncate font-display text-[17px] font-bold leading-tight">{meta.title}</span>
          <span className="block truncate text-xs text-sub">{subtitle}</span>
        </span>
      </button>

      {!isGroup && !isAi && (
        <>
          <IconButton label="Voice call" onClick={() => call.start(conv, peer, 'voice')}><Phone className="h-5 w-5" /></IconButton>
          <IconButton label="Video call" onClick={() => call.start(conv, peer, 'video')}><Video className="h-5 w-5" /></IconButton>
        </>
      )}
      <IconButton label="Search in conversation" onClick={() => dispatch(infoPanelOpened('search'))}><Search className="h-5 w-5" /></IconButton>
      <IconButton label="Conversation details" active={infoOpen} onClick={() => dispatch(infoPanelToggled())}><Info className="h-5 w-5" /></IconButton>
      <Menu
        trigger={({ toggle }) => <IconButton label="More" onClick={toggle}><MoreVertical className="h-5 w-5" /></IconButton>}
        items={[
          { label: archived ? 'Unarchive chat' : 'Archive chat', icon: archived ? ArchiveRestore : Archive, onClick: toggleArchive },
          { divider: true, hidden: isAi },
          { label: 'Block user', icon: Ban, danger: true, hidden: isGroup || isAi, onClick: () => setConfirm('block') },
          { label: 'Report user', icon: Flag, danger: true, hidden: isGroup || isAi, onClick: () => setReportOpen(true) },
          { label: 'Leave group', icon: LogOut, danger: true, hidden: !isGroup, onClick: () => setConfirm('leave') },
        ]}
      />

      <ConfirmDialog
        open={!!confirm} onClose={() => setConfirm(null)} danger onConfirm={doConfirm}
        title={confirm === 'block' ? `Block ${meta.title}?` : 'Leave this group?'}
        message={confirm === 'block' ? "They won't be able to message you or send friend requests, and you'll be removed from each other's friends." : 'You will stop receiving messages from this group.'}
        confirmLabel={confirm === 'block' ? 'Block' : 'Leave'}
      />
      {peer && <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} targetUser={peer._id} name={peer.name} />}
    </header>
  );
}
