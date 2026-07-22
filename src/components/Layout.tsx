import { Link, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

export function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="app-logo">
          <span className="logo-icon">◎</span>
          <span className="logo-text">Audience Segmentation Builder</span>
        </Link>
        <nav className="app-nav">
          <Link to="/" className={pathname === '/' ? 'nav-link active' : 'nav-link'}>Dashboard</Link>
          <Link to="/new" className={pathname === '/new' ? 'nav-link active' : 'nav-link'}>+ New Segment</Link>
        </nav>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
