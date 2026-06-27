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
- **Sem Service Worker**: o suporte a Service Workers no iOS 12 é instável;
  a página é simples o suficiente para não precisar de cache offline.
- **Crossfade via opacidade CSS** (não canvas/WebGL): muito mais leve para o
  chip A7 do iPad Mini 2.
- **`object-fit: contain`**: mostra a foto inteira sem cortar, mesmo que a
  proporção não combine exatamente com a tela.
