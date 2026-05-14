/* Tickets list — 3 layouts, aligned to v2 tokens */
const { useState: useStateTk, useMemo: useMemoTk } = React;

function TicketsPage({ condos, allMode, activeCondoId, tickets, onPick, layoutMode, setLayoutMode, density }) {
  const [search,       setSearch]       = useStateTk('');
  const [statusFilter, setStatusFilter] = useStateTk('all');
  const [prioFilter,   setPrioFilter]   = useStateTk('all');

  const D = window.ZIVY_DATA;

  const list = useMemoTk(() => {
    let base = allMode ? tickets : tickets.filter(t => t.condoId === activeCondoId);
    if (statusFilter !== 'all') base = base.filter(t => t.status === statusFilter);
    if (prioFilter   !== 'all') base = base.filter(t => t.priority === prioFilter);
    if (search) {
      const q = search.toLowerCase();
      base = base.filter(t =>
        t.title.toLowerCase().includes(q) || t.protocol.toLowerCase().includes(q) ||
        t.resident.name.toLowerCase().includes(q) || (t.locationRef || '').toLowerCase().includes(q));
    }
    const pOrd = { urgent: 0, high: 1, medium: 2, low: 3 };
    return [...base].sort((a, b) => {
      if (pOrd[a.priority] !== pOrd[b.priority]) return pOrd[a.priority] - pOrd[b.priority];
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
  }, [tickets, allMode, activeCondoId, search, statusFilter, prioFilter]);

  const counts = useMemoTk(() => {
    const base = allMode ? tickets : tickets.filter(t => t.condoId === activeCondoId);
    return {
      all:         base.length,
      open:        base.filter(t => t.status === 'open').length,
      in_progress: base.filter(t => t.status === 'in_progress').length,
      resolved:    base.filter(t => t.status === 'resolved').length,
      closed:      base.filter(t => t.status === 'closed').length,
    };
  }, [tickets, allMode, activeCondoId]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Tickets</h1>
          <div className="page-sub">
            {list.length} chamado{list.length !== 1 ? 's' : ''} · ordenados por prioridade
          </div>
        </div>
        <div className="row">
          <button className="btn secondary md"><Icon name="download" size={14}/> Exportar CSV</button>
          <button className="btn primary md"><Icon name="plus" size={14}/> Novo chamado</button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <div className="filter-search" style={{ flex: 1, minWidth: 220 }}>
          <Icon name="search" size={14} style={{ color: 'var(--fg-tertiary)', flexShrink: 0 }}/>
          <input placeholder="Buscar por título, protocolo, morador…"
                 value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <div className="seg">
          {[
            ['all',         `Todos (${counts.all})`],
            ['open',        `Abertos (${counts.open})`],
            ['in_progress', `Em andamento (${counts.in_progress})`],
            ['resolved',    `Resolvidos (${counts.resolved})`],
            ['closed',      `Fechados (${counts.closed})`],
          ].map(([v, lbl]) => (
            <button key={v} className={statusFilter === v ? 'active' : ''} onClick={() => setStatusFilter(v)}>{lbl}</button>
          ))}
        </div>
        <select className="input" style={{ width: 'auto', padding: 'var(--space-1) var(--space-3)' }}
                value={prioFilter} onChange={e => setPrioFilter(e.target.value)}>
          <option value="all">Qualquer prioridade</option>
          <option value="urgent">Urgente</option>
          <option value="high">Alta</option>
          <option value="medium">Média</option>
          <option value="low">Baixa</option>
        </select>
        <div className="seg" style={{ marginLeft: 'auto' }}>
          {[['table','Tabela','table'],['cards','Cards','cards'],['kanban','Kanban','kanban']].map(([v, lbl, icn]) => (
            <button key={v} className={layoutMode === v ? 'active' : ''} onClick={() => setLayoutMode(v)}>
              <Icon name={icn} size={12}/> {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Table layout */}
      {layoutMode === 'table' && (
        <div className="card">
          <div className="tbl-wrap">
            <table className="t">
              <thead>
                <tr>
                  <th style={{ width: 110 }}>Protocolo</th>
                  <th>Chamado</th>
                  {allMode && <th style={{ width: 155 }}>Condomínio</th>}
                  <th style={{ width: 130 }}>Status</th>
                  <th style={{ width: 110 }}>Prioridade</th>
                  <th style={{ width: 170 }}>Responsável</th>
                  <th style={{ width: 100 }}>Atualizado</th>
                </tr>
              </thead>
              <tbody>
                {list.map(t => (
                  <tr key={t.id} onClick={() => onPick(t.id)}>
                    <td className="mono">{t.protocol}</td>
                    <td>
                      <div className="cell-primary">
                        {t.priority === 'urgent' && <span style={{ color: 'var(--status-urgent-fg)', marginRight: 5, fontSize: 8 }}>●</span>}
                        {t.title}
                      </div>
                      <div className="cell-sub">{t.category} · {t.resident.name} · {t.location === 'common_area' ? t.locationRef : t.resident.unit}</div>
                    </td>
                    {allMode && <td style={{ fontSize: 'var(--fs-xs)', color: 'var(--fg-secondary)' }}>{condos.find(c => c.id === t.condoId)?.name}</td>}
                    <td><StatusBadge status={t.status}/></td>
                    <td><Priority level={t.priority}/></td>
                    <td>
                      {t.assignedTo
                        ? <span className="row" style={{ gap: 'var(--space-2)', fontSize: 'var(--fs-xs)' }}><Avatar initials={t.assignedTo.initials} size="sm"/> {t.assignedTo.name}</span>
                        : <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--fg-tertiary)', fontStyle: 'italic' }}>Não atribuído</span>}
                    </td>
                    <td style={{ fontSize: 'var(--fs-xs)', color: 'var(--fg-tertiary)', fontFamily: 'var(--font-mono)' }}>{relTime(t.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cards layout */}
      {layoutMode === 'cards' && (
        <div className="cards-grid">
          {list.map(t => (
            <div key={t.id} className={`ticket-card ${t.priority === 'urgent' ? 'urgent' : ''}`} onClick={() => onPick(t.id)}>
              <div className="tc-head">
                <span className="tc-proto">{t.protocol}</span>
                <StatusBadge status={t.status}/>
              </div>
              <h4>{t.title}</h4>
              <div className="tc-desc">{t.description}</div>
              <div className="tc-foot">
                <div className="row" style={{ gap: 'var(--space-2)' }}>
                  <Priority level={t.priority}/>
                  <span style={{ color: 'var(--border-strong)' }}>·</span>
                  <span className="type-chip">{t.category}</span>
                </div>
                <div className="row" style={{ gap: 'var(--space-2)' }}>
                  {t.assignedTo ? <Avatar initials={t.assignedTo.initials} size="sm"/> : <span style={{ fontStyle: 'italic' }}>—</span>}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)' }}>{relTime(t.updatedAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Kanban layout */}
      {layoutMode === 'kanban' && (
        <div className="kanban">
          {['open', 'in_progress', 'resolved', 'closed'].map(s => {
            const col = list.filter(t => t.status === s);
            return (
              <div key={s} className="kanban-col">
                <div className="kanban-col-head">
                  <div className="col-title">
                    <StatusBadge status={s}/>
                  </div>
                  <span className="col-count">{col.length}</span>
                </div>
                {col.map(t => (
                  <div key={t.id} className={`k-card ${t.priority === 'urgent' ? 'urgent' : ''}`} onClick={() => onPick(t.id)}>
                    <div className="k-proto">{t.protocol}</div>
                    <div className="k-title">{t.title}</div>
                    <div className="k-meta">
                      <Priority level={t.priority}/>
                      {t.assignedTo
                        ? <span className="row" style={{ gap: 4 }}><Avatar initials={t.assignedTo.initials} size="sm"/> {t.assignedTo.name.split(' ')[0]}</span>
                        : <span style={{ fontStyle: 'italic', color: 'var(--fg-tertiary)' }}>sem resp.</span>}
                      <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10 }}>{relTime(t.updatedAt)}</span>
                    </div>
                  </div>
                ))}
                {col.length === 0 && (
                  <div style={{ padding: 'var(--space-4) 0', textAlign: 'center', color: 'var(--fg-tertiary)', fontSize: 'var(--fs-xs)' }}>
                    Nenhum chamado
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

window.TicketsPage = TicketsPage;
