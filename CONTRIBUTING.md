# Contributing to studio-ai-mcp

## Como contribuir

1. Fork o repositório.
2. Crie uma branch: `git checkout -b feature/minha-feature`.
3. Faça suas alterações.
4. Teste: `node src/index.js` e envie uma requisição `tools/list`.
5. Commit: `git commit -m "feat: descrição"`.
6. Push: `git push origin feature/minha-feature`.
7. Abra um Pull Request.

## Convenções

- Código em JavaScript (Node.js).
- Ferramentas MCP devem ter `name`, `description` e `inputSchema`.
- Testar o servidor antes de commitar: `echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node src/index.js`.
- Commits pequenos e focados.

## Reportar bugs

Abra uma issue com:
- Descrição do problema
- Passos para reproduzir
- Output esperado vs. obtido