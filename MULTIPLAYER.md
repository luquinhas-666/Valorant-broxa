# Jogar RUPTURE com amigos

A Alpha 05 inclui salas privadas por código, equipes, oito agentes e partidas entre pessoas. O servidor controla movimento, colisões, tiros, munição, compras, poderes, vida, economia, rounds e spike. O dono da sala inicia a partida, mas a simulação roda no servidor: fechar o jogo de quem criou a sala não desliga o servidor hospedado.

## Testar no seu computador

1. Instale **Node.js 22 ou superior** pelo [site oficial](https://nodejs.org/).
2. Extraia o ZIP. Na pasta `rupture`, abra **JOGAR-ONLINE.cmd** no Windows. Não há pacotes para instalar: a biblioteca WebSocket já acompanha o projeto, com sua licença.
3. Abra `http://localhost:8787`. Clique em **Jogar com amigos**.
4. Informe um apelido e mantenha `http://localhost:8787` como servidor. Crie a sala.
5. Para testar sozinho a conexão, abra outra aba, use outro apelido e entre pelo código. É necessário ao menos um jogador humano em cada equipe.
6. Escolha equipe e agente na sala. O dono clica em **Iniciar partida**.

No terminal, a alternativa é `npm run multiplayer`. O servidor usa a porta 8787 por padrão e respeita a variável `PORT` da hospedagem.

**Localhost funciona apenas no próprio computador.** Para os amigos entrarem pela internet, use a hospedagem abaixo. Se todos estiverem na mesma rede Wi-Fi, podem usar `http://IP-LOCAL-DO-COMPUTADOR:8787` no navegador e no campo do servidor; isso depende das permissões de rede/firewall do computador. Não é necessário abrir portas do roteador para usar o Render.

## Hospedar o servidor gratuitamente no Render

O código está preparado, mas **nenhum serviço foi publicado automaticamente**. Você precisa conectar sua própria conta do GitHub ao Render.

1. Crie um repositório no GitHub e envie **o conteúdo da pasta `rupture`** para a raiz dele: `index.html`, `game.js`, `server/`, `vendor/`, `package.json` e os demais arquivos. Preserve as duas pastas `vendor` (uma contém Three.js; a outra, dentro de `server`, contém WebSocket).
2. No [Render](https://dashboard.render.com/), escolha **New → Web Service** e conecte esse repositório.
3. Configure:

| Campo | Valor |
| --- | --- |
| Language / Runtime | Node |
| Root Directory | Deixe vazio se os arquivos estão na raiz do repositório |
| Build Command | `node --check server/server.mjs` |
| Start Command | `node --experimental-vm-modules server/server.mjs` |
| Instance Type | **Free** |
| Health Check Path | `/health` |

4. A versão do Node está declarada no arquivo `.node-version`. Aguarde a publicação e copie o endereço `https://NOME-DO-SERVICO.onrender.com`.
5. Abra esse endereço: o próprio servidor também entrega o jogo, então vocês já podem jogar por ele. O endereço `/health` deve mostrar `{"ok":true,...}`.
6. Envie **o link do jogo e o código da sala** aos amigos. Todos precisam usar o mesmo endereço de servidor.

O arquivo `render.yaml` também permite configurar o serviço pelo recurso **Blueprint** do Render. Use apenas uma instância: as salas ficam na memória desse servidor.

## Manter o jogo no GitHub Pages

O navegador pode carregar o jogo do GitHub Pages e conectar ao servidor separado do Render:

1. Publique os arquivos do jogo no Pages como antes.
2. Em **Jogar com amigos → Endereço do servidor**, cada jogador informa o endereço HTTPS do Render. O jogo guarda esse endereço no navegador.
3. Para deixar o endereço preenchido para todos, edite `online-config.js` antes de enviar os arquivos:

```js
export const SERVER_URL = 'https://seu-servico.onrender.com';
```

Use HTTPS no servidor quando o jogo estiver no Pages. A conexão WebSocket segura é montada automaticamente. **Publicar apenas no GitHub Pages não inicia o servidor multiplayer.**

## Como funcionam as partidas

- **Rápida:** até seis pessoas (3 × 3), primeiro a quatro vitórias. É possível jogar 1 × 1, 1 × 2 ou 2 × 2 sem bots.
- **Competitivo:** até dez pessoas (5 × 5), 13 vitórias e vantagem de dois rounds, intervalo e prorrogação.
- **Preencher vagas com bots:** opcional ao criar a sala. Os bots completam as duas equipes até o tamanho do modo. Desmarcado por padrão para jogar somente com amigos.
- Cada equipe pode escolher apenas um de cada agente. Equipes opostas podem usar o mesmo agente.
- A loja abre por 30 segundos. **Enter** ou o botão da loja confirma que você está pronto. As barreiras abrem quando todos os humanos conectados confirmarem ou o tempo terminar.
- **B** compra; **WASD** move; mouse mira; clique atira; **R** recarrega; **1/2/3** troca arma; **Q/E/C/X** usa poderes; **F segurado** planta/desarma; **G** solta spike.
- Comprar, usar poder, atirar e interagir são validados pelo servidor. Não há dano entre aliados.
- A spike pode ser solta, recolhida e plantada nos dois pontos. O desarme preserva metade do progresso. A defesa precisa desarmar mesmo depois de eliminar os atacantes.
- **Esc abre o menu, sem pausar a partida online.** Ao perder o foco, os controles são soltos. No modo solo, a pausa continua funcionando.
- Após o fim da partida, o dono usa **Jogar novamente** para voltar todos à sala e organizar outra partida.
- Uma queda breve de conexão tenta reconectar automaticamente por até aproximadamente um minuto, mantendo o jogador e seus créditos. Enquanto estiver fora, o personagem fica parado e pode ser eliminado. Recarregar ou fechar a aba perde a credencial temporária; entrar numa partida em andamento por um novo código não é permitido.

## Limites desta versão

Esta é uma alpha para partidas casuais entre amigos. Os movimentos recebidos são suavizados, mas ainda não há previsão completa de movimento nem compensação histórica de tiros. Distância do servidor e qualidade da internet afetam a sensação de resposta. Não há ranking persistente, contas, chat de voz nem sistema antitrapaça comercial.

O serviço limita a três salas e 24 conexões simultâneas. Esse limite protege o protótipo, mas não representa uma garantia de desempenho com todas as salas cheias. A validação local usa duas conexões reais e simulações com bots; o desempenho pela internet e no plano Free precisa ser medido após a publicação.

As salas ficam na memória. Reiniciar ou atualizar o servidor encerra as partidas. O Render Free pode dormir após 15 minutos sem tráfego, demorar cerca de um minuto para despertar e reiniciar instâncias. Existem limites de horas e tráfego: confira o painel da conta para manter o uso dentro da faixa gratuita. Não são necessários banco de dados nem cartão dentro do jogo.

## Verificação

Com Node.js 22+, execute:

```sh
npm test
npm run test:online
npm run test:map
```

A suíte solo verifica as 90 regras e mecânicas existentes. A suíte multiplayer verifica salas por código, permissões do dono, credenciais de reconexão, dois clientes WebSocket reais, movimentação, loja, disparos entre humanos, economia separada, bots opcionais, plantio, desarme com checkpoint e transição de round. A interface também foi conferida em duas abas, incluindo plantio real e atualização do objetivo na defesa.

## Referências

- [Render: hospedar Node](https://render.com/docs/deploy-node-express-app)
- [Render: WebSockets](https://render.com/docs/websocket)
- [Render: limites gratuitos](https://render.com/docs/free)
- [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [ws, licença MIT](https://github.com/websockets/ws)

O mapa foi reconstruído na versão 05. Atualize também `arena.js` e `map-layout.js` no jogo e no servidor. Consulte [MAPA.md](MAPA.md). **M** abre o mapa tático durante a partida.
