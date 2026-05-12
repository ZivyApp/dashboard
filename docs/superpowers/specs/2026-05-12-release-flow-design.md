# Release flow — design

**Status:** Deferred — implement after Plan 4 (Inbox MVP) is merged to `develop` and ready for production.

**Date:** 2026-05-12
**Driver:** Disciplina / boa prática (não há driver funcional urgente em maio/2026).

---

## Contexto

Em maio/2026 o projeto tem:

- `main` parada no scaffold do Plan 2 (`78fe26e`); só design tokens, Button, providers.
- `develop` à frente com Plan 3.1 (auth) e Plan 3.2 (layout shell).
- `package.json` em `0.0.0` (nunca bumpado).
- 1 workflow CI (`.github/workflows/ci.yml`); nenhum workflow de release.
- Conventional commits enforced via commitlint — substrato pronto pra automação.
- Vercel deploya `main` no production alias automaticamente; previews por PR.

Não há usuários reais nem coordenação com mobile/integrações. Não há fricção atual em "promover develop → main", porque main ainda não foi promovida.

## Decisão de timing

**Não implementar release flow agora.** Plans 3.3 e 4 seguem o ritmo atual: features squash-mergeadas em develop, sem release intermediário.

**Gatilho pra revisitar:** quando Plan 4 (Inbox MVP) estiver mergeado em develop e pronto pra produção. Aí abre-se PR `develop → main` como release inaugural v0.1.0, e implementa-se o fluxo descrito nas próximas seções.

**Por que adiar:**

- Sem feature de produto end-to-end, qualquer release é cerimônia sem conteúdo.
- v0.1.0 marcando "primeira coisa que usuário usa" tem narrativa melhor que v0.1.0 marcando "tela de login + sidebar".
- Adicionar infra de release antes do gatilho só amplia blast radius das mudanças seguintes sem benefício.

## Sketch técnico (pra implementar quando o gatilho disparar)

### Ferramenta

