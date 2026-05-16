/* Ticket detail modal — aligned to v2 tokens */
const { useState: useStateDet } = React;

function TicketDetail({ ticket, condo, onClose, onUpdateStatus, onAssign, onAddComment, events }) {
  const [comment,       setComment]       = useStateDet('');
  const [assignMenuOpen, setAssignMenuOpen] = useStateDet(false);
  const D = window.ZIVY_DATA;

  if (!ticket) return null;

  const tlMeta = {
    created:        { cls: 'system', icon: 'plus',   label: 'abriu o chamado' },
    status_changed: { cls: 'status', icon: 'check',  label: null },
    assigned:       { cls: 'assign', icon: 'user',   label: 'atribuiu o chamado' },
    comment:        { cls: 'comment',icon: 'send',   label: 'comentou' },
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 'min(760px, 96vw)', maxHeight: '90vh' }}>

        {/* Header */}
        <div style={{ padding: 'var(--space-5) var(--space-6) var(--space-4)', borderBottom: '1px solid var(--border)' }}>
          <div className="row between" style={{ marginBottom: 'var(--space-3)' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--fg-tertiary)', marginBottom: 'var(--space-1)' }}>
                {ticket.protocol} · {condo?.name}
              </div>
              <h2 style={{ margin: 0, fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-semibold)', color: 'var(--fg-primary)', lineHeight: 'var(--lh-snug)' }}>
                {ticket.title}
              </h2>
            </div>
            <button className="btn ghost icon" onClick={onClose}><Icon name="x" size={16}/></button>
          </div>
          <div className="row" style={{ gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <StatusBadge status={ticket.status}/>
            <Priority level={ticket.priority}/>
            <span className="type-chip">{ticket.category}</span>
            <span className="type-chip">
              {ticket.location === 'common_area'
                ? <><Icon name="mapPin" size={11}/> {ticket.locationRef || 'Área comum'}</>
                : <><Icon name="door" size={11}/> {ticket.resident.unit}</>}
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', marginTop: 'var(--space-3)', fontSize: 'var(--fs-xs)', color: 'var(--fg-tertiary)' }}>
            <span><span style={{ color: 'var(--fg-tertiary)', marginRight: 3 }}>Morador:</span> <span style={{ color: 'var(--fg-secondary)', fontWeight: 'var(--fw-medium)' }}>{ticket.resident.name}</span></span>
            <span><span style={{ marginRight: 3 }}>Contato:</span> <span style={{ fontFamily: 'var(--font-mono)' }}>{ticket.resident.phone}</span></span>
            <span><span style={{ marginRight: 3 }}>Aberto:</span> {fullTime(ticket.createdAt)}</span>
            <span><span style={{ marginRight: 3 }}>Atualizado:</span> {relTime(ticket.updatedAt)}</span>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 'var(--space-5) var(--space-6)', overflowY: 'auto', maxHeight: 'calc(90vh - 240px)' }}>

          {/* Actions row */}
          <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-5)', boxShadow: 'none' }}>
            <div className="row" style={{ gap: 'var(--space-5)', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 'var(--fs-xs)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-tertiary)', fontWeight: 'var(--fw-medium)', marginBottom: 'var(--space-2)' }}>Mudar status</div>
                <div className="seg" style={{ width: '100%' }}>
                  {['open','in_progress','resolved','closed'].map(s => (
                    <button key={s} className={ticket.status === s ? 'active' : ''} onClick={() => onUpdateStatus(s)} style={{ flex: 1 }}>
                      {D.STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ position: 'relative' }}>
                <div style={{ fontSize: 'var(--fs-xs)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-tertiary)', fontWeight: 'var(--fw-medium)', marginBottom: 'var(--space-2)' }}>Responsável</div>
                <button className="btn secondary md" onClick={() => setAssignMenuOpen(v => !v)}>
                  {ticket.assignedTo
                    ? <><Avatar initials={ticket.assignedTo.initials} size="sm"/> {ticket.assignedTo.name}</>
                    : <><Icon name="user" size={13}/> Atribuir</>}
                  <Icon name="chevron" size={12}/>
                </button>
                {assignMenuOpen && (
                  <div className="menu" style={{ position: 'absolute', right: 0, top: 62, zIndex: 50 }}>
                    {D.MANAGERS.map(m => (
                      <div key={m.id} className="menu-item" onClick={() => { onAssign(m); setAssignMenuOpen(false); }}>
                        <Avatar initials={m.initials} size="sm"/>
                        <div className="col" style={{ gap: 0 }}>
                          <span style={{ fontWeight: 'var(--fw-medium)' }}>{m.name}</span>
                          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--fg-tertiary)', textTransform: 'capitalize' }}>{m.role}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div style={{ fontSize: 'var(--fs-xs)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-tertiary)', fontWeight: 'var(--fw-medium)', marginBottom: 'var(--space-2)' }}>Descrição</div>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--fg-secondary)', lineHeight: 'var(--lh-relaxed)', padding: 'var(--space-3) var(--space-4)', background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: 'var(--space-5)' }}>
            {ticket.description}
          </div>

          {/* Timeline */}
          <div style={{ fontSize: 'var(--fs-xs)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-tertiary)', fontWeight: 'var(--fw-medium)', marginBottom: 'var(--space-4)' }}>
            Timeline ({events.length} eventos)
          </div>
          <div className="timeline">
            {events.map((ev, i) => {
              const m = tlMeta[ev.type] || tlMeta.comment;
              return (
                <div key={i} className={`tl-item ${m.cls}`}>
                  <div className="tl-dot"><Icon name={m.icon} size={10} stroke={2.5}/></div>
                  <div className="tl-head">
                    <span className="author">{ev.actor}</span>
                    <span className="action">
                      {ev.type === 'status_changed'
                        ? <>{ev.from && <>mudou de <StatusBadge status={ev.from}/> para </>}<StatusBadge status={ev.to}/></>
                        : m.label}
                    </span>
                    <span className="time">{relTime(ev.at)}</span>
                  </div>
                  {ev.note && <div className="tl-body">{ev.note}</div>}
                </div>
              );
            })}
          </div>

          {/* Comment composer */}
          <div className="composer">
            <textarea placeholder="Adicionar comentário (morador será notificado via Telegram)…"
                      value={comment} onChange={e => setComment(e.target.value)}/>
            <div className="composer-footer">
              <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--fg-tertiary)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                <Icon name="telegram" size={12}/> Será enviado a {ticket.resident.name.split(' ')[0]}
              </span>
              <button className="btn primary sm" disabled={!comment.trim()}
                      onClick={() => { onAddComment(comment); setComment(''); }}>
                <Icon name="send" size={12}/> Publicar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.TicketDetail = TicketDetail;
