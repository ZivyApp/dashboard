/* Mock data for Zivy dashboard. Mirrors core domain: Condo, Block, Unit, CommonArea, Resident, Ticket, TicketEvent. */

const CONDOS = [
  { id: 'c1', mark: 'JR', name: 'Residencial Jardins',   slug: 'jardins',   city: 'São Paulo, SP',    blocks: 4, units: 96,  residents: 214, tickets: { open: 7, in_progress: 4, resolved: 12, closed: 48 }, urgent: 2 },
  { id: 'c2', mark: 'VP', name: 'Villa Paulista',         slug: 'villa-paulista', city: 'São Paulo, SP', blocks: 2, units: 48, residents: 112, tickets: { open: 3, in_progress: 2, resolved: 9,  closed: 33 }, urgent: 0 },
  { id: 'c3', mark: 'EM', name: 'Edifício Morumbi',       slug: 'morumbi',   city: 'São Paulo, SP',    blocks: 1, units: 28,  residents: 54,  tickets: { open: 5, in_progress: 1, resolved: 4,  closed: 17 }, urgent: 1 },
  { id: 'c4', mark: 'CP', name: 'Condomínio Parque Alto', slug: 'parque-alto', city: 'Campinas, SP',   blocks: 6, units: 180, residents: 402, tickets: { open: 11, in_progress: 6, resolved: 21, closed: 92 }, urgent: 3 },
  { id: 'c5', mark: 'RV', name: 'Residencial Vista Mar',  slug: 'vista-mar', city: 'Santos, SP',       blocks: 3, units: 72,  residents: 168, tickets: { open: 2, in_progress: 3, resolved: 7,  closed: 41 }, urgent: 0 },
  { id: 'c6', mark: 'TN', name: 'Torres do Novo Centro',  slug: 'torres-novo', city: 'São Paulo, SP',  blocks: 2, units: 64,  residents: 128, tickets: { open: 4, in_progress: 2, resolved: 6,  closed: 22 }, urgent: 1 },
];

const BLOCKS = {
  c1: [
    { id: 'b1', name: 'Bloco A', description: 'Torre norte — 12 andares', units: 24, created: '2024-03-14' },
    { id: 'b2', name: 'Bloco B', description: 'Torre sul — 12 andares',   units: 24, created: '2024-03-14' },
    { id: 'b3', name: 'Bloco C', description: 'Torre central — 12 andares', units: 24, created: '2024-03-14' },
    { id: 'b4', name: 'Bloco D', description: 'Garden — 6 andares', units: 24, created: '2024-08-02' },
  ],
};

const UNITS = {
  c1: [
    { id: 'u1', block: 'Bloco A', number: '101', floor: 1, residents: 3 },
    { id: 'u2', block: 'Bloco A', number: '102', floor: 1, residents: 2 },
    { id: 'u3', block: 'Bloco A', number: '201', floor: 2, residents: 4 },
    { id: 'u4', block: 'Bloco A', number: '202', floor: 2, residents: 1 },
    { id: 'u5', block: 'Bloco B', number: '101', floor: 1, residents: 2 },
    { id: 'u6', block: 'Bloco B', number: '301', floor: 3, residents: 3 },
    { id: 'u7', block: 'Bloco C', number: '401', floor: 4, residents: 2 },
    { id: 'u8', block: 'Bloco C', number: '502', floor: 5, residents: 0 },
    { id: 'u9', block: 'Bloco D', number: '101', floor: 1, residents: 4 },
  ],
};

const AREAS = {
  c1: [
    { id: 'a1', name: 'Elevador Social Bloco A', type: 'elevator', tickets: 2 },
    { id: 'a2', name: 'Elevador Social Bloco B', type: 'elevator', tickets: 0 },
    { id: 'a3', name: 'Piscina',                 type: 'pool',     tickets: 1 },
    { id: 'a4', name: 'Academia',                type: 'gym',      tickets: 0 },
    { id: 'a5', name: 'Salão de festas',         type: 'lobby',    tickets: 0 },
    { id: 'a6', name: 'Garagem G1',              type: 'garage',   tickets: 3 },
    { id: 'a7', name: 'Portaria',                type: 'lobby',    tickets: 1 },
  ],
};

