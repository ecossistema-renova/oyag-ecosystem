# Módulo Academy — OYAG Ecosystem

## URL pública oficial
https://academy.cledemilsonoliveira.com/

## Escopo
Este módulo concentra exclusivamente:
- catálogo de cursos;
- trilhas;
- aulas;
- exercícios;
- progresso;
- checkpoints;
- laboratórios;
- navegação educacional.

## Arquivos principais
- `index.html` — página pública da Academy.
- `curso.html` + `curso.js` — trilha do curso.
- `lesson.html` + `lesson.js` — aula interativa.
- `aula-demo.html` — demonstração pública.
- `home.css` — layout da home.
- `course.css` — layout da trilha.
- `styles.css` — componentes educacionais locais.
- `shell.css` + `shell.js` — cabeçalho/navegação do módulo.

## Dependências compartilhadas
- `../oyag-ui-system.css` — tokens globais de interface.
- `../theme.js` — tema claro/escuro.
- `../modules/registry.js` — URLs oficiais entre módulos.
- Supabase — cursos, módulos, aulas, progresso e autenticação.

## Regra de manutenção
1. Não alterar outro módulo para corrigir problema exclusivo da Academy.
2. Não redefinir a paleta global dentro deste módulo.
3. Navegação para outro módulo deve usar o registro central.
4. Rotas entre páginas da própria Academy podem ser relativas.
5. Mudanças de interface devem respeitar o OYAG UI System.
