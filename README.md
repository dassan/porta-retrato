# Porta-Retrato

Servidor local que transforma um iPad antigo (testado para iPad Mini 2 /
ME279BZ/A, travado no iOS 12.5.x) em um porta-retrato digital, exibindo fotos
em tela cheia via Safari.

## Como funciona

- Você coloca as fotos (qualquer formato/tamanho) na pasta `fotos-originais/`.
- O servidor as redimensiona automaticamente (máx. 1600px no lado maior,
  JPEG qualidade 80) e guarda em `cache/` na primeira vez que cada foto é
  acessada. Isso evita que o iPad precise decodificar fotos de 12MP+, o que
  o travaria.
- A página `public/` mostra um slideshow em tela cheia com fade suave entre
  fotos, em ordem aleatória.

## Instalação

```
npm install
npm start
```

O servidor sobe em `http://0.0.0.0:3000`. Descubra o IP do seu PC na rede
local (ex: `ipconfig` no Windows, procure por "Endereço IPv4") e acesse no
Safari do iPad: `http://<IP-DO-PC>:3000`.

Use `PORT=8080 npm start` para mudar a porta, se necessário.

## Rodando em hardware fraco (ex: Raspberry Pi 1 Model B)

O Raspberry Pi 1 (ARMv6, single-core 700MHz) é capaz de servir o slideshow,
mas é lento demais para redimensionar fotos com a biblioteca `sharp`. O fluxo
recomendado é processar as fotos no seu PC e copiar só o resultado para o Pi:

1. No PC, com as fotos em `fotos-originais/`, rode o servidor normalmente
   (`npm start`) e abra `http://localhost:3000` no navegador — basta navegar
   pelas fotos (ou chamar `GET /photos/<nome-do-arquivo>` para cada uma) para
   gerar o cache de todas elas em `cache/`.
2. Copie a pasta `cache/` inteira do PC para o mesmo lugar no projeto no Pi
   (ex: via `scp`, pendrive ou SMB). Não é necessário copiar
   `fotos-originais/` nem `node_modules/sharp`.
3. No Pi, instale as dependências e suba o servidor em modo
   "somente servir", que nunca carrega nem exige o `sharp`:
   ```
   npm install
   SERVE_ONLY=1 npm start
   ```
   `npm install` tenta instalar o `sharp` (ele é uma dependência opcional),
   mas se falhar no ARMv6 isso não impede o app de funcionar em `SERVE_ONLY`.
4. Para adicionar fotos depois, sempre gere o cache primeiro no PC (passo 1)
   e copie os arquivos novos de `cache/` para o Pi — em `SERVE_ONLY=1` o
   servidor só lê o que já está cacheado, nunca o `fotos-originais/`.

No Pi, talvez seja necessário instalar uma versão de Node.js via
[unofficial-builds.nodejs.org](https://unofficial-builds.nodejs.org/) já que
o Node oficial não compila mais para ARMv6 desde a v12.

## Configurando o slideshow

- Intervalo entre fotos: `http://<IP-DO-PC>:3000/?interval=20000` (ms).
  Padrão: 30 segundos.
- A lista de fotos é reconsultada automaticamente a cada 10 minutos, então
  você pode adicionar/remover arquivos em `fotos-originais/` sem reiniciar
  nada — o iPad pega as novidades sozinho.

## Preparando o iPad (iOS 12.5 / Safari antigo)

1. Abra o endereço do servidor no Safari.
2. Toque em "Compartilhar" → "Adicionar à Tela de Início". Isso cria um
   ícone que abre a página sem a barra de endereço do Safari (modo
   "quase-kiosk").
3. **Evite o bloqueio de tela automático**: vá em Ajustes → Tela e Brilho →
   Bloqueio Automático → Nunca. O iOS 12 não tem API de Wake Lock no
   navegador, então isso é a única forma confiável de manter a tela acesa.
4. Opcional, para um modo kiosk mais travado: Ajustes → Acessibilidade →
   Acesso Guiado, ative e configure um atalho de triplo clique no botão
   Home. Abra o app de tela de início criado no passo 2 e ative o Acesso
   Guiado antes de deixar o iPad fixo como porta-retrato — isso impede que
   alguém saia do app ou abra o Centro de Controle por engano.
5. Deixe o iPad sempre conectado ao carregador.

## Por que essas escolhas de design

- **Conversão para JPEG no servidor**: garante compatibilidade mesmo se você
  jogar fotos em HEIC/PNG/WebP na pasta — o Safari do iOS 12 não decodifica
  todos esses formatos de forma confiável, mas JPEG sempre funciona.
- **Suporte a HEIC via `heic-convert`**: os binários pré-compilados do
  `sharp` não decodificam HEIC/HEIF (limitação de licenciamento do codec
  HEVC), então o servidor tenta o `sharp` primeiro e só usa `heic-convert`
  como decodificador de fallback quando o arquivo é HEIC de verdade — isso é
  necessário porque é comum encontrar arquivos com extensão `.heic` que na
  verdade são JPEGs renomeados (ex: reexportados por apps de edição de
  fotos), e nesses casos o `sharp` já lida com eles diretamente.
- **Sem Service Worker**: o suporte a Service Workers no iOS 12 é instável;
  a página é simples o suficiente para não precisar de cache offline.
- **Crossfade via opacidade CSS** (não canvas/WebGL): muito mais leve para o
  chip A7 do iPad Mini 2.
- **`object-fit: contain`**: mostra a foto inteira sem cortar, mesmo que a
  proporção não combine exatamente com a tela.
