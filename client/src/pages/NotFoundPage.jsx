import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import EmptyState from '../components/common/EmptyState';
import Seo from '../components/common/Seo';
import { buttonStyles } from '../components/common/Button';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Seo title="Page not found" noindex />
      <EmptyState icon={Compass} title="This page doesn't exist" description="The link may be broken or the page may have moved." action={<Link to="/" className={buttonStyles()}>Back to Cove</Link>} />
    </div>
  );
}
