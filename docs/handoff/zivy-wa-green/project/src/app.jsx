/* App shell — v2, aligned to real codebase structure */
const { useState: useStateApp, useEffect: useEffectApp, useMemo: useMemoApp } = React;

function App() {
  const D = window.ZIVY_DATA;

  /* ── State ──────────────────────────────────────────── */
  const [route,         setRoute]         = useStateApp('inbox');
  const [activeCondoId, setActiveCondoId] = useStateApp(D.CONDOS[0].id);
  const [allMode,       setAllMode]       = useStateApp(true);
  const [persona,       setPersona]       = useStateApp('admin');
  const [tickets,       setTickets]       = useStateApp(D.TICKETS);
  const [events,        setEvents]        = useStateApp(D.EVENTS_BY_TICKET);
  const [blocks,        setBlocks]        = useStateApp(D.BLOCKS.c1);
  const [units,         setUnits]         = useStateApp(D.UNITS.c1);
  const [areas,         setAreas]         = useStateApp(D.AREAS.c1);
  const [openTicketId,  setOpenTicketId]  = useStateApp(null);

  /* ── Tweaks ─────────────────────────────────────────── */
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "ticketsLayout": "table",
    "density": "comfortable",
    "theme": "system"
  }/*EDITMODE-END*/;
  const [tweaks, setTweaks] = useStateApp(TWEAK_DEFAULTS);
  const [tweaksOn, setTweaksOn] = useStateApp(false);

  useEffectApp(() => {
    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode')   setTweaksOn(true);
      if (e.data?.type === '__deactivate_edit_mode') setTweaksOn(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const updateTweak = (k, v) => {
    setTweaks(t => ({ ...t, [k]: v }));
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [k]: v } }, '*');
  };

  /* ── Derived ────────────────────────────────────────── */
  const activeCondo  = D.CONDOS.find(c => c.id === activeCondoId);
  const openTicket   = openTicketId ? tickets.find(t => t.id === openTicketId) : null;
  const openTicketCondo = openTicket ? D.CONDOS.find(c => c.id === openTicket.condoId) : null;

  /* ── Ticket actions ─────────────────────────────────── */
  const onUpdateStatus = (newStatus) => {
    if (!openTicket || openTicket.status === newStatus) return;
    const now = new Date().toISOString();
    setTickets(list => list.map(t => t.id === openTicket.id ? { ...t, status: newStatus, updatedAt: now } : t));
    setEvents(ev => ({
      ...ev,
      [openTicket.id]: [...(ev[openTicket.id] || []),
        { type: 'status_changed', actor: 'Camila Duarte', actorType: 'manager', at: now, from: openTicket.status, to: newStatus }],
    }));
  };

  const onAssign = (m) => {
    if (!openTicket) return;
    const now = new Date().toISOString();
    setTickets(list => list.map(t => t.id === openTicket.id
      ? { ...t, assignedTo: { name: m.name, initials: m.initials, role: m.role }, updatedAt: now } : t));
    setEvents(ev => ({
      ...ev,
      [openTicket.id]: [...(ev[openTicket.id] || []),
        { type: 'assigned', actor: 'Camila Duarte', actorType: 'manager', at: now, note: `Atribuído a ${m.name}.` }],
    }));
  };

  const onAddComment = (text) => {
    if (!openTicket || !text.trim()) return;
    const now = new Date().toISOString();
    setEvents(ev => ({
      ...ev,
      [openTicket.id]: [...(ev[openTicket.id] || []),
        { type: 'comment', actor: 'Camila Duarte', actorType: 'manager', at: now, note: text }],
    }));
    setTickets(list => list.map(t => t.id === openTicket.id ? { ...t, updatedAt: now } : t));
  };

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className="shell" data-screen-label="Zivy Dashboard v2">

      {/* Header */}
      <Header
        condos={D.CONDOS}
        activeCondoId={activeCondoId}
        setActiveCondoId={setActiveCondoId}
        allMode={allMode}
        setAllMode={setAllMode}
        persona={persona}
        setPersona={setPersona}
      />

      {/* Sidebar */}
      <Sidebar
        route={route}
        setRoute={setRoute}
        activeCondo={activeCondo}
        allMode={allMode}
        tickets={tickets}
      />

      {/* Main */}
      <main className="main">
        <div className="page">

          {route === 'inbox' && (
            <InboxPage onPickTicket={setOpenTicketId} setRoute={setRoute}/>
          )}

          {route === 'tickets' && (
            <TicketsPage
              condos={D.CONDOS}
              allMode={allMode}
              activeCondoId={activeCondoId}
              tickets={tickets}
              onPick={setOpenTicketId}
              layoutMode={tweaks.ticketsLayout}
              setLayoutMode={v => updateTweak('ticketsLayout', v)}
              density={tweaks.density}
            />
          )}

          {route === 'approvals' && <ApprovalsPage/>}

          {route === 'settings' && (
            <>
              <div className="page-header">
                <div><h1>Configurações</h1>
                  <div className="page-sub">Gerenciamento de conta e preferências — Plan 4.</div>
                </div>
              </div>
              <div className="ph" style={{ minHeight: 240 }}>
                Onboarding self-service, billing, gestores, LGPD — próxima iteração.
              </div>
            </>
          )}

          {route === 'blocks' && (
            <BlocksPage condo={activeCondo} blocks={blocks} setBlocks={setBlocks}/>
          )}
          {route === 'units' && (
            <UnitsPage condo={activeCondo} blocks={blocks} units={units} setUnits={setUnits}/>
          )}
          {route === 'areas' && (
            <AreasPage condo={activeCondo} areas={areas} setAreas={setAreas}/>
          )}

        </div>
      </main>

      {/* Ticket detail modal */}
      {openTicket && (
        <TicketDetail
          ticket={openTicket}
          condo={openTicketCondo}
          onClose={() => setOpenTicketId(null)}
          onUpdateStatus={onUpdateStatus}
          onAssign={onAssign}
          onAddComment={onAddComment}
          events={events[openTicket.id] || [{
            type: 'created', actor: openTicket.resident.name, actorType: 'resident',
            at: openTicket.createdAt,
            note: 'Chamado aberto via bot Telegram. Triagem IA aplicou categoria e prioridade automaticamente.',
          }]}
        />
      )}

      {/* Tweaks panel */}
      {tweaksOn && (
        <div className="tweaks-panel">
          <div className="tp-head">
            <h4>Tweaks</h4>
            <button style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    onClick={() => { setTweaksOn(false); window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*'); }}>
              <Icon name="x" size={14}/>
            </button>
          </div>
          <div className="tp-body">
            <div className="tp-row">
              <label>Layout da lista de chamados</label>
              <div className="seg">
                {[['table','Tabela'],['cards','Cards'],['kanban','Kanban']].map(([v, lbl]) => (
                  <button key={v} className={tweaks.ticketsLayout === v ? 'active' : ''}
                          onClick={() => updateTweak('ticketsLayout', v)}>{lbl}</button>
                ))}
              </div>
            </div>
            <div className="tp-row">
              <label>Densidade</label>
              <div className="seg">
                {[['comfortable','Confortável'],['compact','Compacto']].map(([v,lbl]) => (
                  <button key={v} className={tweaks.density === v ? 'active' : ''}
                          onClick={() => updateTweak('density', v)}>{lbl}</button>
                ))}
              </div>
            </div>
            <div className="tp-row">
              <label>Tema</label>
              <div className="seg">
                {[['light','Claro'],['dark','Escuro'],['system','Sistema']].map(([v,lbl]) => (
                  <button key={v} className={tweaks.theme === v ? 'active' : ''}
                          onClick={() => {
                            updateTweak('theme', v);
                            const resolved = v === 'system'
                              ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : v;
                            document.documentElement.setAttribute('data-theme', resolved);
                          }}>{lbl}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
