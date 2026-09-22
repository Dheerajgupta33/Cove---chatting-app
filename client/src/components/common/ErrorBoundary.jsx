import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from './Button';

// Catches render errors so one broken component never blanks the whole app.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) { return { error }; }

  componentDidCatch(error, info) { console.error('UI error:', error, info.componentStack); }

  reset = () => { this.setState({ error: null }); this.props.onReset?.(); };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-coral/15 text-coral"><AlertTriangle className="h-7 w-7" /></div>
        <div>
          <h2 className="text-xl font-bold">This screen hit a problem</h2>
          <p className="mt-1 max-w-sm text-sm text-sub">Your messages are safe. Try again, or reload the page if it keeps happening.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={this.reset}>Try again</Button>
          <Button variant="outline" onClick={() => window.location.reload()}>Reload page</Button>
        </div>
      </div>
    );
  }
}
