# Modelos, texturas e sons — Alpha 08

Esta versão incorpora modelos reais do **Toon Shooter Game Kit**, de **Quaternius**. A página específica do pacote identifica a licença como **CC0 1.0** e fornece o download público dos arquivos usados. A fonte e a identificação da licença foram conferidas em 1 de novembro de 2026.

- Página do autor: https://quaternius.com/packs/toonshootergamekit.html
- Download indicado pelo autor: https://drive.google.com/drive/folders/1-BDs_EIyd6uiF2XuoyiZEcqnMQIJrE0C
- Licença indicada nessa página: https://creativecommons.org/publicdomain/zero/1.0/
- Texto da licença incluído em `assets/models/CC0-1.0.txt`.
- Arquivos convertidos, tamanhos, animações e hashes: `assets/models/manifest.json`.

## Personagens

Foram importadas três bases: **Character_Soldier, Character_Enemy e Character_Hazmat**. Elas foram adaptadas em cores para os oito agentes. São três modelos-base com variações, e não oito personagens exclusivos feitos pelo autor para este jogo.

| Agente | Modelo-base |
| --- | --- |
| Vex, Sol, Kite | Character_Soldier |
| Echo, Nyx, Rook | Character_Enemy |
| Aegis, Meda | Character_Hazmat |

O pacote possui 17 clipes por personagem. O jogo utiliza postura parada, corrida com arma, postura de disparo dos bots e morte dos bots. Os clipes restantes estão nos arquivos para futuras adaptações. As animações usam o esqueleto do próprio modelo. A orientação, a altura e as cores foram ajustadas para o RUPTURE.

Os indicadores de equipe e as seis hitboxes permanecem separados do modelo visível. O servidor continua usando a representação de colisão leve, sem baixar nem animar esses arquivos.

## Armas

Foram importados oito modelos: **AK, Pistol, Revolver, SMG, Shotgun, Sniper, Sniper_2 e Knife_1**. Eles fornecem as bases visuais para as 12 armas de fogo e a faca do arsenal atual (17 armas na Alpha 06). Armas da mesma família podem compartilhar uma base, com variações de comprimento, materiais e acessórios.

Os modelos aparecem em primeira pessoa e nas mãos dos personagens. A conversão não muda o dano, a cadência, o preço, a munição ou o zoom das armas. As mãos em primeira pessoa e o movimento visual de disparo/recarga continuam sendo produzidos pelo código do jogo; este pacote não inclui uma nova biblioteca de braços FPS animados.

## Preparação e carregamento

- Os glTF com buffers em base64 foram convertidos para **GLB**, mantendo geometrias, materiais, esqueletos e clipes.
- São **11 modelos, aproximadamente 4,46 MB** antes da compressão do ZIP.
- Todos os modelos acompanham o jogo em `assets/models/`. O navegador não depende de Google Drive, Quaternius, Mixamo ou outros sites para carregá-los durante a partida.
- Os modelos são carregados antes da seleção de agentes. Se algum arquivo falhar, o jogo mantém um visual alternativo gerado por código e avisa na tela.
- O carregador GLTF e os utilitários de clonagem pertencem ao **Three.js r170**, sob licença MIT, com a licença já incluída em `vendor/THREE-LICENSE.txt`. Seus imports foram ajustados para usar a cópia local do Three.js.

## Atualizar a hospedagem

Envie a pasta **`assets/` inteira**, `models.js`, os novos arquivos em `vendor/loaders/` e `vendor/utils/`, além dos demais arquivos desta versão. Atualize o jogo e o servidor juntos. O servidor já foi ajustado para entregar `.glb` com o tipo correto.

No Windows, os comandos de início permanecem os mesmos: `JOGAR.cmd` para solo ou `JOGAR-ONLINE.cmd` para multiplayer local. Veja `MULTIPLAYER.md` para hospedar o servidor.

## Cenário importado — Alpha 07

