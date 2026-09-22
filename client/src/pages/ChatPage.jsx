import { useParams } from 'react-router-dom';
import ConversationSidebar from '../components/chat/ConversationSidebar';
import ChatWindow from '../components/chat/ChatWindow';
import DashboardHome from '../components/dashboard/DashboardHome';
import ErrorBoundary from '../components/common/ErrorBoundary';
import Seo from '../components/common/Seo';
import { cn } from '../lib/utils';

// Chat dashboard: conversation list + open chat. On phones only one of the two is visible at a time.
export default function ChatPage() {
  const { conversationId } = useParams();
  return (
    <div className="flex h-full">
      <Seo title="Chats" noindex />
      <ConversationSidebar activeId={conversationId} className={cn('w-full md:w-[340px] md:shrink-0 lg:w-[380px]', conversationId ? 'hidden md:flex' : 'flex')} />
      <section className={cn('min-w-0 flex-1', !conversationId && 'hidden md:block')}>
        <ErrorBoundary key={conversationId || 'home'}>
          {conversationId ? <ChatWindow key={conversationId} conversationId={conversationId} /> : <DashboardHome />}
        </ErrorBoundary>
      </section>
    </div>
  );
}
