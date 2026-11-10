---
description: "Revisa alterações ou arquivos em busca de bugs, riscos e lacunas de teste."
name: revisar-codigo
argument-hint: "diff, arquivos ou comportamento a revisar"
agent: agent
---

# Revisar código

Revise `${input:alvo:diff, arquivos ou comportamento a revisar}` neste projeto. Use as instruções do repositório e os padrões existentes como contexto.

Priorize bugs, regressões, riscos de segurança e lacunas de teste. Verifique o comportamento e as dependências locais relevantes; não faça alterações no código.

Apresente primeiro apenas os achados acionáveis, ordenados por severidade. Para cada achado, inclua:

- Severidade: crítica, alta, média ou baixa.
- Arquivo e linha afetados.
- O cenário concreto em que o problema ocorre e seu impacto.

Não reporte preferências de estilo ou hipóteses sem evidência como achados. Se não encontrar problemas, diga isso claramente e registre brevemente as lacunas de teste ou riscos residuais. Depois dos achados, inclua premissas ou perguntas em aberto e um resumo curto da revisão.

Se o alvo não identificar código ou mudanças revisáveis, peça o diff, os arquivos ou o comportamento esperado antes de emitir conclusões.