const RESIDENTS_BY_UNIT = {
  u1: ['Mariana Costa', 'Pedro Costa', 'Luísa Costa'],
  u2: ['Fernanda Lima', 'Ricardo Lima'],
  u3: ['João Almeida', 'Carla Almeida', 'Lucas Almeida', 'Sofia Almeida'],
  u5: ['Bruno Tavares', 'Ana Tavares'],
  u7: ['Helena Braga', 'Diego Braga'],
};

const TICKETS = [
  {
    id: 't1', condoId: 'c1', protocol: 'TKT-2026-041',
    title: 'Elevador parado no 8º andar — Bloco A',
    description: 'Morador reporta que o elevador social do Bloco A está travado no 8º andar há cerca de 40 minutos. Luz do painel acende mas a porta não abre.',
    status: 'in_progress', priority: 'urgent', location: 'common_area', locationRef: 'Elevador Social Bloco A',
    commonAreaId: 'a1', block: 'Bloco A',
    resident: { name: 'Mariana Costa', unit: 'Apt 101', phone: '+55 11 9****-4821' },
    assignedTo: { name: 'Rodrigo Santos', initials: 'RS', role: 'Zelador' },
    createdAt: '2026-04-18T08:12:00', updatedAt: '2026-04-18T09:05:00',
    category: 'Elétrico',
  },
  {
    id: 't2', condoId: 'c1', protocol: 'TKT-2026-040',
    title: 'Vazamento no teto da garagem G1',
    description: 'Mancha escura e gotejamento no teto próximo à vaga 47. Suspeita de infiltração da laje superior.',
    status: 'open', priority: 'high', location: 'common_area', locationRef: 'Garagem G1',
    commonAreaId: 'a6', block: null,
    resident: { name: 'Carlos Pereira', unit: 'Apt 902', phone: '+55 11 9****-1203' },
    assignedTo: null,
    createdAt: '2026-04-18T07:40:00', updatedAt: '2026-04-18T07:40:00',
    category: 'Hidráulico',
  },
  {
    id: 't3', condoId: 'c1', protocol: 'TKT-2026-039',
    title: 'Torneira do jardim não fecha',
    description: 'A torneira próxima ao playground está gotejando constantemente desde ontem.',
    status: 'open', priority: 'medium', location: 'common_area', locationRef: 'Playground',
    commonAreaId: null, block: null,
    resident: { name: 'Fernanda Lima', unit: 'Apt 102', phone: '+55 11 9****-3340' },
    assignedTo: null,
    createdAt: '2026-04-17T18:22:00', updatedAt: '2026-04-17T18:22:00',
    category: 'Hidráulico',
  },
  {
    id: 't4', condoId: 'c1', protocol: 'TKT-2026-038',
    title: 'Interfone do Bloco B sem resposta na portaria',
    description: 'Morador tentou chamar a portaria três vezes pelo interfone e não houve retorno. Aparelho parece estar sem linha.',
    status: 'in_progress', priority: 'high', location: 'unit', locationRef: '', commonAreaId: null,
    block: 'Bloco B',
    resident: { name: 'Bruno Tavares', unit: 'Apt 101', phone: '+55 11 9****-8821' },
    assignedTo: { name: 'Equipe Predial', initials: 'EP', role: 'Manutenção' },
    createdAt: '2026-04-17T14:10:00', updatedAt: '2026-04-18T08:00:00',
    category: 'Elétrico',
  },
  {
    id: 't5', condoId: 'c1', protocol: 'TKT-2026-037',
    title: 'Luz da escada apagada no 5º andar',
    description: 'Lâmpada da escada queimada, andar inteiro sem iluminação à noite.',
    status: 'resolved', priority: 'low', location: 'common_area', locationRef: 'Escada Bloco C',
    commonAreaId: null, block: 'Bloco C',
    resident: { name: 'Helena Braga', unit: 'Apt 401', phone: '+55 11 9****-6612' },
    assignedTo: { name: 'Rodrigo Santos', initials: 'RS', role: 'Zelador' },
    createdAt: '2026-04-16T09:20:00', updatedAt: '2026-04-16T17:40:00',
    category: 'Elétrico',
  },
  {
    id: 't6', condoId: 'c1', protocol: 'TKT-2026-036',
    title: 'Porta do salão de festas não tranca',
    description: 'Fechadura está folgada, porta abre com um empurrão mesmo estando trancada.',
    status: 'open', priority: 'medium', location: 'common_area', locationRef: 'Salão de festas',
    commonAreaId: 'a5', block: null,
    resident: { name: 'João Almeida', unit: 'Apt 201', phone: '+55 11 9****-2211' },
    assignedTo: null,
    createdAt: '2026-04-16T11:05:00', updatedAt: '2026-04-16T11:05:00',
    category: 'Serralheria',
  },
  {
    id: 't7', condoId: 'c1', protocol: 'TKT-2026-035',
    title: 'Barulho da bomba da piscina à noite',
    description: 'Bomba da piscina está fazendo ruído alto depois das 22h, atrapalhando o sono dos moradores próximos.',
    status: 'in_progress', priority: 'medium', location: 'common_area', locationRef: 'Piscina',
    commonAreaId: 'a3', block: null,
    resident: { name: 'Ricardo Lima', unit: 'Apt 102', phone: '+55 11 9****-7743' },
    assignedTo: { name: 'Equipe Predial', initials: 'EP', role: 'Manutenção' },
    createdAt: '2026-04-15T22:40:00', updatedAt: '2026-04-16T08:30:00',
    category: 'Ruído',
  },
  {
    id: 't8', condoId: 'c1', protocol: 'TKT-2026-034',
    title: 'Portão da garagem com abertura lenta',
    description: 'Portão está demorando cerca de 25 segundos para abrir. Já apresentou falha intermitente na semana passada.',
    status: 'resolved', priority: 'medium', location: 'common_area', locationRef: 'Garagem G1',
    commonAreaId: 'a6', block: null,
    resident: { name: 'Pedro Costa', unit: 'Apt 101', phone: '+55 11 9****-4821' },
    assignedTo: { name: 'Rodrigo Santos', initials: 'RS', role: 'Zelador' },
    createdAt: '2026-04-15T07:15:00', updatedAt: '2026-04-15T19:50:00',
    category: 'Mecânico',
  },
  {
    id: 't9', condoId: 'c1', protocol: 'TKT-2026-033',
    title: 'Infiltração na parede da sala — Apt 301',
    description: 'Mancha de umidade aumentando na parede lateral da sala. Foto anexada pelo morador.',
    status: 'in_progress', priority: 'high', location: 'unit', locationRef: '', commonAreaId: null, block: 'Bloco B',
    resident: { name: 'Ana Tavares', unit: 'Apt 301', phone: '+55 11 9****-1155' },
    assignedTo: { name: 'Equipe Predial', initials: 'EP', role: 'Manutenção' },
    createdAt: '2026-04-14T10:00:00', updatedAt: '2026-04-17T16:22:00',
    category: 'Hidráulico',
  },
  {
    id: 't10', condoId: 'c1', protocol: 'TKT-2026-032',
    title: 'Câmera da entrada offline',
    description: 'Câmera 03 da portaria não está exibindo imagem no monitor da guarita.',
    status: 'open', priority: 'urgent', location: 'common_area', locationRef: 'Portaria',
    commonAreaId: 'a7', block: null,
    resident: { name: 'Portaria (sistema)', unit: '—', phone: '—' },
    assignedTo: null,
    createdAt: '2026-04-18T06:05:00', updatedAt: '2026-04-18T06:05:00',
    category: 'Segurança',
  },
  {
    id: 't11', condoId: 'c1', protocol: 'TKT-2026-031',
    title: 'Lixeira do bloco C transbordando',
    description: 'Solicito reforço na coleta, lixeira do térreo está cheia desde ontem.',
    status: 'closed', priority: 'low', location: 'common_area', locationRef: 'Bloco C',
    commonAreaId: null, block: 'Bloco C',
    resident: { name: 'Sofia Almeida', unit: 'Apt 201', phone: '+55 11 9****-9921' },
    assignedTo: { name: 'Equipe Predial', initials: 'EP', role: 'Manutenção' },
    createdAt: '2026-04-12T08:00:00', updatedAt: '2026-04-13T10:15:00',
    category: 'Limpeza',
  },
  {
    id: 't12', condoId: 'c1', protocol: 'TKT-2026-030',
    title: 'Rachadura pequena na parede do corredor',
    description: 'Rachadura fina de aprox 40cm na parede do corredor do 2º andar, próxima ao apto 204.',
    status: 'open', priority: 'low', location: 'common_area', locationRef: 'Corredor Bloco A',
    commonAreaId: null, block: 'Bloco A',
    resident: { name: 'Luísa Costa', unit: 'Apt 101', phone: '+55 11 9****-4821' },
    assignedTo: null,
    createdAt: '2026-04-11T14:30:00', updatedAt: '2026-04-11T14:30:00',
    category: 'Civil',
  },
];

