/* Inbox page — mirrors /inbox route from real codebase */
const { useState: useStateInbox, useMemo: useMemoInbox } = React;

const INBOX_ITEMS = [
  { id: 'i1', unread: true,  kind: 'ticket_new',    title: 'Novo chamado urgente: Câmera da entrada offline', sub: 'TKT-2026-032 · Portaria · Residencial Jardins', time: '2026-05-12T09:58:00', avatar: 'PO', condoName: 'Residencial Jardins', ticketId: 't10' },
  { id: 'i2', unread: true,  kind: 'ticket_new',    title: 'Novo chamado: Elevador parado no 8º andar', sub: 'TKT-2026-041 · Bloco A · Residencial Jardins', time: '2026-05-12T08:12:00', avatar: 'MC', condoName: 'Residencial Jardins', ticketId: 't1' },
  { id: 'i3', unread: true,  kind: 'approval',      title: 'Aprovação pendente: Lucas Ferreira (Bloco B, 203)', sub: 'Aguardando confirmação de identidade', time: '2026-05-12T07:40:00', avatar: 'LF', condoName: 'Residencial Jardins', ticketId: null },
  { id: 'i4', unread: false, kind: 'ticket_comment', title: 'Novo comentário em TKT-2026-041', sub: 'Mariana Costa: "Obrigada pelo retorno rápido."', time: '2026-05-12T07:05:00', avatar: 'MC', condoName: 'Residencial Jardins', ticketId: 't1' },
  { id: 'i5', unread: false, kind: 'ticket_new',    title: 'Novo chamado: Vazamento no teto da garagem G1', sub: 'TKT-2026-040 · Garagem G1 · Residencial Jardins', time: '2026-05-11T22:40:00', avatar: 'CP', condoName: 'Residencial Jardins', ticketId: 't2' },
  { id: 'i6', unread: false, kind: 'approval',      title: 'Aprovação pendente: Ana Beatriz Lima (Bloco D, 101)', sub: 'Morador criado via bot com status PENDING', time: '2026-05-11T18:30:00', avatar: 'AB', condoName: 'Condomínio Parque Alto', ticketId: null },
  { id: 'i7', unread: false, kind: 'ticket_new',    title: 'Novo chamado: Infiltração na parede da sala — Apt 301', sub: 'TKT-2026-033 · Bloco B · Residencial Jardins', time: '2026-05-11T10:00:00', avatar: 'AT', condoName: 'Residencial Jardins', ticketId: 't9' },
  { id: 'i8', unread: false, kind: 'status_change', title: 'TKT-2026-037 resolvido: Luz da escada apagada', sub: 'Rodrigo Santos marcou como resolvido', time: '2026-05-10T17:40:00', avatar: 'RS', condoName: 'Residencial Jardins', ticketId: 't5' },
];

const KIND_ICON = {
  ticket_new:    { icon: 'bell',   bg: 'var(--info-bg)',             fg: 'var(--info-fg)' },
  ticket_comment:{ icon: 'send',   bg: 'var(--brand-soft)',          fg: 'var(--brand)' },
  approval:      { icon: 'shield', bg: 'var(--status-onhold-bg)',    fg: 'var(--status-onhold-fg)' },
  status_change: { icon: 'check',  bg: 'var(--status-media-bg)',     fg: 'var(--status-media-fg)' },
};

function InboxPage({ onPickTicket, setRoute }) {
  const [items, setItems] = useStateInbox(INBOX_ITEMS);
  const [filter, setFilter] = useStateInbox('all');

  const unread = items.filter(i => i.unread).length;
  const visible = useMemoInbox(() => {
    if (filter === 'unread') return items.filter(i => i.unread);
    if (filter === 'approvals') return items.filter(i => i.kind === 'approval');
    return items;
  }, [items, filter]);

  const markAllRead = () => setItems(list => list.map(i => ({ ...i, unread: false })));

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Inbox</h1>
          <div className="page-sub">
            {unread > 0
              ? `${unread} item${unread > 1 ? 's' : ''} não lido${unread > 1 ? 's' : ''}`
              : 'Tudo em dia — nenhum item não lido'}
          </div>
        </div>
        <div className="row">
          {unread > 0 && (
            <button className="btn secondary md" onClick={markAllRead}>
              <Icon name="check" size={14}/> Marcar tudo como lido
            </button>
          )}
          <button className="btn primary md" onClick={() => setRoute('approvals')}>
            <Icon name="shield" size={14}/> Ver aprovações pendentes
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="seg" style={{ marginBottom: 'var(--space-4)' }}>
        {[['all', `Todos (${items.length})`], ['unread', `Não lidos (${unread})`], ['approvals', 'Aprovações']].map(([v, lbl]) => (
          <button key={v} className={filter === v ? 'active' : ''} onClick={() => setFilter(v)}>{lbl}</button>
        ))}
      </div>

      <div className="card">
        <div className="inbox-list">
          {visible.map(item => {
            const meta = KIND_ICON[item.kind] || KIND_ICON.ticket_new;
            return (
              <div key={item.id}
                   className={`inbox-item ${item.unread ? 'unread' : ''}`}
                   onClick={() => {
                     setItems(list => list.map(i => i.id === item.id ? { ...i, unread: false } : i));
                     if (item.ticketId) onPickTicket(item.ticketId);
                     else if (item.kind === 'approval') setRoute('approvals');
                   }}>
                {/* Kind icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-md)',
                  background: meta.bg, color: meta.fg,
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                }}>
                  <Icon name={meta.icon} size={16}/>
                </div>
                <div className="ii-body">
                  <div className="ii-head">
                    <span className="ii-title">{item.title}</span>
                    {item.unread && (
                      <span className="badge" style={{ background: 'var(--brand-soft)', color: 'var(--brand)', fontSize: 10 }}>Novo</span>
                    )}
                    <span className="ii-time">{relTime(item.time)}</span>
                  </div>
                  <div className="ii-sub">
                    <span style={{ marginRight: 'var(--space-2)' }}>{item.condoName}</span>
                    · {item.sub}
                  </div>
                </div>
              </div>
            );
          })}
          {visible.length === 0 && (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--fg-tertiary)', fontSize: 'var(--fs-sm)' }}>
              Nenhum item nesta categoria.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

window.InboxPage = InboxPage;
