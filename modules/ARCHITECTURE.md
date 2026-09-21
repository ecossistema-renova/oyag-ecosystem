# OYAG Ecosystem — Arquitetura de Módulos v1.0

Regra operacional: cada área pública é tratada como um módulo independente de navegação, interface e manutenção, mas compartilha o OYAG UI System e os serviços centrais (Auth, banco, pagamentos, permissões e sessão).

## Ordem oficial dos módulos
1. Academy
2. App / OYAG Ecosystem
3. Conteúdos
4. IA
5. Food
6. Comunidade
7. Agenda
8. Finance
9. Marketplace
10. Parcerias

## Regra de navegação
- Navegação **entre módulos** usa sempre a URL pública/subdomínio definida em `modules/registry.js`.
- Navegação **dentro do mesmo módulo** pode usar rota relativa interna.
- Nenhuma tela deve inventar uma URL paralela para outro módulo.
- O redirecionamento DNS atual pode apontar temporariamente para páginas existentes até a migração física de cada módulo.
- Não mover arquivos legados de uma vez. A migração é feita módulo por módulo, validando interface, autenticação, rotas e dados antes de avançar.

## Interface
Todos os módulos usam o OYAG UI System como fonte visual. CSS local pode definir layout específico, mas não deve redefinir cores globais, tipografia-base ou contraste.

## Estado da migração
- Academy: em consolidação/finalização.
- App, Conteúdos, IA, Food, Comunidade, Agenda, Finance, Marketplace e Parcerias: seguem após validação da Academy.
