export default function TopBar() {
  return (
    <div className="topbar">
      {/* Search box */}
      <div className="search-box">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
          <circle cx="7" cy="7" r="5" />
          <line x1="11" y1="11" x2="14.5" y2="14.5" />
        </svg>
        <span className="search-text">Search workflows...</span>
        <span className="search-kbd">Cmd K</span>
      </div>

      {/* Grid icon */}
      <div className="topbar-icon">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
          <rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
        </svg>
      </div>

      {/* Bell with red dot */}
      <div className="topbar-icon notif-wrap">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M8 2a5 5 0 015 5v2.5l1 2H2l1-2V7a5 5 0 015-5z"/>
          <path d="M6.5 13.5a1.5 1.5 0 003 0"/>
        </svg>
        <span className="notif-dot" />
      </div>

      {/* Avatars */}
      <div className="topbar-avatar" title="JD">JD</div>
      <div className="topbar-avatar" style={{ marginLeft: -8, border: '2px solid var(--bg-topbar)' }} title="JD">JD</div>
    </div>
  );
}
