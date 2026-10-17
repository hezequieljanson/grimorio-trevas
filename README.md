# Grimório das Trevas

Site para a mesa de Mundo das Trevas: criador de ficha guiado, ficha na mesa, rolador, NPC rápido, geradores, bestiário, regras com glossário e anotações. Feito em Angular 21, sem servidor: tudo fica salvo no navegador de cada pessoa e funciona offline depois da primeira visita.

## Rodar no computador

```bash
npm install
npm start
```

Abre em http://localhost:4200.

## Publicar na Vercel (gratuito)

1. Suba esta pasta para um repositório no GitHub.
2. Na Vercel, importe o repositório. Ela detecta Angular sozinha (build `ng build`, saída `dist/grimorio/browser`).
3. O `vercel.json` já manda todas as rotas para o `index.html`.

## Onde estão as regras

`public/data/*.json` — um arquivo por livro (`vtm`, `vdta`, `lob`, `lidt`, `cac`) mais `regras`, `glossario`, `bestiario` e `geradores`. O formato está em `src/app/core/models.ts`. Os textos são resumos com palavras próprias e trazem a página do livro para conferir no PDF.