Do mesmo **Toon Shooter Game Kit**, de Quaternius, foram incorporados **Crate, Container_Small, Container_Long, Pallet, GasTank, StreetLight e Tree_1**. O pacote e a licença CC0 foram conferidos novamente em 1 de novembro de 2026. São sete GLB autossuficientes, aproximadamente 213 KB, com materiais de cor do próprio pacote. O manifesto em `assets/environment/manifest.json` registra os arquivos, os IDs de origem do download público, tamanhos e hashes; a licença está nessa pasta.

Os objetos foram ajustados aos volumes do mapa. Caixas e contêineres preservam a colisão das coberturas. Postes e tanques também possuem colisão; o tanque é inerte. Os pallets ficam sob coberturas existentes. As árvores são decoração acima dos telhados. A arquitetura dos prédios continua produzida pelo código.

## Texturas — Alpha 07

Foram usados três materiais do **ambientCG**, distribuídos sob **CC0 1.0**:

- [PavingStones036](https://ambientcg.com/view?id=PavingStones036): pisos de pedra.
- [Concrete034](https://ambientcg.com/view?id=Concrete034): concreto.
- [Plaster001](https://ambientcg.com/view?id=Plaster001): reboco das fachadas.

Os pacotes originais 1K-JPG foram baixados do próprio ambientCG. Os mapas de cor, normal OpenGL e rugosidade foram reduzidos para 512 px e salvos em JPEG qualidade 88: nove imagens, aproximadamente 457 KB. Os UVs são ajustados por unidade do cenário para manter a escala dos materiais. Fontes, hashes, tamanhos e conversão estão em `assets/textures/manifest.json`; a licença CC0 acompanha os arquivos. A licença do acervo é documentada em https://docs.ambientcg.com/license/.

## Efeitos sonoros — Alpha 07

São **25 WAV mono PCM de 16 bits a 24 kHz**, aproximadamente 471 KB, produzidos originalmente para o projeto por síntese de ruído, tons em camadas e envelopes. Não são sons extraídos do Valorant nem de bibliotecas de terceiros. O manifesto em `assets/audio/manifest.json` lista autoria, duração, hashes e tamanhos.

Há seis famílias de disparo, faca, passos em três superfícies, recarga, impacto, confirmação de acerto, dano, eliminação, compra, habilidades, explosão e sinais de spike/round. Armas da mesma família compartilham o som-base. Habilidades compartilham um sinal-base; não são 32 efeitos exclusivos.

O Web Audio aplica volume, direção estéreo, distância e atenuação simples quando há parede entre a fonte e o ouvinte. Não é uma simulação de reverberação por ambiente. Os eventos sonoros são transmitidos no multiplayer e o navegador reproduz os arquivos locais após uma interação do jogador. Caminhar com Shift ou agachar não produz passos. O limite de 32 fontes evita acúmulo em rajadas.

Para publicar esta versão, envie **`assets/` inteira, `audio.js`, `environment.js` e todos os demais arquivos do pacote**. O servidor entrega `.glb`, `.jpg` e `.wav` com os tipos correspondentes. O jogo não depende dos sites dos autores durante a partida.

## Verificações

`npm run test:models` carrega os arquivos GLB reais e verifica as três bases, oito agentes, cópias independentes de esqueleto/material, animação dos ossos, morte/reinício, modelos do arsenal, seleção do acessório, hitboxes e tamanho da biblioteca. As suítes anteriores continuam em `npm test`, `npm run test:online` e `npm run test:map`.

## Combate e ampliação — Alpha 08

O mapa usa a mesma biblioteca com escala horizontal 1,25; as alturas dos objetos ficam iguais. Os personagens preservam suas medidas e hitboxes. O cenário e a simulação multiplayer usam a mesma transformação.

As novas partículas de impacto, brilho, reação visual, onda de eliminação, indicação de dano e transição de morte são geradas pelo código original em `combat-fx.js`. Não dependem de texturas ou animações novas de terceiros. A queda do corpo utiliza o clipe Death já incluído nos personagens do Quaternius. Os novos efeitos não deslocam os proxies de colisão. Os sons da Alpha 07 permanecem disponíveis.
