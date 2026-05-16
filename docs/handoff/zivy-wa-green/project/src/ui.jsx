/* Shared UI primitives — using real design tokens */
const { useState: useStateU, useMemo: useMemoU } = React;

/* Status badge — maps ticket lifecycle to real token colors */
function StatusBadge({ status }) {
  const labels = window.ZIVY_DATA.STATUS_LABELS;
  return (
    <span className={`badge ${status}`}>
      <span className="dot"/>
      {labels[status]}
    </span>
  );
}

/* Priority indicator with bars */
function Priority({ level }) {
  const labels = window.ZIVY_DATA.PRIORITY_LABELS;
  return (
    <span className={`prio ${level}`}>
      <span className="bars"><i/><i/><i/></span>
      {labels[level]}
    </span>
  );
}

/* Avatar */
function Avatar({ initials, size, style: extStyle }) {
  const cls = size === 'lg' ? 'av lg' : size === 'sm' ? 'av sm' : 'av';
  // Deterministic hue from initials so it's consistent
  const hue = ((initials?.charCodeAt(0) || 65) * 47 + (initials?.charCodeAt(1) || 0) * 13) % 360;
  return (
    <span className={cls} style={{ background: `hsl(${hue} 55% 88%)`, color: `hsl(${hue} 45% 32%)`, ...extStyle }}>
      {initials}
    </span>
  );
}

/* Lucide-style icon helper */
function Icon({ name, size = 16, stroke = 2 }) {
  const paths = {
    search:   <><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>,
    bell:     <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>,
    chevron:  <path d="m6 9 6 6 6-6"/>,
    chevronR: <path d="m9 6 6 6-6 6"/>,
    plus:     <path d="M12 5v14M5 12h14"/>,
    x:        <path d="M18 6 6 18M6 6l12 12"/>,
    check:    <path d="M20 6 9 17l-5-5"/>,
    edit:     <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></>,
    trash:    <><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,
    send:     <><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></>,
    clock:    <><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>,
    user:     <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    mapPin:   <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,
    telegram: <><path d="m21 3-9 18-2-8-8-2z"/><path d="M21 3 10 13"/></>,
    arrowL:   <><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></>,
    filter:   <path d="M22 3H2l8 9.46V19l4 2v-8.54z"/>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    table:    <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></>,
    cards:    <><rect x="3" y="4" width="8" height="16" rx="1"/><rect x="13" y="4" width="8" height="7" rx="1"/><rect x="13" y="13" width="8" height="7" rx="1"/></>,
    kanban:   <><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="10" rx="1"/><rect x="17" y="3" width="5" height="14" rx="1"/></>,
    sliders:  <><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3"/><path d="M1 14h6M9 8h6M17 16h6"/></>,
    door:     <><path d="M4 22V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v18"/><path d="M2 22h20"/><circle cx="15" cy="12" r="1"/></>,
    building: <><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18"/><path d="M2 22h20"/><path d="M10 6h.01M14 6h.01M10 10h.01M14 10h.01M10 14h.01M14 14h.01M10 18h.01M14 18h.01"/></>,
    shield:   <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
    more:     <><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></>,
    users:    <><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
         aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

/* Relative time */
function relTime(iso) {
  const then = new Date(iso), now = new Date('2026-05-12T10:00:00');
  const mins = Math.max(0, Math.round((now - then) / 60000));
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins}min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `há ${days}d`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
function fullTime(iso) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* Confirm delete modal */
function ConfirmDelete({ title, body, onCancel, onConfirm }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 'min(420px, 92vw)' }}>
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
            <div className="modal-sub">Esta ação não pode ser desfeita.</div>
          </div>
          <button className="btn ghost icon" onClick={onCancel}><Icon name="x" size={16}/></button>
        </div>
        <div className="modal-body">
          <p style={{ margin: 0, fontSize: 'var(--fs-sm)', color: 'var(--fg-secondary)', lineHeight: 'var(--lh-relaxed)' }}>{body}</p>
        </div>
        <div className="modal-footer">
          <button className="btn ghost md" onClick={onCancel}>Cancelar</button>
          <button className="btn danger md" onClick={onConfirm}><Icon name="trash" size={14}/> Excluir</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { StatusBadge, Priority, Avatar, Icon, relTime, fullTime, ConfirmDelete });
