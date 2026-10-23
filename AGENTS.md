# AGENTS.md — studio-ai-mcp

## Projeto

MCP server para Roblox Studio — ferramentas de validação, pipeline de assets e orquestração de testes.

## Regras de desenvolvimento

- Antes de modificar qualquer ferramenta, inspecione o código atual em `src/index.js`.
- Prefira alterações pequenas e isoladas.
- Não declare uma tarefa concluída apenas porque o código foi criado.
- Teste o servidor após alterações: `echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node src/index.js`.
- Execute `node tools/test-mcp.js` para validar.
- Não publique alterações sem commit e push.

## Estrutura

- `src/index.js` — ponto de entrada do MCP server (10 ferramentas).
- `tools/test-mcp.js` — script de teste do servidor.
- `README.md` — documentação das ferramentas.
- `CHANGELOG.md` — histórico de versões.
- `CONTRIBUTING.md` — guia de contribuição.

## Convenções

- Ferramentas MCP devem ter `name`, `description` e `inputSchema`.
- Commits pequenos e focados (1 funcionalidade por commit).
- Usar conventional commits: `feat:`, `fix:`, `docs:`, `chore:`.
- Versão no `package.json` deve acompanhar mudanças significativas.

## Limitações conhecidas

- O MCP não se conecta diretamente ao MCP oficial do Roblox Studio.
- Funciona como gerador de scripts Luau e instruções.
- Importação de FBX requer ação manual no Studio.
- Play Test requer start_stop_play via MCP oficial.