[`release-please`](https://github.com/googleapis/release-please) (GitHub Action mantida pelo Google) rodando em pushes para `main`.

Vantagens sobre alternativas:

- Lê os conventional commits que já são enforced no projeto — zero retrabalho de tagging.
- Mantém um "Release PR" auto-atualizado na branch de release; merge desse PR é o gesto único de "release".
- Auto-determina semver bump (`feat` → minor, `fix` → patch, `BREAKING CHANGE` → major).
- Mantém `CHANGELOG.md` versionado no repo.
- Permite override manual de versão quando precisar (release-as label).

Descartadas:

- **semantic-release**: roda no merge sem PR intermediário; menos visibilidade do que vai entrar no release.
- **Manual (`gh release create`)**: alta fricção por release; tende a ser pulado em "disciplina/boa prática".

### Fluxo

1. **Feature → develop**: PR com squash-merge. Mantém prática atual. Squash commit usa o título do PR (conventional commit), exigência do commitlint.
2. **Release inaugural (e seguintes)**: PR `develop → main` usando **merge commit** (não squash). Preserva o histórico per-feature pra release-please ler cada conventional commit individualmente.
3. **release-please action** dispara no push pra main → abre/atualiza um "Release PR" automático em main com:
   - `CHANGELOG.md` gerado a partir dos commits.
   - Bump em `package.json` version (ex.: `0.0.0` → `0.1.0`).
4. **Merge do Release PR** → cria tag `v0.1.0` + GitHub Release com release notes.
5. **Vercel deploya automaticamente** o push em main no production alias.

### Configuração

Arquivo a criar quando a hora chegar:

- `.github/workflows/release-please.yml` — workflow que invoca `googleapis/release-please-action` no push de main.
- `.release-please-manifest.json` (gerado) — rastreia versão atual.
- `release-please-config.json` (opcional) — customizações: changelog sections, package type (`node`), release branches.

Variáveis/secrets:

- `GITHUB_TOKEN` (já provido pelo runner; só precisa de `contents: write` e `pull-requests: write` no workflow).

### Versionamento

- **Início:** `v0.1.0` (Plan 4 = primeira feature de produto shippable).
- **Esquema:** Semver via conventional commits.
  - `feat:` → minor (`0.1.0` → `0.2.0`)
  - `fix:` → patch (`0.1.0` → `0.1.1`)
  - `BREAKING CHANGE:` no footer ou `!` no tipo → major (`0.1.0` → `1.0.0`)
- **Promoção pra `1.0.0`:** decisão manual quando sair do beta. Release-please permite override via label `release-as: 1.0.0` no Release PR.

### Cadência

On-demand. Tipicamente:

- Final de Plan completo (v0.1 = Plan 4 / Inbox, v0.2 = Plan 5 / Ticket Detail, etc.)
- Hotfix urgente (patch fora de ciclo).

Sem release ritualístico fixo (semanal/quinzenal) porque o projeto é solo no momento — sem coordenação multi-pessoa que justifique cadência.

### Hotfix

Padrão atual do CLAUDE.md continua válido:

1. Hotfix sai de `main`: `git checkout main && git checkout -b hotfix/<nome>`.
2. PR `hotfix/* → main` (squash-merge OK — vira um único `fix:` commit).
3. Push em main → release-please bumpa patch automático no Release PR.
4. Port para develop: `git checkout develop && git merge main` ou cherry-pick.

### Trade-offs aceitos

**Double-deploy por release.** Com "merge to main = deploy" do Vercel, cada release dispara dois deploys:

- Um no merge `develop → main` (deploya o código novo).
- Outro no merge do Release PR (só atualiza `CHANGELOG.md` + `version` em `package.json`, runtime idêntico).

O segundo deploy é um no-op funcional. Aceitável em troca da simplicidade do gating (sem precisar parametrizar Vercel pra deploy só em tag).

**Permanece a janela onde main está "à frente" do último release.** Entre o merge develop→main e o merge do Release PR, main contém código não-tagged. Produção já estará com esse código (deploy já rodou). Não é um problema se aceitarmos que "produção = main HEAD", não "produção = última tag".

## Pontos abertos (revisitar quando implementar)

- **Pular `0.x` direto pra `1.0.0`?** Depende de quando sairmos do beta. Release-please permite override.
- **GitHub Releases públicos?** Repo é público; releases também serão. OK por enquanto, mas pode mudar se a estratégia de marketing mudar.
- **Vercel deploy só em tag?** Elimina double-deploy mas exige setup extra (Vercel project ignoring main pushes, deploy hook em tag). Considerar se o ruído de double-deploy incomodar.
- **Pre-release tags (`v0.1.0-rc.1`)?** Suportado por release-please mas overkill agora. Adicionar se precisar de "staging" entre develop e prod.

## Out of scope (intencionalmente)

- Mobile sync (vem com Plan de mobile).
- Multi-package monorepo (`changesets`).
- Release notes editoradas à mão (release-please usa commit messages — convenção mais rica de commits = changelog mais rico).
- Aprovação manual de release (gate humano) — release-please já é um Review PR, basta não mergear.

---

## Checklist para quando implementar

- [ ] Criar `.github/workflows/release-please.yml`.
- [ ] Configurar `release-please-config.json` com `package-type: node`.
- [ ] Garantir que o workflow tem `permissions: contents: write, pull-requests: write`.
- [ ] Setar `release-as: 0.1.0` na primeira execução pra fixar baseline.
- [ ] Documentar no CLAUDE.md: "develop → main deve ser merge commit (não squash)".
- [ ] Atualizar seção "Branching e fluxo de PRs" no CLAUDE.md com a etapa de release.
- [ ] Smoke test: criar release fake numa branch privada antes de rodar em main.
- [ ] Comunicar ao time (se houver) sobre o novo fluxo.