const EVENTS_BY_TICKET = {
  t1: [
    { type: 'created', actor: 'Mariana Costa', actorType: 'resident', at: '2026-04-18T08:12:00',
      note: 'Chamado aberto via bot Telegram. Triagem IA: categoria Elétrico, prioridade Urgente.' },
    { type: 'status_changed', actor: 'Sistema', actorType: 'system', at: '2026-04-18T08:13:00',
      from: null, to: 'open' },
    { type: 'assigned', actor: 'Camila Duarte', actorType: 'manager', at: '2026-04-18T08:22:00',
      note: 'Atribuído a Rodrigo Santos (Zelador).' },
    { type: 'status_changed', actor: 'Rodrigo Santos', actorType: 'manager', at: '2026-04-18T08:41:00',
      from: 'open', to: 'in_progress' },
    { type: 'comment', actor: 'Rodrigo Santos', actorType: 'manager', at: '2026-04-18T08:55:00',
      note: 'Acionei a manutenção terceirizada da Elevsul. Técnico chega às 9h30. Elevador isolado por segurança.' },
    { type: 'comment', actor: 'Mariana Costa', actorType: 'resident', at: '2026-04-18T09:05:00',
      note: 'Obrigada pelo retorno rápido. Avisei os vizinhos do Bloco A.' },
  ],
};

