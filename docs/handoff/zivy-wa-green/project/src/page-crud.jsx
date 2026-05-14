/* CRUD pages — Blocks, Units, Common Areas — aligned to v2 tokens */
const { useState: useStateCR } = React;

/* ── Blocks ──────────────────────────────────────────────── */
function BlocksPage({ condo, blocks, setBlocks }) {
  const [editor,   setEditor]   = useStateCR(null);
  const [toDelete, setToDelete] = useStateCR(null);
  const D = window.ZIVY_DATA;

  const save = () => {
    if (editor.id) setBlocks(blocks.map(b => b.id === editor.id ? { ...b, name: editor.name, description: editor.description } : b));
    else setBlocks([{ ...editor, id: 'b' + Date.now(), units: 0, created: new Date().toISOString().slice(0, 10) }, ...blocks]);
    setEditor(null);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Blocos</h1>
          <div className="page-sub">{blocks.length} blocos em {condo?.name} · {blocks.reduce((a, b) => a + b.units, 0)} unidades totais</div>
        </div>
        <button className="btn primary md" onClick={() => setEditor({ name: '', description: '' })}>
          <Icon name="plus" size={14}/> Novo bloco
        </button>
      </div>
      <div className="card">
        <div className="tbl-wrap">
          <table className="t">
            <thead><tr><th>Nome</th><th>Descrição</th><th style={{ width: 100 }}>Unidades</th><th style={{ width: 130 }}>Criado em</th><th style={{ width: 120 }}></th></tr></thead>
            <tbody>
              {blocks.map(b => (
                <tr key={b.id} onClick={() => {}}>
                  <td><span className="row" style={{ gap: 'var(--space-2)' }}><Icon name="building" size={13}/> <span className="cell-primary">{b.name}</span></span></td>
                  <td style={{ color: 'var(--fg-tertiary)', fontSize: 'var(--fs-sm)' }}>{b.description}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)' }}>{b.units}</td>
                  <td style={{ fontSize: 'var(--fs-xs)', color: 'var(--fg-tertiary)', fontFamily: 'var(--font-mono)' }}>{b.created}</td>
                  <td>
                    <div className="row" style={{ gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
                      <button className="btn ghost sm" onClick={e => { e.stopPropagation(); setEditor({ ...b }); }}><Icon name="edit" size={12}/> Editar</button>
                      <button className="btn ghost sm" onClick={e => { e.stopPropagation(); setToDelete(b); }} style={{ color: 'var(--danger)' }}><Icon name="trash" size={12}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editor && (
        <div className="modal-overlay" onClick={() => setEditor(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div><h2>{editor.id ? 'Editar bloco' : 'Novo bloco'}</h2><div className="modal-sub">{condo?.name}</div></div>
              <button className="btn ghost icon" onClick={() => setEditor(null)}><Icon name="x" size={15}/></button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label>Nome <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input className="input" autoFocus placeholder="ex: Bloco A, Torre Norte" value={editor.name} onChange={e => setEditor({ ...editor, name: e.target.value })}/>
              </div>
              <div className="field">
                <label>Descrição</label>
                <textarea className="textarea" placeholder="Detalhes opcionais (andares, localização…)" value={editor.description} onChange={e => setEditor({ ...editor, description: e.target.value })}/>
                <div className="hint">Visível apenas para gestores.</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn ghost md" onClick={() => setEditor(null)}>Cancelar</button>
              <button className="btn primary md" onClick={save} disabled={!editor.name?.trim()}><Icon name="check" size={13}/> Salvar</button>
            </div>
          </div>
        </div>
      )}
      {toDelete && <ConfirmDelete title={`Excluir ${toDelete.name}?`} body={`${toDelete.units} unidades vinculadas ficarão órfãs.`} onCancel={() => setToDelete(null)} onConfirm={() => { setBlocks(blocks.filter(b => b.id !== toDelete.id)); setToDelete(null); }}/>}
    </>
  );
}

/* ── Units ───────────────────────────────────────────────── */
function UnitsPage({ condo, blocks, units, setUnits }) {
  const [editor,      setEditor]      = useStateCR(null);
  const [toDelete,    setToDelete]    = useStateCR(null);
  const [filterBlock, setFilterBlock] = useStateCR('all');

  const visible = filterBlock === 'all' ? units : units.filter(u => u.block === filterBlock);
  const save = () => {
    if (editor.id) setUnits(units.map(u => u.id === editor.id ? { ...u, ...editor } : u));
    else setUnits([{ ...editor, id: 'u' + Date.now(), residents: 0 }, ...units]);
    setEditor(null);
  };

  return (
    <>
      <div className="page-header">
        <div><h1>Unidades</h1><div className="page-sub">{units.length} unidades em {condo?.name}</div></div>
        <button className="btn primary md" onClick={() => setEditor({ block: blocks[0]?.name || '', number: '', floor: 1 })}>
          <Icon name="plus" size={14}/> Nova unidade
        </button>
      </div>
      <div className="filter-bar">
        <select className="input" style={{ width: 'auto' }} value={filterBlock} onChange={e => setFilterBlock(e.target.value)}>
          <option value="all">Todos os blocos ({units.length})</option>
          {blocks.map(b => <option key={b.id} value={b.name}>{b.name} ({units.filter(u => u.block === b.name).length})</option>)}
        </select>
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--fg-tertiary)' }}>{visible.length} unidades</span>
      </div>
      <div className="card">
        <div className="tbl-wrap">
          <table className="t">
            <thead><tr><th>Bloco</th><th>Número</th><th style={{ width: 90 }}>Andar</th><th>Moradores</th><th style={{ width: 110 }}></th></tr></thead>
            <tbody>
              {visible.map(u => (
                <tr key={u.id}>
                  <td style={{ fontSize: 'var(--fs-sm)', color: 'var(--fg-secondary)' }}><Icon name="building" size={12}/> {u.block}</td>
                  <td><span className="cell-primary">{u.number}</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)' }}>{u.floor === 0 ? 'Térreo' : `${u.floor}º`}</td>
                  <td>
                    <span className="row" style={{ gap: 'var(--space-2)', fontSize: 'var(--fs-sm)' }}>
                      <Icon name="users" size={12}/> {u.residents}
                      {u.residents === 0 && <span style={{ color: 'var(--fg-tertiary)', fontStyle: 'italic', fontSize: 'var(--fs-xs)' }}>(vazia)</span>}
                    </span>
                  </td>
                  <td>
                    <div className="row" style={{ gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
                      <button className="btn ghost sm" onClick={() => setEditor({ ...u })}><Icon name="edit" size={12}/></button>
                      <button className="btn ghost sm" onClick={() => setToDelete(u)} style={{ color: 'var(--danger)' }}><Icon name="trash" size={12}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editor && (
        <div className="modal-overlay" onClick={() => setEditor(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div><h2>{editor.id ? 'Editar unidade' : 'Nova unidade'}</h2><div className="modal-sub">{condo?.name}</div></div>
              <button className="btn ghost icon" onClick={() => setEditor(null)}><Icon name="x" size={15}/></button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label>Bloco <span style={{ color: 'var(--danger)' }}>*</span></label>
                <select className="select" value={editor.block} onChange={e => setEditor({ ...editor, block: e.target.value })}>
                  {blocks.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
              </div>
              <div className="grid-2">
                <div className="field">
                  <label>Número / Identificador <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input className="input" autoFocus placeholder="ex: 101, Apt 12" value={editor.number} onChange={e => setEditor({ ...editor, number: e.target.value })}/>
                </div>
                <div className="field">
                  <label>Andar</label>
                  <input className="input" type="number" min="0" value={editor.floor} onChange={e => setEditor({ ...editor, floor: parseInt(e.target.value) || 0 })}/>
                  <div className="hint">0 = térreo</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn ghost md" onClick={() => setEditor(null)}>Cancelar</button>
              <button className="btn primary md" onClick={save} disabled={!editor.number?.trim()}><Icon name="check" size={13}/> Salvar</button>
            </div>
          </div>
        </div>
      )}
      {toDelete && <ConfirmDelete title={`Excluir unidade ${toDelete.number}?`} body="Moradores vinculados ficarão PENDING e precisarão ser reatribuídos." onCancel={() => setToDelete(null)} onConfirm={() => { setUnits(units.filter(u => u.id !== toDelete.id)); setToDelete(null); }}/>}
    </>
  );
}

/* ── Areas ───────────────────────────────────────────────── */
function AreasPage({ condo, areas, setAreas }) {
  const [editor,   setEditor]   = useStateCR(null);
  const [toDelete, setToDelete] = useStateCR(null);
  const D = window.ZIVY_DATA;

  const save = () => {
    if (editor.id) setAreas(areas.map(a => a.id === editor.id ? { ...a, ...editor } : a));
    else setAreas([{ ...editor, id: 'a' + Date.now(), tickets: 0 }, ...areas]);
    setEditor(null);
  };

  return (
    <>
      <div className="page-header">
        <div><h1>Áreas comuns</h1><div className="page-sub">{areas.length} áreas em {condo?.name}</div></div>
        <button className="btn primary md" onClick={() => setEditor({ name: '', type: 'other' })}>
          <Icon name="plus" size={14}/> Nova área
        </button>
      </div>
      <div className="cards-grid">
        {areas.map(a => (
          <div key={a.id} className="ticket-card" style={{ cursor: 'default' }}>
            <div className="tc-head">
              <span className="type-chip">{D.AREA_TYPE_LABELS[a.type]}</span>
              <div className="row" style={{ gap: 'var(--space-1)' }}>
                <button className="btn ghost sm" onClick={() => setEditor({ ...a })}><Icon name="edit" size={12}/></button>
                <button className="btn ghost sm" onClick={() => setToDelete(a)} style={{ color: 'var(--danger)' }}><Icon name="trash" size={12}/></button>
              </div>
            </div>
            <h4>{a.name}</h4>
            <div className="tc-foot" style={{ marginTop: 'var(--space-3)' }}>
              <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--fg-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                {a.tickets} chamado{a.tickets !== 1 ? 's' : ''} ativo{a.tickets !== 1 ? 's' : ''}
              </span>
              {a.tickets > 0 && <StatusBadge status="in_progress"/>}
            </div>
          </div>
        ))}
      </div>

      {editor && (
        <div className="modal-overlay" onClick={() => setEditor(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div><h2>{editor.id ? 'Editar área' : 'Nova área comum'}</h2><div className="modal-sub">{condo?.name}</div></div>
              <button className="btn ghost icon" onClick={() => setEditor(null)}><Icon name="x" size={15}/></button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label>Nome <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input className="input" autoFocus placeholder="ex: Elevador Social Bloco A, Piscina" value={editor.name} onChange={e => setEditor({ ...editor, name: e.target.value })}/>
              </div>
              <div className="field">
                <label>Tipo <span style={{ color: 'var(--danger)' }}>*</span></label>
                <select className="select" value={editor.type} onChange={e => setEditor({ ...editor, type: e.target.value })}>
                  {Object.entries(D.AREA_TYPE_LABELS).map(([v, lbl]) => <option key={v} value={v}>{lbl}</option>)}
                </select>
                <div className="hint">Usado pela IA de triagem para categorizar chamados vinculados.</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn ghost md" onClick={() => setEditor(null)}>Cancelar</button>
              <button className="btn primary md" onClick={save} disabled={!editor.name?.trim()}><Icon name="check" size={13}/> Salvar</button>
            </div>
          </div>
        </div>
      )}
      {toDelete && <ConfirmDelete title={`Excluir ${toDelete.name}?`} body="Chamados vinculados permanecem (common_area_id será NULL — semântica do Core)." onCancel={() => setToDelete(null)} onConfirm={() => { setAreas(areas.filter(a => a.id !== toDelete.id)); setToDelete(null); }}/>}
    </>
  );
}

Object.assign(window, { BlocksPage, UnitsPage, AreasPage });
