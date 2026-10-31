# RUPTURE — Alpha 05

FPS tático 3D para navegador, com identidade própria e mecânicas inspiradas no gênero de tiro tático com agentes. Feito com JavaScript, WebGL 2 e Three.js. **Alpha com modo solo e multiplayer em salas privadas: até 3 × 3 na partida rápida ou 5 × 5 no competitivo.**

## Novo mapa — versão 05

**Santa Luz · Distrito** foi reconstruído em uma arena de 96 × 96 unidades (antes 64 × 68), com três frentes e rotas conectadas:

- **A:** jardim longo, galerias e túnel das flores.
- **Meio:** praça disputável, quiosque, torre e saídas para os curtos dos dois bombs.
- **B:** armazém coberto, canal longo e pátio.
- **Defesa:** rotação norte, acesso pelo fundo de cada ponto e ligações para a retomada.
- Novas coberturas, curvas, sinais, pisos e arquitetura delimitam os caminhos e interrompem linhas de tiro entre as bases.
- **M abre o mapa tático**, com nomes das regiões e os planos de entrada. O minimapa usa a nova escala.
- As barreiras de compra, os spawns, os bots e a simulação multiplayer usam o mesmo desenho do mapa.

Veja [MAPA.md](MAPA.md) para conhecer as rotas e as medidas de percurso. A versão passou pelas 90 verificações solo, 30 multiplayer e 12 específicas do mapa. O balanceamento fino continua a partir de partidas reais.

## Multiplayer com amigos — versão 04

- Salas privadas com código, apelido, escolha de equipe e de agente.
- Servidor que controla os movimentos, tiros, vida, habilidades, loja, economia, rounds e spike.
- Bots opcionais para completar equipes; é possível jogar apenas 1 × 1 ou 2 × 2.
- Compra com barreiras e confirmação de prontidão de todos os jogadores.
- Reconexão automática em quedas breves, suavização dos movimentos e indicador de latência.
- Servidor preparado para o Render Free; o jogo pode continuar no GitHub Pages.

**Comece pelo [guia de multiplayer](MULTIPLAYER.md)**: ele explica como testar com `JOGAR-ONLINE.cmd`, hospedar o servidor e convidar os amigos. O servidor online exige **Node.js 22+**. O modo solo continua disponível em `JOGAR.cmd`.

O código está pronto para configurar a hospedagem; nenhum servidor remoto foi publicado por este pacote. O GitHub Pages sozinho executa apenas o modo solo.

## Novidades da versão 03

- **Oito agentes selecionáveis:** Vex, Sol, Echo, Aegis, Nyx, Kite, Meda e Rook. Modelos com visuais próprios, penteados/capuzes, rostos, viseiras, mochilas e equipamento; prévia 3D na seleção.
- **Competitivo 5 × 5:** 13 vitórias com dois rounds de vantagem; troca de lados após 12 rounds. Em 12 × 12, a prorrogação alterna os lados a cada round e concede 5.000 créditos. O modo rápido mantém 3 × 3 até 4 vitórias.
- **Zonas de compra com barreiras físicas:** cada equipe fica na sua metade da arena durante os 30 segundos de preparação. As barreiras bloqueiam passagem e tiros e desaparecem ao começar o round. Você pode comprar em toda a zona da sua equipe. Enter antecipa o início desta partida solo.
- **Spike como objetivo central:** transportar, soltar com G, entregar a aliados, recuperar do chão, plantar em A/B, proteger e desarmar. O painel do objetivo e o minimapa mostram o estado do dispositivo.
- No competitivo: plantio de 4 s, detonação em 45 s e desarme de 7 s. A metade de 3,5 s do desarme fica garantida ao interromper. No modo rápido: 3 s / 35 s / 5 s, com metade de 2,5 s. A defesa precisa desarmar mesmo que todos os atacantes já tenham sido eliminados.
- **Quatro planos de entrada para cada bomb:** rota direta pelas casas, flanco externo, rotação pelo arquivo e os novos túneis cobertos do jardim/oficinas. Z alterna o plano A/B dos aliados; as rotas aparecem no minimapa durante a preparação.
- Bots compram equipamento com sua economia, usam reação, rajadas, carregadores e recarga, procuram o último contato visto/ouvido, plantam e retomam os pontos. Conforme o perfil, usam fumaça, clarão, fogo ou proteção básica. Não executam o kit inteiro nem as ultimates dos agentes.
- Personagens usam a mesma estrutura de hitboxes de cabeça/corpo, independentemente do visual. A geometria visual é agrupada por material para reduzir o custo de renderizar dez jogadores.
- Saltos podem aterrissar em coberturas; os tetos dos túneis limitam o salto tático.

