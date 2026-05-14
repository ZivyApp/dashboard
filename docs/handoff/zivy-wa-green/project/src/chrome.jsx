/* Chrome: Topbar + Sidebar alinhados ao AppShell real */
const { useState: useStateC, useEffect: useEffectC, useRef: useRefC, useMemo: useMemoC } = React;

/* ── Theme toggle (mirrors ThemeToggle.tsx) ─────────────── */
function ThemeToggle() {
  const [theme, setTheme] = useStateC(() => {
    try { return localStorage.getItem('zivy-theme-mode') || 'system'; } catch { return 'system'; }
  });
  const apply = (mode) => {
    setTheme(mode);
    try { localStorage.setItem('zivy-theme-mode', mode); } catch {}
    const resolved = mode === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : mode;
    document.documentElement.setAttribute('data-theme', resolved);
  };
  useEffectC(() => { apply(theme); }, []);
  const icons = { light: '☀', dark: '☽', system: '⊙' };
  const next = { light: 'dark', dark: 'system', system: 'light' };
  return (
    <button className="header icon-btn" title={`Tema: ${theme}`} onClick={() => apply(next[theme])}>
      <span style={{ fontSize: 14 }}>{icons[theme]}</span>
    </button>
  );
}

/* ── Condo switcher ─────────────────────────────────────── */
function CondoSwitcher({ condos, activeId, onPick, allMode, onToggleAll }) {
  const [open, setOpen] = useStateC(false);
  const ref = useRefC(null);
  useEffectC(() => {
    const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const active = condos.find(c => c.id === activeId);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="header condo-switcher" onClick={() => setOpen(o => !o)}>
        <div className="av sm" style={{ background: 'var(--brand-soft)', color: 'var(--brand)', fontWeight: 700 }}>
          {allMode ? '∗' : active?.mark}
        </div>
        <span className="condo-name">
          {allMode ? 'Todos os condomínios' : active?.name}
        </span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ flexShrink: 0 }}>
          <path d="M1 1l4 4 4-4" stroke="var(--fg-tertiary)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
      {open && (
        <div className="menu" style={{ position: 'absolute', top: 40, left: 0, minWidth: 300, zIndex: 50 }}>
          <div className="menu-label">Administradora</div>
          <div className={`menu-item ${allMode ? 'active' : ''}`} onClick={() => { onToggleAll(); setOpen(false); }}>
            <div className="av sm" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>∗</div>
            <div className="col" style={{ gap: 1 }}>
              <span style={{ fontWeight: 'var(--fw-medium)' }}>Todos os condomínios</span>
              <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--fg-tertiary)' }}>Visão consolidada da administradora</span>
            </div>
            {allMode && <span style={{ marginLeft: 'auto', color: 'var(--brand)', fontSize: 12 }}>✓</span>}
          </div>
          <div className="menu-sep"/>
          <div className="menu-label">{condos.length} condomínios</div>
          {condos.map(c => (
            <div key={c.id} className={`menu-item ${!allMode && c.id === activeId ? 'active' : ''}`}
                 onClick={() => { onPick(c.id); setOpen(false); }}>
              <div className="av sm" style={{ background: 'var(--brand)', color: 'var(--fg-inverse)' }}>{c.mark}</div>
              <div className="col" style={{ gap: 1, flex: 1 }}>
                <span style={{ fontWeight: 500 }}>{c.name}</span>
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--fg-tertiary)' }}>{c.city} · {c.units} unidades</span>
              </div>
              {c.urgent > 0 && (
                <span className="badge" style={{ background: 'var(--status-urgent-bg)', color: 'var(--status-urgent-fg)', fontSize: 11 }}>
                  {c.urgent} urgente{c.urgent > 1 ? 's' : ''}
                </span>
              )}
              {!allMode && c.id === activeId && <span style={{ color: 'var(--brand)', fontSize: 12 }}>✓</span>}
            </div>
          ))}
          <div className="menu-sep"/>
          <div className="menu-item" style={{ color: 'var(--brand)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Cadastrar novo condomínio
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Persona chip ───────────────────────────────────────── */
function PersonaChip({ persona, onChange }) {
  const [open, setOpen] = useStateC(false);
  const ref = useRefC(null);
  useEffectC(() => {
    const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const list = [
    { id: 'admin', label: 'Administradora', sub: 'multi-condo' },
    { id: 'pro',   label: 'Síndico Pro',    sub: '1–3 condos, uso diário' },
    { id: 'basic', label: 'Síndico Básico', sub: 'plano simples' },
  ];
  const cur = list.find(p => p.id === persona) || list[0];
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="header persona-badge" onClick={() => setOpen(o => !o)}>
        {cur.label}
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
      {open && (
        <div className="menu" style={{ position: 'absolute', top: 30, right: 0, minWidth: 220, zIndex: 50 }}>
          <div className="menu-label">Perfil ativo</div>
          {list.map(p => (
            <div key={p.id} className={`menu-item ${p.id === persona ? 'active' : ''}`}
                 onClick={() => { onChange(p.id); setOpen(false); }}>
              <div className="col" style={{ gap: 1, flex: 1 }}>
                <span style={{ fontWeight: 500 }}>{p.label}</span>
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--fg-tertiary)' }}>{p.sub}</span>
              </div>
              {p.id === persona && <span style={{ color: 'var(--brand)', fontSize: 12 }}>✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── User menu (mirrors UserMenu.tsx) ───────────────────── */
function UserMenu({ email = 'camila@administradora.com.br' }) {
  const [open, setOpen] = useStateC(false);
  const ref = useRefC(null);
  useEffectC(() => {
    const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const initial = email.charAt(0).toUpperCase();
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="header avatar" onClick={() => setOpen(o => !o)} aria-label="Menu do usuário">
        {initial}
      </button>
      {open && (
        <div className="menu" style={{ position: 'absolute', top: 42, right: 0, minWidth: 200, zIndex: 50 }}>
          <div style={{ padding: 'var(--space-2) var(--space-2)', fontSize: 'var(--fs-xs)', color: 'var(--fg-tertiary)' }}>{email}</div>
          <div className="menu-sep"/>
          <div className="menu-item" onClick={() => setOpen(false)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sair
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Header (mirrors Header.tsx) ────────────────────────── */
function Header({ condos, activeCondoId, setActiveCondoId, allMode, setAllMode, persona, setPersona }) {
  return (
    <header className="header">
      {/* Logo — matches Header.tsx logo span but with icon */}
      <div className="logo">
        <div className="logo-icon">Z</div>
        Zivy
      </div>
      {/* CondoSwitcher slot (TODO Plan 3.3 in real code) */}
      <div className="condo-slot">
        <CondoSwitcher condos={condos} activeId={activeCondoId}
                       onPick={(id) => { setActiveCondoId(id); setAllMode(false); }}
                       allMode={allMode} onToggleAll={() => setAllMode(true)}/>
      </div>
      {/* Search */}
      <div className="search-bar" style={{ flex: 1, maxWidth: 460 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
        </svg>
        <span>Buscar chamados, moradores…</span>
        <kbd>⌘K</kbd>
      </div>
      <div className="spacer"/>
      <div className="actions">
        <PersonaChip persona={persona} onChange={setPersona}/>
        <ThemeToggle/>
        <UserMenu/>
      </div>
    </header>
  );
}

/* ── Sidebar (mirrors Sidebar.tsx) ──────────────────────── */
function Sidebar({ route, setRoute, activeCondo, allMode, tickets }) {
  const counts = useMemoC(() => {
    const D = window.ZIVY_DATA;
    const base = allMode ? tickets : tickets.filter(t => t.condoId === activeCondo?.id);
    const pending = Object.values(D.RESIDENTS_BY_UNIT || {}).flat().length; // approvals placeholder
    return {
      inbox: base.filter(t => t.status === 'open' && !t.assignedTo).length,
      tickets: base.filter(t => t.status !== 'closed').length,
      urgent: base.filter(t => t.priority === 'urgent' && t.status !== 'closed').length,
      approvals: 3, // PENDING residents
    };
  }, [tickets, activeCondo, allMode]);

  const navItems = [
    { id: 'inbox',     label: 'Inbox',         icon: inboxIcon,    count: counts.inbox, dot: counts.urgent > 0 },
    { id: 'tickets',   label: 'Tickets',        icon: ticketIcon,   count: counts.tickets },
    { id: 'approvals', label: 'Aprovações',     icon: shieldIcon,   count: counts.approvals > 0 ? counts.approvals : undefined },
    { id: 'settings',  label: 'Configurações',  icon: settingsIcon },
  ];
  const structureItems = [
    { id: 'blocks', label: 'Blocos',       icon: buildingIcon },
    { id: 'units',  label: 'Unidades',     icon: doorIcon },
    { id: 'areas',  label: 'Áreas comuns', icon: gridIcon },
  ];

  return (
    <aside className="sidebar" aria-label="Barra lateral">
      <div className="scope">
        <div className="scope-label">Escopo</div>
        <div className="scope-name">{allMode ? 'Todos os condomínios' : activeCondo?.name}</div>
        <div className="scope-sub">
          {allMode
            ? `${window.ZIVY_DATA.CONDOS.length} condos · ${window.ZIVY_DATA.CONDOS.reduce((a, c) => a + c.units, 0)} unidades`
            : `${activeCondo?.blocks} blocos · ${activeCondo?.units} unidades`}
        </div>
      </div>
      <nav className="nav" aria-label="Navegação principal">
        <div className="nav-section">Operação</div>
        {navItems.map(it => (
          <div key={it.id} className={`nav-item ${route === it.id ? 'active' : ''}`} onClick={() => setRoute(it.id)}>
            {it.icon}
            <span>{it.label}</span>
            {it.count != null && <span className="nav-count">{it.count}</span>}
            {it.dot && it.count == null && <span className="nav-dot"/>}
          </div>
        ))}
        <div className="nav-section">Estrutura</div>
        {structureItems.map(it => (
          <div key={it.id} className={`nav-item ${route === it.id ? 'active' : ''}`} onClick={() => setRoute(it.id)}>
            {it.icon}
            <span>{it.label}</span>
          </div>
        ))}
      </nav>
      <div className="footer">
        <span>v1.10 · develop</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ cursor: 'pointer' }}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      </div>
    </aside>
  );
}

/* ── Icon set (Lucide-style, mirroring real deps) ───────── */
const ic = (d, extra = '') => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {typeof d === 'string' ? <path d={d}/> : d}
  </svg>
);
const inboxIcon    = ic(<><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></>);
const ticketIcon   = ic(<><path d="M2 9a2 2 0 1 1 4 0v6a2 2 0 1 1-4 0"/><path d="M22 9a2 2 0 1 0-4 0v6a2 2 0 1 0 4 0"/><path d="M6 10h12v4H6z"/><path d="M9 7v10M15 7v10"/></>);
const shieldIcon   = ic(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>);
const settingsIcon = ic(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>);
const buildingIcon = ic(<><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18"/><path d="M2 22h20"/><path d="M10 6h.01M14 6h.01M10 10h.01M14 10h.01M10 14h.01M14 14h.01M10 18h.01M14 18h.01"/></>);
const doorIcon     = ic(<><path d="M4 22V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v18"/><path d="M2 22h20"/><circle cx="15" cy="12" r="1"/></>);
const gridIcon     = ic(<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>);

Object.assign(window, { Header, Sidebar, ThemeToggle, UserMenu, CondoSwitcher,
  inboxIcon, ticketIcon, shieldIcon, settingsIcon, buildingIcon, doorIcon, gridIcon,
  ic });
