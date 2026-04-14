# Duelo de Nomes

Jogo de adivinhação baseado nos dados do Censo IBGE 2022. Dois nomes brasileiros aparecem lado a lado — escolha o que tem mais registros. Erre uma vez e o jogo acaba.

## Stack

- Vue 3 (Composition API + `<script setup>`)
- Pinia
- Vite

## Comandos

```bash
npm install      # instalar dependências
npm run dev      # servidor de desenvolvimento em http://localhost:5173
npm run build    # build de produção
npm run preview  # visualizar build de produção
```

## Dados

Os nomes e frequências vêm do arquivo `top_10000_nomes_brasil_censo2022.json`, gerado a partir da API pública do IBGE (`/api/v2/censos/nomes`).