## Base visual da versão 02

- Modelos de armas refeitos com bordas chanfradas, partes metálicas, carregadores, trilhos, miras e mãos arredondadas. Silhuetas específicas para revólver, escopetas, rifles com luneta e metralhadoras.
- Nova iluminação com céu em gradiente, reflexos ambientais, luz de preenchimento e sombras de contato. Personagens com placas de proteção, viseiras e acessórios mais detalhados.
- Arena ampliada de 56 × 60 para 64 × 68 unidades de área interna. Casas laterais atravessáveis, arquivo central com cobertura, jardim, oficinas, fonte, balcões, varandas decorativas e novas conexões entre rotas.
- A fonte, os balcões e as coberturas bloqueiam movimento e disparos. Janelas e varandas são elementos visuais; os interiores térreos e os novos becos são jogáveis.
- Objetos estáticos agrupados por material para reduzir chamadas de desenho, mantendo o teste de colisão e de tiros separado da renderização.
- **17 armas de fogo, além da faca**, com filtros por categoria, tipo de disparo, dano, capacidade, recarga e indicação de luneta/silenciador. Pistolas compradas ocupam o slot secundário e podem ser mantidas junto de uma primária.

| Categoria | Armas |
| --- | --- |
| Secundárias | Pulse, Sawed, Fury, Whisper, Outlaw |
| Submetralhadoras | Viper, Spectre |
| Rifles | Jackal, Sentinel, Marshal, Eclipse |
| Escopetas | Nova, Tempest |
| Precisão | Longshot (3×), Horizon (5×) |
| Metralhadoras | Atlas (50 balas), Titan (100 balas) |

## Jogar no computador

No Windows, extraia o ZIP e abra **JOGAR.cmd**. É necessário Python 3 ou Node.js 18+ instalado. O arquivo abre o navegador em `http://127.0.0.1:8765` e mantém o servidor local aberto. Feche a janela do servidor para encerrar.

Também é possível iniciar na pasta do jogo com:

```sh
python -m http.server 8765 --bind 127.0.0.1
```

Ou, com Node.js 18 ou superior:

```sh
npm start
```

Depois abra `http://127.0.0.1:8765`. Não abra o HTML com duplo clique: os módulos JavaScript precisam ser servidos por HTTP ou HTTPS.

Use teclado e mouse em um navegador com WebGL 2 e aceleração gráfica. Se o navegador não permitir capturar o cursor, o jogo ativa o modo de mouse livre: segure o botão direito e mova o mouse para olhar. Para a experiência FPS normal, use uma janela própria do navegador.

## Hospedar no GitHub Pages

Nenhum processo de build, conta extra, banco de dados ou chave de API é necessário. Toda a biblioteca 3D está em `vendor/`; o jogo não carrega fontes, modelos ou scripts de CDNs.

1. Crie um repositório no GitHub, por exemplo `rupture`.
2. Coloque **o conteúdo desta pasta** na raiz do repositório. O `index.html` precisa ficar na raiz, ao lado de `game.js`, `world.js`, `style.css` e da pasta `vendor`.
3. Envie os arquivos para a branch `main`.
4. Em **Settings → Pages → Build and deployment**, escolha **Deploy from a branch**.
5. Selecione **main** e **/(root)** e salve.
6. Aguarde o GitHub concluir a publicação. O endereço terá o formato `https://SEU-USUARIO.github.io/rupture/`.

Os caminhos são relativos, portanto o jogo funciona tanto na raiz de um domínio quanto dentro de uma pasta de repositório. `.nojekyll` evita processamento desnecessário. Se enviar os arquivos pela interface do GitHub, confira também a presença de `vendor/three.module.js`.

