/* Approvals page — maps to PATCH /residents/{id}/approve in Core */
const { useState: useStateAp } = React;

const PENDING_RESIDENTS = [
  { id: 'r1', name: 'Lucas Ferreira',    phone: '+55 11 9****-4312', unit: 'Apt 203', block: 'Bloco B', condoName: 'Residencial Jardins',   pendingSince: '2026-05-12T07:40:00', botSession: true },
  { id: 'r2', name: 'Ana Beatriz Lima',  phone: '+55 19 9****-8821', unit: 'Apt 101', block: 'Bloco D', condoName: 'Condomínio Parque Alto', pendingSince: '2026-05-11T18:30:00', botSession: true },
  { id: 'r3', name: 'Marcos Vinicius',   phone: '+55 11 9****-6634', unit: 'Apt 502', block: 'Bloco C', condoName: 'Residencial Jardins',   pendingSince: '2026-05-10T09:15:00', botSession: false },
];

function ApprovalsPage() {
  const [residents, setResidents] = useStateAp(PENDING_RESIDENTS);
  const [toReject, setToReject] = useStateAp(null);
  const [approved, setApproved] = useStateAp([]);

  const approve = (id) => {
    setResidents(r => r.filter(x => x.id !== id));
    setApproved(a => [...a, id]);
  };
  const reject = (id) => {
    setResidents(r => r.filter(x => x.id !== id));
    setToReject(null);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Aprovações pendentes</h1>
          <div className="page-sub">
            Moradores que se cadastraram via bot Telegram com status <code style={{ background: 'var(--bg-muted)', padding: '1px 5px', borderRadius: 4, fontSize: 'var(--fs-xs)', fontFamily: 'var(--font-mono)' }}>PENDING</code> aguardando confirmação do gestor.
          </div>
        </div>
        {approved.length > 0 && (
          <span className="badge resolved" style={{ fontSize: 'var(--fs-sm)', padding: '4px 12px' }}>
            <span className="dot"/>{approved.length} aprovado{approved.length > 1 ? 's' : ''} nesta sessão
          </span>
        )}
      </div>

      {residents.length === 0 && approved.length > 0 && (
        <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 'var(--space-3)' }}>✓</div>
          <div style={{ fontWeight: 'var(--fw-semibold)', color: 'var(--fg-primary)', marginBottom: 'var(--space-1)' }}>
            Tudo aprovado!
          </div>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--fg-tertiary)' }}>
            Não há mais moradores aguardando aprovação.
          </div>
        </div>
      )}

      {residents.length === 0 && approved.length === 0 && (
        <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--fg-tertiary)' }}>
            Nenhuma aprovação pendente no momento.
          </div>
        </div>
      )}

      {residents.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3>Moradores PENDING</h3>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--fg-tertiary)', marginTop: 2 }}>
                {residents.length} morador{residents.length > 1 ? 'es' : ''} aguardando · confirme identidade antes de aprovar
              </div>
            </div>
          </div>

          {/* Helper banner */}
          <div style={{
            margin: 'var(--space-3) var(--space-4) 0',
            padding: 'var(--space-3) var(--space-3)',
            background: 'var(--info-bg)', color: 'var(--info-fg)',
            borderRadius: 'var(--radius-md)', fontSize: 'var(--fs-xs)',
            display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)',
          }}>
            <Icon name="shield" size={14}/>
            <span>
              Estes moradores completaram o onboarding pelo bot mas a unidade informada precisou de confirmação manual.
              Aprovação muda status para <strong>ACTIVE</strong> e libera o morador para abrir chamados.
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-4)' }}>
            {residents.map(r => (
              <div key={r.id} className="approval-card">
                <Avatar initials={r.name.split(' ').map(n => n[0]).join('').slice(0,2)} size="lg"/>
                <div className="ac-info">
                  <div className="ac-name">{r.name}</div>
                  <div className="ac-meta">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 'var(--space-3)' }}>
                      <Icon name="door" size={11}/> {r.block} · {r.unit}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 'var(--space-3)' }}>
                      <Icon name="building" size={11}/> {r.condoName}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 'var(--space-3)' }}>
                      <Icon name="telegram" size={11}/> {r.phone}
                    </span>
                    <span style={{ color: 'var(--fg-tertiary)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                      Pendente {relTime(r.pendingSince)}
                    </span>
                  </div>
                  {r.botSession && (
                    <span className="badge" style={{ background: 'var(--brand-soft)', color: 'var(--brand)', marginTop: 4, fontSize: 10 }}>
                      <span className="dot"/><Icon name="telegram" size={9}/> Cadastrado via bot
                    </span>
                  )}
                </div>
                <div className="ac-actions">
                  <button className="btn danger-ghost sm" onClick={() => setToReject(r)}>
                    <Icon name="x" size={13}/> Rejeitar
                  </button>
                  <button className="btn primary sm" onClick={() => approve(r.id)}>
                    <Icon name="check" size={13}/> Aprovar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reject confirm */}
      {toReject && (
        <ConfirmDelete
          title={`Rejeitar ${toReject.name}?`}
          body={`O morador será removido do sistema. Ele não poderá abrir chamados e precisará fazer o onboarding novamente caso deseje se cadastrar.`}
          onCancel={() => setToReject(null)}
          onConfirm={() => reject(toReject.id)}
        />
      )}
    </>
  );
}

window.ApprovalsPage = ApprovalsPage;
