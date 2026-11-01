# Santa Luz · Distrito — Alpha 08

A arena foi ampliada de **96 × 96 para 120 × 120 unidades**, com **56,25% mais área**. A escala horizontal aumenta em 25%, preservando as conexões, os pontos de disputa e as áreas de retomada. Agentes, velocidade de movimento e altura das coberturas mantêm suas medidas. Duas novas caixas nos átrios de A e B dividem os acessos principais em etapas de avanço. O desenho é original, inspirado na estrutura de FPS tático com dois pontos de spike.

**Pressione M durante a partida** para abrir o mapa completo. Os controles de movimento e disparo ficam suspensos enquanto você consulta a planta; o round continua. O minimapa acompanha o novo tamanho e os nomes das regiões aparecem no HUD.

## Frentes de ataque

| Frente | Escolhas |
| --- | --- |
| **A · Jardim** | Galerias com trechos cobertos ou jardim longo aberto. O túnel das flores conecta as duas rotas antes da entrada principal. |
| **Meio · Praça** | Dois lados de um quiosque, coberturas deslocadas e saídas pelos cotovelos para os curtos de A e B. A torre bloqueia a visão direta entre a praça e a defesa. |
| **B · Armazém** | Interior coberto ou canal externo. Os caminhos voltam a se encontrar no pátio, antes da entrada principal de B. |

Cada ponto tem **entrada principal, curto conectado ao meio e acesso pelo fundo para a defesa**. Desde a Alpha 07 há duas ligações laterais na altura sul da praça: uma para galerias, outra para o armazém. Isso permite juntar a pressão do meio com a rota principal, recuar ou trocar de frente. Os cinco planos de bots por ponto combinam essas conexões; compartilham alguns trechos e não representam cinco portões independentes de entrada no bomb.

## Defesa e retomada

A base defensora conecta A e B pela rotação norte. Essa ligação é mais curta que atravessar o mapa pelo lado atacante. A defesa pode reforçar o outro ponto pelo fundo ou disputar as saídas da torre para retomar pelos curtos.

Um contêiner no centro da rotação norte interrompe a linha longa entre os fundos dos pontos. Há passagem em ambos os lados, para reposicionamento e retomadas. Novas caixas nas ligações laterais oferecem abrigo parcial sem bloquear a travessia.

As bases ficam atrás de barreiras físicas durante a compra: z = 35 no ataque e z = −35 na defesa. Há posições livres para os cinco integrantes de cada equipe. Os jogadores podem se preparar nas saídas de cada rota antes da liberação.

## Coberturas e linhas de tiro

- Os prédios delimitam corredores reais, com colisão e portas abertas.
- Coberturas deslocadas e curvas criam etapas de avanço e quebram a visão pelos corredores externos.
- A torre interrompe a linha direta entre as bases; não há linha de tiro do spawn para o plant padrão de nenhum ponto.
- Galerias, túnel A e armazém têm trechos com teto físico.
- Cada bomb possui uma caixa principal alta, uma cobertura baixa de apoio e um espaço de plantio marcado no chão. As coberturas permitem dividir o ponto e proteger o desarme sem fechá-lo completamente.
- A região válida de plantio continua sendo o círculo marcado no chão, com raio de 7,5 unidades.

## Verificações de percurso

Na grade de navegação, o menor percurso do spawn atacante ao plant padrão leva **aproximadamente 20,4 segundos para A e para B**, correndo a 5,3 unidades/s. Essa medida inclui a saída da base e ignora confronto, habilidades, saltos e paradas. Começar o round junto à barreira reduz o tempo; os cinco planos completos dos bots podem fazer trajetos mais longos.

As 13 verificações específicas do mapa conferem dimensões, posições de spawn, rotas caminháveis, barreiras, linhas de tiro entre bases, acessos de cada bomb, rotação defensiva, tempos de entrada, tetos e a interrupção da linha de tiro na rotação. As suítes solo e multiplayer verificam partidas completas, plantio, desarme, habilidades e tiros na nova geometria.

O desenho foi preparado para oferecer escolhas de ataque, controle do meio e retomadas. O balanceamento fino entre armas, agentes e posições deve continuar a partir das partidas reais de vocês.

## Atualizar uma hospedagem existente

Substitua os arquivos pelo conteúdo desta versão, incluindo **`arena.js` e `map-layout.js`**. Atualize o jogo do GitHub Pages e o servidor multiplayer juntos: todos precisam usar a mesma geometria. Reiniciar o servidor encerra as salas antigas.

Os comandos de início permanecem iguais: `JOGAR.cmd` para solo, `JOGAR-ONLINE.cmd` para o servidor local e o procedimento de [MULTIPLAYER.md](MULTIPLAYER.md) para hospedar.