Referência: [documentação oficial do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## O que está implementado

- FPS 3D com mira, movimento, pulo, caminhada silenciosa e agachamento.
- Recuo, dispersão ao andar/pular, mira secundária, escopeta com múltiplos projéteis e rifle com luneta.
- Dano por região, tiro na cabeça, munição, recarga e troca de arma.
- Loja com 17 armas de fogo em seis categorias, faca inicial e dois tipos de escudo.
- Economia: 800 créditos iniciais; +200 por eliminação; +300 por plantio/desarme do jogador; +3.000 por vitória; +1.900/2.400/2.900 por derrotas consecutivas. Limite de 9.000 créditos.
- Compra de 30 segundos. Competitivo: rounds de 100 segundos, 13 vitórias com vantagem de dois e intervalo após 12 rounds. Partida rápida: rounds de 85 segundos, até 4 vitórias e troca de lados após 3 rounds.
- Spike: 4 / 45 / 7 segundos no competitivo e 3 / 35 / 5 no modo rápido (plantio / detonação / desarme). Soltar F ou sofrer dano perde a parte ainda não garantida da interação; a metade do desarme é preservada.
- Armas e escudos restantes são preservados ao sobreviver. A morte devolve a pistola inicial e remove a primária/escudo. A munição é reposta a cada round; o intervalo reinicia a economia em 800 créditos e os equipamentos.
- Bots com busca de caminhos, contatos visuais e sonoros, utilitários básicos, rajadas, recarga, plantio, recuperação da spike e desarme.
- Minimapa com aliados, inimigos avistados e objetivos; placar; registro de eliminações; acompanhamento de aliados após morrer.
- Efeitos sonoros gerados no navegador; ajustes de volume, sensibilidade e qualidade salvos localmente.
- No solo, a partida pausa ao sair da aba ou abrir o menu. No online, ela continua para todos.

## Agentes

| Agente | Q | E | C | X — ultimate |
| --- | --- | --- | --- | --- |
| VEX · Duelista | Passo Vetor: avanço rápido, 2 cargas | Névoa: bloqueio visual por 10 s, 2 cargas | Impulso: cura 45 de vida e acelera por 5 s | Sobrecarga: acelera movimento e disparos por 12 s |
| SOL · Iniciador | Clarão: cega bots com linha de visão por 4 s, 2 cargas | Fogo Vivo: dano em área por 7 s, 2 cargas | Renascer: cura 45 de vida e acelera por 5 s | Solar: explosão no ponto de mira, 150 de dano em área visível |
| ECHO · Controladora | Pulso: revela inimigos por 7 s, 2 cargas | Nebulosa: bloqueio visual por 10 s, 2 cargas | Barreira: parede física por 12 s | Restauração: cura aliados vivos e concede pelo menos 25 de escudo |

| AEGIS · Sentinela | Escudo: restaura 50 de proteção | Muralha: parede por 12 s | Campo Lento: área por 8 s, 2 cargas | Fortaleza: escudo 50 e resistência de 35% ao dano por 8 s para a equipe |
| NYX · Controladora | Travessia: deslocamento até 7 m, 2 cargas | Véu: fumaça por 10 s, 2 cargas | Isca: distrai bots próximos por 6 s | Eclipse: cega por 4 s e revela por 5 s os inimigos em 20 m |
| KITE · Iniciadora | Sonar: revela por 7 s, 2 cargas | Luz Prisma: clarão, 2 cargas | Estática: campo lento por 8 s | Pulso EMP: remove escudos e impede disparos por 4 s em até 18 m |
| MEDA · Suporte | Cura: até 65 de vida | Cristal: parede por 12 s | Estímulo: acelera a equipe por 8 s | Segunda Chance: revive um aliado eliminado em até 10 m |
| ROOK · Duelista | Fragmento: explosão de até 90 de dano, 2 cargas | Salto Tático: salto reforçado | Avanço: deslocamento rápido | Ruptura: explosão direcionada de até 170 de dano |

Habilidades comuns são repostas a cada round. A ultimate exige 6 pontos; você começa com 0 no competitivo e 3 no modo rápido, ganha 1 por eliminação, 1 por plantio/desarme próprio e 1 ao finalizar cada round.

## Controles

| Ação | Tecla |
| --- | --- |
| Mover | WASD |
| Olhar | Mouse |
| Atirar | Botão esquerdo |
| Mirar / luneta | Segurar botão direito |
| Pular | Espaço |
| Andar silenciosamente | Shift |
| Agachar | Ctrl |
| Recarregar | R |
| Primária / pistola / faca | 1 / 2 / 3 |
| Habilidades / ultimate | Q / E / C / X |
| Comprar na base | B |
| Pronto (no online, todos confirmam ou aguardam o tempo) | Enter |
| Plantar / desarmar | Segurar F sem se mover |
| Soltar / entregar a spike | G |
| Alternar plano de ataque A/B | Z |
| Placar | Segurar Tab |
| Mapa tático | M |
| Abrir menu (pausa apenas no solo) | Esc |

## Estrutura

- `index.html`, `style.css`: telas, loja e interface da partida.
- `game.js`: entrada, combate, poderes, spike, economia e comportamento dos bots.
- `rules.js`: modos de partida, troca de lados, condição de vitória e planos de entrada.
- `world.js`: personagens, colisão, linha de visão e navegação.
- `map-layout.js`: dimensões, áreas, spawns, pontos e planos de entrada compartilhados.
- `arena.js`: arquitetura, coberturas, pisos e detalhes do novo Distrito.
- `data.js`: dados de armas e agentes; ilustrações vetoriais da interface.
- `arsenal.js`: modelos detalhados das armas e mãos em primeira pessoa.
- `art.js`: iluminação, reflexos ambientais, detalhes arquitetônicos e agrupamento dos objetos do mapa.
- `vendor/three.module.js`: Three.js r170, incluído localmente sob licença MIT.
- `serve.mjs`, `package.json`, `JOGAR.cmd`: formas opcionais de iniciar localmente.

## Escopo desta versão

Este é um protótipo jogável com arte 3D procedural, um mapa, partidas solo contra bots e salas privadas entre amigos. Não reproduz a qualidade gráfica, animações, mapas, balanceamento ou todos os sistemas de um FPS comercial. Personagens, armas, mapa e interface têm identidade própria; não inclui arquivos da Riot Games.

Publicar no GitHub Pages permite carregar o jogo pelo link. Para pessoas em computadores diferentes entrarem na mesma partida, publique também o servidor incluído em `server/` e informe seu endereço no jogo. Consulte `MULTIPLAYER.md`. As salas ficam na memória e encerram se o servidor reiniciar.

O jogo foi conferido no navegador e as regras centrais foram verificadas em simulação. A configuração e a publicação no GitHub dependem de um repositório de destino; não há publicação automática configurada neste pacote.

## Verificações

Com Node.js 22 ou superior instalado, execute `npm test`, `npm run test:online` e `npm run test:map`. Não é preciso instalar dependências. As 90 verificações solo cobrem compras, saldo, proteção, plantio pelo jogador e por bot, detonação, desarme, troca de lados, habilidades, limpeza de barreiras, dano, queda da spike, rotas, colisão, interiores atravessáveis, rotas de flanco, agrupamento do cenário, compra/carregador/reserva das 17 armas, preservação de secundárias, partidas completas nos dois modos, barreiras da compra, os oito agentes, ultimates, planos de ataque, transporte da spike, metade do desarme, regras da prorrogação e física de salto/tetos. A simulação usa a biblioteca 3D real e substitui a tela e o áudio por objetos de teste; ela não mede desempenho gráfico nem substitui testes de mira e movimentação no navegador.

Na prévia do navegador também foi concluída uma entrada real no ponto A com fumaça, avanço, plantio da spike e contagem de proteção do ponto. Foram conferidos a seleção 3D dos agentes, as zonas de compra com barreiras, a compra de armas/escudos, o consumo de munição ao disparar, a movimentação, a névoa, a barreira, a pausa e a troca de lados. A prévia integrada bloqueou a captura do cursor, por isso essa revisão usou o modo de mouse livre.

As 30 verificações multiplayer incluem duas conexões WebSocket reais, credenciais, regras de sala, reconexão, compra, combate entre humanos, economia, bots opcionais, plantio/desarme e transição de rounds. Duas abas do navegador também entraram na mesma partida e receberam o plantio real da spike.

## Créditos de terceiros

Three.js: Copyright © 2010–2024 three.js authors. Licença em [`vendor/THREE-LICENSE.txt`](vendor/THREE-LICENSE.txt). As demais imagens, geometrias e sons são criados pelo próprio código deste projeto.

WebSocket: ws 8.22.1, licença MIT em `server/vendor/ws/LICENSE`.

