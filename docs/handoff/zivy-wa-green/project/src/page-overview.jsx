/* Overview page — multi-condo hero, aligned to v2 tokens */
const { useState: useStateOv, useMemo: useMemoOv } = React;

function OverviewPage({ condos, allMode, activeCondoId, setActiveCondoId, setAllMode, tickets, setRoute, onPickTicket }) {
  const visibleCondos = allMode ? condos : condos.filter(c => c.id === activeCondoId);

  const totals = useMemoOv(() => {
    const all = allMode ? tickets : tickets.filter(t => t.condoId === activeCondoId);
    return {
      open:     all.filter(t => t.status === 'open').length,
      inprog:   all.filter(t => t.status === 'in_progress').length,
      resolved: all.filter(t => t.status === 'resolved').length,
      urgent:   all.filter(t => t.priority === 'urgent' && t.status !== 'closed').length,
    };
  }, [tickets, allMode, activeCondoId]);

  const mostRecent = useMemoOv(() => {
    const base = allMode ? tickets : tickets.filter(t => t.condoId === activeCondoId);
    return [...base].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 6);
  }, [tickets, allMode, activeCondoId]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>{allMode ? 'Visão geral' : condos.find(c => c.id === activeCondoId)?.name}</h1>
          <div className="page-sub">
            {allMode ? `Operação consolidada de ${condos.length} condomínios.` : 'Status operacional do condomínio.'}
          </div>
        </div>
        <div className="row">
          <button className="btn secondary md"><Icon name="filter" size={14}/> Período</button>
          <button className="btn primary md" onClick={() => setRoute('tickets')}>
            <Icon name="table" size={14}/> Ver chamados
          </button>
        </div>
      </div>

      <div className="kpi-row">
        <div className="kpi">
          <div className="kpi-label">Abertos</div>
          <div className="kpi-num">{totals.open}</div>
          <div className="kpi-sub">aguardando triagem ou atribuição</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Em andamento</div>
          <div className="kpi-num brand">{totals.inprog}</div>
          <div className="kpi-sub">com responsável ativo</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Resolvidos</div>
          <div className="kpi-num">{totals.resolved}</div>
          <div className="kpi-sub">prontos para fechamento</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Urgentes ativos</div>
          <div className="kpi-num urgent">{totals.urgent}</div>
          <div className="kpi-sub">triados pela IA</div>
        </div>
      </div>

      {allMode && (
        <>
          <div className="row between" style={{ marginBottom: 'var(--space-3)' }}>
            <h3 style={{ margin: 0, fontSize: 'var(--fs-base)', fontWeight: 'var(--fw-semibold)', color: 'var(--fg-primary)' }}>
              Condomínios
            </h3>
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--fg-tertiary)' }}>Clique para focar o contexto</span>
          </div>
          <div className="condo-grid">
            {visibleCondos.map(c => {
              const total = c.tickets.open + c.tickets.in_progress + c.tickets.resolved;
              const pct = n => total ? (n / total) * 100 : 0;
              return (
                <div key={c.id} className={`condo-card ${!allMode && c.id === activeCondoId ? 'active' : ''}`}
                     onClick={() => { setActiveCondoId(c.id); setAllMode(false); setRoute('overview'); }}>
                  <div className="cc-head">
                    <div className="cc-mark">{c.mark}</div>
                    <div>
                      <h3>{c.name}</h3>
                      <div className="cc-sub">{c.city} · {c.blocks} blocos · {c.units} un.</div>
                    </div>
                  </div>
                  <div className="cc-stats">
                    <div className="cc-stat"><span className="num">{c.tickets.open}</span><span className="lab">Abertos</span></div>
                    <div className="cc-stat"><span className="num">{c.tickets.in_progress}</span><span className="lab">Em curso</span></div>
                    <div className="cc-stat"><span className="num">{c.tickets.resolved}</span><span className="lab">Resolvidos</span></div>
                    <div className={`cc-stat ${c.urgent ? 'urgent' : ''}`}><span className="num">{c.urgent}</span><span className="lab">Urgentes</span></div>
                  </div>
                  <div className="cc-progress">
                    <i className="p-open" style={{ width: `${pct(c.tickets.open)}%` }}/>
                    <i className="p-prog"  style={{ width: `${pct(c.tickets.in_progress)}%` }}/>
                    <i className="p-res"   style={{ width: `${pct(c.tickets.resolved)}%` }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="row between" style={{ marginBottom: 'var(--space-3)', marginTop: allMode ? 0 : 0 }}>
        <h3 style={{ margin: 0, fontSize: 'var(--fs-base)', fontWeight: 'var(--fw-semibold)', color: 'var(--fg-primary)' }}>
          Atividade recente
        </h3>
        <button className="btn ghost sm" onClick={() => setRoute('tickets')}>
          Ver todos <Icon name="chevronR" size={12}/>
        </button>
      </div>

      <div className="card">
        <div className="tbl-wrap">
          <table className="t">
            <thead>
              <tr>
                <th style={{ width: 110 }}>Protocolo</th>
                <th>Chamado</th>
                {allMode && <th style={{ width: 160 }}>Condomínio</th>}
                <th style={{ width: 130 }}>Status</th>
                <th style={{ width: 110 }}>Prioridade</th>
                <th style={{ width: 160 }}>Responsável</th>
                <th style={{ width: 100 }}>Atualizado</th>
              </tr>
            </thead>
            <tbody>
              {mostRecent.map(t => (
                <tr key={t.id} onClick={() => onPickTicket(t.id)}>
                  <td className="mono">{t.protocol}</td>
                  <td>
                    <div className="cell-primary">{t.title}</div>
                    <div className="cell-sub">{t.resident.name} · {t.location === 'common_area' ? t.locationRef : t.resident.unit}</div>
                  </td>
                  {allMode && <td style={{ fontSize: 'var(--fs-xs)', color: 'var(--fg-secondary)' }}>{condos.find(c => c.id === t.condoId)?.name}</td>}
                  <td><StatusBadge status={t.status}/></td>
                  <td><Priority level={t.priority}/></td>
                  <td>
                    {t.assignedTo
                      ? <span className="row" style={{ gap: 'var(--space-2)', fontSize: 'var(--fs-xs)' }}><Avatar initials={t.assignedTo.initials} size="sm"/> {t.assignedTo.name}</span>
                      : <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--fg-tertiary)', fontStyle: 'italic' }}>—</span>}
                  </td>
                  <td style={{ fontSize: 'var(--fs-xs)', color: 'var(--fg-tertiary)', fontFamily: 'var(--font-mono)' }}>{relTime(t.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

window.OverviewPage = OverviewPage;