const MANAGERS = [
  { id: 'm1', name: 'Camila Duarte',  initials: 'CD', role: 'manager' },
  { id: 'm2', name: 'Rodrigo Santos', initials: 'RS', role: 'staff' },
  { id: 'm3', name: 'Equipe Predial', initials: 'EP', role: 'staff' },
  { id: 'm4', name: 'Paula Menezes',  initials: 'PM', role: 'manager' },
];

const STATUS_LABELS = {
  open: 'Aberto', in_progress: 'Em andamento', resolved: 'Resolvido', closed: 'Fechado',
};
const PRIORITY_LABELS = {
  low: 'Baixa', medium: 'Média', high: 'Alta', urgent: 'Urgente',
};
const AREA_TYPE_LABELS = {
  elevator: 'Elevador', pool: 'Piscina', lobby: 'Salão/Hall',
  garage: 'Garagem', gym: 'Academia', other: 'Outro',
};
const AREA_TYPE_ICONS = {
  elevator: '⬍', pool: '≋', lobby: '◩', garage: '▭', gym: '⎈', other: '○',
};

window.ZIVY_DATA = {
  CONDOS, BLOCKS, UNITS, AREAS, RESIDENTS_BY_UNIT,
  TICKETS, EVENTS_BY_TICKET, MANAGERS,
  STATUS_LABELS, PRIORITY_LABELS, AREA_TYPE_LABELS, AREA_TYPE_ICONS,
};
