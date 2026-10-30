
using System;
using System.Collections.Generic;
using System.Drawing;



namespace movimento
{
    public partial class Form5 : Form
    {


        private readonly GameTimer timerJogo;
        private readonly HashSet<Keys> teclas = new HashSet<Keys>();

        private enum TipoPersonagem
        {
            Gelo, Fogo, Natureza, Ninja, NaoyaZenin, GojoSatoru, RyomenSukuna,
            MegumiFushiguro
        }


        // Uma sombra invocada funciona como uma unidade independente: tem vida,
        // velocidade, dano, tempo de permanência e intervalo entre ataques.
        private sealed class SombraInvocada
        {
            public bool Ativa;
            public int Indice;
            public int Dono;
            public float X;
            public float Y;
            public int Vida = 55;
            public int VidaMaxima = 55;
            public int TicksRestantes = 270;
            public int CooldownAtaque = 14;
            public int QuadrosAtaque = 0;
            public int Direcao = 2;
            public float Velocidade = 3f;
            public int Dano = 8;
            public int IntervaloAtaque = 30;
        }

        private SombraInvocada sombraJogador1;
        private SombraInvocada sombraJogador2;

        private const int TotalPersonagens = 8;
        private const int LarguraBase = 1000;
        private const int AlturaBase = 650;

        // A batalha só começa depois que os dois jogadores confirmarem.
        private bool telaSelecao = true;
        private int escolha1 = (int)TipoPersonagem.Fogo;
        private int escolha2 = (int)TipoPersonagem.Gelo;
        private bool confirmado1 = false;
        private bool confirmado2 = false;

        private TipoPersonagem personagem1 = TipoPersonagem.Fogo;
        private TipoPersonagem personagem2 = TipoPersonagem.Gelo;

        private float x = 100, y = 150;
        private float x2 = 300, y2 = 150;

        private int vida1 = 100, vida2 = 100;
        private int direcao1 = 2, direcao2 = 1;

        private int quadroAnimacao = 0, quadroAnimacao2 = 0;
        private int contadorAnimacao = 0, contadorAnimacao2 = 0;

        private bool andando = false, andando2 = false;

        private int cooldown1 = 0, cooldown2 = 0;
        private int ataque1 = 0, ataque2 = 0;

        private int congelado1 = 0, congelado2 = 0;
        private int cooldownPoder1 = 0, cooldownPoder2 = 0;
        private int dashVisual1 = 0, dashVisual2 = 0;

        // Estado da cutscene da Técnica de Projeção do Naoya.
        // Etapas: 0 = preparação, 1 = avanço rápido, 2 = impacto/saída.
        private bool cutsceneNaoyaAtiva = false;
        private int cutsceneNaoyaJogador = 0;
        private int cutsceneNaoyaEtapa = 0;
        private int cutsceneNaoyaQuadro = 0;
        private float naoyaInicioX, naoyaInicioY, naoyaFimX, naoyaFimY;
        private float naoyaAlvoX, naoyaAlvoY;
        private bool naoyaAcertou = false;
        private bool naoyaImpactoAplicado = false;
        private const int QuadrosPreparacaoNaoya = 12;
        private const int QuadrosAvancoNaoya = 10;
        private const int QuadrosImpactoNaoya = 20;

        // Cutscene do Gojo: preparação, disparo do Roxo e impacto.
        private bool cutsceneGojoAtiva = false;
        private int gojoJogador = 0, gojoEtapa = 0, gojoQuadro = 0;
        private float gojoInicioX, gojoInicioY, gojoAlvoX, gojoAlvoY;
        private bool gojoAcertou = false, gojoImpactoAplicado = false;
        private const int QuadrosPreparacaoGojo = 16;
        private const int QuadrosDisparoGojo = 18;
        private const int QuadrosImpactoGojo = 18;

        // Cutscene do Sukuna: abertura do domínio e sequência de cortes.
        private bool cutsceneSukunaAtiva = false;
        private int sukunaJogador = 0, sukunaEtapa = 0, sukunaQuadro = 0;
        private float sukunaInicioX, sukunaInicioY, sukunaAlvoX, sukunaAlvoY;
        private bool sukunaAcertou = false, sukunaImpactoAplicado = false;
        private const int QuadrosPreparacaoSukuna = 16;
        private const int QuadrosCortesSukuna = 28;
        private const int QuadrosFimSukuna = 20;

        // Megumi Fushiguro: cutscene da Técnica das Dez Sombras.
        // Etapas: invocação, aparição sequencial dos shikigami e Jardim das Sombras.
        private bool cutsceneMegumiAtiva = false;
        private int megumiJogador = 0, megumiEtapa = 0, megumiQuadro = 0;
        private float megumiInicioX, megumiInicioY, megumiAlvoX, megumiAlvoY;
        private bool megumiAcertou = false, megumiImpactoAplicado = false;
        private const int QuadrosPreparacaoMegumi = 16;
        private const int QuadrosInvocacaoMegumi = 50;
        private const int QuadrosDominioMegumi = 22;
        private int megumiSombraIndice = 0;
        private static readonly Random SorteioSombrasMegumi = new Random();
        private static readonly string[] NomesSombras = new string[]
        {
            "Cães Divinos", "Nue", "Sapo", "Serpente", "Max Elefante",
            "Fuga dos Coelhos", "Veado Redondo", "Boi Perfurante",
            "Tigre Funeral", "Mahoraga"
        };

        private bool ataqueFogo1 = false, ataqueFogo2 = false;

        private bool combateTerminado = false;
        private string vencedor = "";

        private const float Velocidade = 4f;
        private const int Dano = 10;
        private const float Alcance = 65f;

        public Form5()
        {
            InitializeComponent();

            Text = "Meu RPG 2D - Combate";
            ClientSize = new Size(1000, 650);
            StartPosition = FormStartPosition.CenterScreen;
            KeyPreview = true;
            DoubleBuffered = true;

            KeyDown += Form5_KeyDown;
            KeyUp += Form5_KeyUp;

            timerJogo = new GameTimer();
            timerJogo.Interval = 30;
            timerJogo.Tick += TimerJogo_Tick;
            timerJogo.Start();
        }

        private void Form5_Load(object sender, EventArgs e) { }

        private void Form5_KeyDown(object sender, KeyEventArgs e)
        {
            if (!teclas.Add(e.KeyCode))
                return;

            // Na tela inicial, as teclas servem para escolher os personagens.
            if (telaSelecao)
            {
                if (!confirmado1)
                {
                    if (e.KeyCode == Keys.A)
                        escolha1 = (escolha1 + TotalPersonagens - 1) % TotalPersonagens;
                    else if (e.KeyCode == Keys.D)
                        escolha1 = (escolha1 + 1) % TotalPersonagens;
                    else if (e.KeyCode == Keys.F)
                        confirmado1 = true;
                }

                if (!confirmado2)
                {
                    if (e.KeyCode == Keys.Left)
                        escolha2 = (escolha2 + TotalPersonagens - 1) % TotalPersonagens;
                    else if (e.KeyCode == Keys.Right)
                        escolha2 = (escolha2 + 1) % TotalPersonagens;
                    else if (e.KeyCode == Keys.Enter)
                        confirmado2 = true;
                }

                personagem1 = (TipoPersonagem)escolha1;
                personagem2 = (TipoPersonagem)escolha2;

                if (confirmado1 && confirmado2)
                {
                    telaSelecao = false;
                    teclas.Clear();
                }

                Invalidate();
                return;
            }

            // Durante a cutscene, os controles ficam pausados para destacar a técnica.
            if (cutsceneNaoyaAtiva || cutsceneGojoAtiva || cutsceneSukunaAtiva || cutsceneMegumiAtiva)
            {
                Invalidate();
                return;
            }

            // Controles normais durante a batalha.
            if (e.KeyCode == Keys.F) Atacar(1);
            if (e.KeyCode == Keys.Enter) Atacar(2);
            if (e.KeyCode == Keys.Q) UsarPoder(1);

            if (e.KeyCode == Keys.ShiftKey)
                UsarPoder(2);
        }

        private void Form5_KeyUp(object sender, KeyEventArgs e)
        {
            teclas.Remove(e.KeyCode);
        }

        private void Atacar(int jogador)
        {
            if (combateTerminado) return;
            if (jogador == 1 && cooldown1 > 0) return;
            if (jogador == 2 && cooldown2 > 0) return;

            float ax = jogador == 1 ? x : x2;
            float ay = jogador == 1 ? y : y2;
            int dir = jogador == 1 ? direcao1 : direcao2;

            // Se a sombra inimiga estiver entre os lutadores e dentro do alcance,
            // o ataque pode acertá-la. Assim, ela também possui vida e pode ser derrotada.
            SombraInvocada alvoSombra = jogador == 1 ? sombraJogador2 : sombraJogador1;
            if (alvoSombra != null && alvoSombra.Ativa)
            {
                float sx = alvoSombra.X + 16f;
                float sy = alvoSombra.Y + 22f;
                float sdx = sx - (ax + 16f);
                float sdy = sy - (ay + 22f);
                double distanciaSombra = Math.Sqrt(sdx * sdx + sdy * sdy);

                if (distanciaSombra <= Alcance && EstaNaFrente(dir, sdx, sdy))
                {
                    int danoSombra = jogador == 1 && ataqueFogo1 ? 25 :
                                     jogador == 2 && ataqueFogo2 ? 25 : Dano;
                    alvoSombra.Vida = Math.Max(0, alvoSombra.Vida - danoSombra);
                    alvoSombra.QuadrosAtaque = Math.Max(alvoSombra.QuadrosAtaque, 3);
                    if (alvoSombra.Vida <= 0)
                        alvoSombra.Ativa = false;

                    if (jogador == 1)
                    {
                        ataqueFogo1 = false;
                        cooldown1 = 15;
                        ataque1 = 7;
                    }
                    else
                    {
                        ataqueFogo2 = false;
                        cooldown2 = 15;
                        ataque2 = 7;
                    }

                    Invalidate();
                    return;
                }
            }

            float tx = jogador == 1 ? x2 : x;
            float ty = jogador == 1 ? y2 : y;
            float dx = (tx + 16f) - (ax + 16f);
            float dy = (ty + 22f) - (ay + 22f);

            if (Math.Sqrt(dx * dx + dy * dy) > Alcance)
                return;
            if (!EstaNaFrente(dir, dx, dy)) return;

            if (jogador == 1)
            {
                vida2 = Math.Max(0, vida2 - (ataqueFogo1 ? 25 : Dano));
                ataqueFogo1 = false;
                cooldown1 = 15;
                ataque1 = 7;
            }
            else
            {
                vida1 = Math.Max(0, vida1 - (ataqueFogo2 ? 25 : Dano));
                ataqueFogo2 = false;
                cooldown2 = 15;
                ataque2 = 7;
            }

            VerificarVencedor();
            Invalidate();
        }

        private bool EstaNaFrente(int direcao, float dx, float dy)
        {
            return
                (direcao == 0 && dy > 0 && Math.Abs(dy) >= Math.Abs(dx)) ||
                (direcao == 3 && dy < 0 && Math.Abs(dy) >= Math.Abs(dx)) ||
                (direcao == 1 && dx < 0 && Math.Abs(dx) >= Math.Abs(dy)) ||
                (direcao == 2 && dx > 0 && Math.Abs(dx) >= Math.Abs(dy));
        }

        private void VerificarVencedor()
        {
            if (vida1 <= 0)
            {
                vida1 = 0;
                combateTerminado = true;
                vencedor = "Jogador 2 venceu!";
            }
            else if (vida2 <= 0)
            {
                vida2 = 0;
                combateTerminado = true;
                vencedor = "Jogador 1 venceu!";
            }
        }

        private void UsarPoder(int jogador)
        {
            if (combateTerminado) return;
            if (jogador == 1 && cooldownPoder1 > 0) return;
            if (jogador == 2 && cooldownPoder2 > 0) return;

            TipoPersonagem tipo =
                jogador == 1 ? personagem1 : personagem2;

            switch (tipo)
            {
                case TipoPersonagem.Gelo:
                    if (jogador == 1) congelado2 = 67;
                    else congelado1 = 67;
                    break;

                case TipoPersonagem.Fogo:
                    if (jogador == 1) ataqueFogo1 = true;
                    else ataqueFogo2 = true;
                    break;

                case TipoPersonagem.Natureza:
                    if (jogador == 1) vida1 = Math.Min(100, vida1 + 30);
                    else vida2 = Math.Min(100, vida2 + 30);
                    break;

                case TipoPersonagem.Ninja:
                    if (jogador == 1)
                    {
                        x = x2 > x ? x2 - 45 : x2 + 35;
                        y = y2;
                        direcao1 = x2 > x ? 2 : 1;
                    }
                    else
                    {
                        x2 = x > x2 ? x - 45 : x + 35;
                        y2 = y;
                        direcao2 = x > x2 ? 2 : 1;
                    }
                    LimitarPosicoes();
                    break;

                case TipoPersonagem.NaoyaZenin:
                    UsarTecnicaProjecao(jogador);
                    break;

                case TipoPersonagem.GojoSatoru:
                    UsarRoxoGojo(jogador);
                    break;

                case TipoPersonagem.RyomenSukuna:
                    UsarDominioSukuna(jogador);
                    break;

                case TipoPersonagem.MegumiFushiguro:
                    UsarDezSombrasMegumi(jogador);
                    break;
            }

            VerificarVencedor();

            if (jogador == 1)
                cooldownPoder1 = ObterCooldownPoder(personagem1);
            else
                cooldownPoder2 = ObterCooldownPoder(personagem2);

            Invalidate();
        }

        // Inicia uma sequência cinematográfica para a Técnica de Projeção.
        // A movimentação é animada pelo TimerJogo_Tick em vez de acontecer instantaneamente.
        private void UsarTecnicaProjecao(int jogador)
        {
            cutsceneNaoyaAtiva = true;
            cutsceneNaoyaJogador = jogador;
            cutsceneNaoyaEtapa = 0;
            cutsceneNaoyaQuadro = 0;
            naoyaImpactoAplicado = false;

            naoyaInicioX = jogador == 1 ? x : x2;
            naoyaInicioY = jogador == 1 ? y : y2;
            naoyaAlvoX = jogador == 1 ? x2 : x;
            naoyaAlvoY = jogador == 1 ? y2 : y;

            float dx = naoyaAlvoX - naoyaInicioX;
            float dy = naoyaAlvoY - naoyaInicioY;
            float distancia = (float)Math.Sqrt(dx * dx + dy * dy);

            if (distancia > 0.01f)
            {
                AtualizarDirecao((int)Math.Round(dx), (int)Math.Round(dy), jogador);
                // Naoya tenta parar perto do rival, sem atravessar o personagem.
                float deslocamento = Math.Min(180f, Math.Max(0f, distancia - 44f));
                naoyaFimX = naoyaInicioX + dx / distancia * deslocamento;
                naoyaFimY = naoyaInicioY + dy / distancia * deslocamento;
            }
            else
            {
                naoyaFimX = naoyaInicioX;
                naoyaFimY = naoyaInicioY;
            }

            naoyaFimX = Math.Max(0, Math.Min(naoyaFimX, ClientSize.Width - 32));
            naoyaFimY = Math.Max(100, Math.Min(naoyaFimY, ClientSize.Height - 44));

            float distanciaFinalX = naoyaAlvoX - naoyaFimX;
            float distanciaFinalY = naoyaAlvoY - naoyaFimY;
            float distanciaFinal = (float)Math.Sqrt(
                distanciaFinalX * distanciaFinalX + distanciaFinalY * distanciaFinalY);
            naoyaAcertou = distanciaFinal <= 68f;

            // Liga o rastro visual durante a preparação.
            if (jogador == 1) dashVisual1 = 8;
            else dashVisual2 = 8;
        }

        private void AtualizarCutsceneNaoya()
        {
            // Mantém a aura visível enquanto a sequência está em andamento.
            if (cutsceneNaoyaJogador == 1) dashVisual1 = 6;
            else dashVisual2 = 6;

            cutsceneNaoyaQuadro++;

            if (cutsceneNaoyaEtapa == 0)
            {
                // Pequena preparação antes da arrancada.
                if (cutsceneNaoyaQuadro >= QuadrosPreparacaoNaoya)
                {
                    cutsceneNaoyaEtapa = 1;
                    cutsceneNaoyaQuadro = 0;
                }
                return;
            }

            if (cutsceneNaoyaEtapa == 1)
            {
                // Curva de aceleração: começa controlado e termina muito rápido.
                float t = Math.Min(1f, (float)cutsceneNaoyaQuadro / QuadrosAvancoNaoya);
                float progresso = 1f - (float)Math.Pow(1f - t, 3);
                float novoX = naoyaInicioX + (naoyaFimX - naoyaInicioX) * progresso;
                float novoY = naoyaInicioY + (naoyaFimY - naoyaInicioY) * progresso;

                if (cutsceneNaoyaJogador == 1)
                {
                    x = novoX;
                    y = novoY;
                }
                else
                {
                    x2 = novoX;
                    y2 = novoY;
                }

                if (cutsceneNaoyaQuadro >= QuadrosAvancoNaoya)
                {
                    if (cutsceneNaoyaJogador == 1)
                    {
                        x = naoyaFimX;
                        y = naoyaFimY;
                        ataque1 = 10;
                    }
                    else
                    {
                        x2 = naoyaFimX;
                        y2 = naoyaFimY;
                        ataque2 = 10;
                    }

                    // O impacto acontece uma única vez, no fim da animação de avanço.
                    if (naoyaAcertou && !naoyaImpactoAplicado)
                    {
                        if (cutsceneNaoyaJogador == 1)
                        {
                            vida2 = Math.Max(0, vida2 - 18);
                            congelado2 = Math.Max(congelado2, 33);
                        }
                        else
                        {
                            vida1 = Math.Max(0, vida1 - 18);
                            congelado1 = Math.Max(congelado1, 33);
                        }
                        naoyaImpactoAplicado = true;
                        VerificarVencedor();
                    }

                    cutsceneNaoyaEtapa = 2;
                    cutsceneNaoyaQuadro = 0;
                }
                return;
            }

            if (cutsceneNaoyaEtapa == 2 && cutsceneNaoyaQuadro >= QuadrosImpactoNaoya)
            {
                cutsceneNaoyaAtiva = false;
                cutsceneNaoyaEtapa = 0;
                cutsceneNaoyaQuadro = 0;
                dashVisual1 = 0;
                dashVisual2 = 0;
                LimitarPosicoes();
            }
        }

        // Gojo dispara uma versão lúdica do Hollow Purple (Roxo).
        // A animação continua mesmo após o dano, para concluir a cutscene.
        private void UsarRoxoGojo(int jogador)
        {
            cutsceneGojoAtiva = true;
            gojoJogador = jogador;
            gojoEtapa = 0;
            gojoQuadro = 0;
            gojoImpactoAplicado = false;

            gojoInicioX = jogador == 1 ? x : x2;
            gojoInicioY = jogador == 1 ? y : y2;
            gojoAlvoX = jogador == 1 ? x2 : x;
            gojoAlvoY = jogador == 1 ? y2 : y;

            float dx = gojoAlvoX - gojoInicioX;
            float dy = gojoAlvoY - gojoInicioY;
            float distancia = (float)Math.Sqrt(dx * dx + dy * dy);
            gojoAcertou = distancia <= 520f;

            if (distancia > 0.01f)
                AtualizarDirecao((int)Math.Round(dx), (int)Math.Round(dy), jogador);
        }

        private void AtualizarCutsceneGojo()
        {
            gojoQuadro++;

            if (gojoEtapa == 0)
            {
                if (gojoQuadro >= QuadrosPreparacaoGojo)
                {
                    gojoEtapa = 1;
                    gojoQuadro = 0;
                }
                return;
            }

            if (gojoEtapa == 1)
            {
                if (gojoQuadro >= QuadrosDisparoGojo)
                {
                    if (gojoAcertou && !gojoImpactoAplicado)
                    {
                        if (gojoJogador == 1)
                        {
                            vida2 = Math.Max(0, vida2 - 28);
                            congelado2 = Math.Max(congelado2, 20);
                            x2 = Math.Max(0, Math.Min(ClientSize.Width - 32,
                                x2 + (direcao1 == 2 ? 42 : direcao1 == 1 ? -42 : 0)));
                            y2 = Math.Max(100, Math.Min(ClientSize.Height - 44,
                                y2 + (direcao1 == 0 ? 42 : direcao1 == 3 ? -42 : 0)));
                        }
                        else
                        {
                            vida1 = Math.Max(0, vida1 - 28);
                            congelado1 = Math.Max(congelado1, 20);
                            x = Math.Max(0, Math.Min(ClientSize.Width - 32,
                                x + (direcao2 == 2 ? 42 : direcao2 == 1 ? -42 : 0)));
                            y = Math.Max(100, Math.Min(ClientSize.Height - 44,
                                y + (direcao2 == 0 ? 42 : direcao2 == 3 ? -42 : 0)));
                        }
                        gojoImpactoAplicado = true;
                        VerificarVencedor();
                    }
                    gojoEtapa = 2;
                    gojoQuadro = 0;
                }
                return;
            }

            if (gojoEtapa == 2 && gojoQuadro >= QuadrosImpactoGojo)
            {
                cutsceneGojoAtiva = false;
                gojoEtapa = 0;
                gojoQuadro = 0;
                LimitarPosicoes();
            }
        }

        // Sukuna expande o Santuário Malevolente e atinge inimigos próximos
        // com cortes sucessivos. O alcance da área é de 300 pixels.
        private void UsarDominioSukuna(int jogador)
        {
            cutsceneSukunaAtiva = true;
            sukunaJogador = jogador;
            sukunaEtapa = 0;
            sukunaQuadro = 0;
            sukunaImpactoAplicado = false;

            sukunaInicioX = jogador == 1 ? x : x2;
            sukunaInicioY = jogador == 1 ? y : y2;
            sukunaAlvoX = jogador == 1 ? x2 : x;
            sukunaAlvoY = jogador == 1 ? y2 : y;

            float dx = sukunaAlvoX - sukunaInicioX;
            float dy = sukunaAlvoY - sukunaInicioY;
            sukunaAcertou = Math.Sqrt(dx * dx + dy * dy) <= 300f;
        }

        private void AtualizarCutsceneSukuna()
        {
            sukunaQuadro++;

            if (sukunaEtapa == 0)
            {
                if (sukunaQuadro >= QuadrosPreparacaoSukuna)
                {
                    sukunaEtapa = 1;
                    sukunaQuadro = 0;
                }
                return;
            }

            if (sukunaEtapa == 1)
            {
                // O dano ocorre durante a sequência de cortes, uma única vez.
                if (sukunaQuadro >= 10 && !sukunaImpactoAplicado)
                {
                    if (sukunaAcertou)
                    {
                        if (sukunaJogador == 1)
                        {
                            vida2 = Math.Max(0, vida2 - 30);
                            congelado2 = Math.Max(congelado2, 25);
                        }
                        else
                        {
                            vida1 = Math.Max(0, vida1 - 30);
                            congelado1 = Math.Max(congelado1, 25);
                        }
                        VerificarVencedor();
                    }
                    sukunaImpactoAplicado = true;
                }

                if (sukunaQuadro >= QuadrosCortesSukuna)
                {
                    sukunaEtapa = 2;
                    sukunaQuadro = 0;
                }
                return;
            }

            if (sukunaEtapa == 2 && sukunaQuadro >= QuadrosFimSukuna)
            {
                cutsceneSukunaAtiva = false;
                sukunaEtapa = 0;
                sukunaQuadro = 0;
            }
        }

        // Megumi sorteia uma única sombra a cada ativação da Técnica das Dez Sombras.
        private void UsarDezSombrasMegumi(int jogador)
        {
            megumiSombraIndice = SorteioSombrasMegumi.Next(NomesSombras.Length);
            cutsceneMegumiAtiva = true;
            megumiJogador = jogador;
            megumiEtapa = 0;
            megumiQuadro = 0;
            megumiImpactoAplicado = false;

            megumiInicioX = jogador == 1 ? x : x2;
            megumiInicioY = jogador == 1 ? y : y2;
            megumiAlvoX = jogador == 1 ? x2 : x;
            megumiAlvoY = jogador == 1 ? y2 : y;

            float dx = megumiAlvoX - megumiInicioX;
            float dy = megumiAlvoY - megumiInicioY;
            float distancia = (float)Math.Sqrt(dx * dx + dy * dy);

            // A sombra invocada passa a perseguir o oponente depois da cutscene,
            // portanto o alcance inicial não impede a invocação.
            megumiAcertou = true;

            if (distancia > 0.01f)
                AtualizarDirecao((int)Math.Round(dx), (int)Math.Round(dy), jogador);
        }

        private void AtualizarCutsceneMegumi()
        {
            megumiQuadro++;

            if (megumiEtapa == 0)
            {
                if (megumiQuadro >= QuadrosPreparacaoMegumi)
                {
                    megumiEtapa = 1;
                    megumiQuadro = 0;
                }
                return;
            }

            if (megumiEtapa == 1)
            {
                // O efeito da sombra sorteada acontece uma única vez no momento do impacto.
                if (megumiQuadro >= 28 && !megumiImpactoAplicado)
                {
                    AplicarEfeitoSombraMegumi();
                    megumiImpactoAplicado = true;
                }

                if (megumiQuadro >= QuadrosInvocacaoMegumi)
                {
                    megumiEtapa = 2;
                    megumiQuadro = 0;
                }
                return;
            }

            if (megumiEtapa == 2 && megumiQuadro >= QuadrosDominioMegumi)
            {
                cutsceneMegumiAtiva = false;
                megumiEtapa = 0;
                megumiQuadro = 0;
            }
        }

        // A cutscene invoca o shikigami; ele permanece na arena e luta por conta própria.
        private void AplicarEfeitoSombraMegumi()
        {
            float donoX = megumiJogador == 1 ? x : x2;
            float donoY = megumiJogador == 1 ? y : y2;
            float alvoX = megumiJogador == 1 ? x2 : x;

            SombraInvocada nova = new SombraInvocada();
            nova.Ativa = true;
            nova.Indice = megumiSombraIndice;
            nova.Dono = megumiJogador;
            nova.Vida = 20;
            nova.VidaMaxima = 20;
            nova.TicksRestantes = 270; // cerca de 8,1 segundos após a cutscene
            nova.CooldownAtaque = 14;
            nova.X = donoX + (alvoX >= donoX ? -42f : 42f);
            nova.Y = donoY + 4f;
            nova.X = Math.Max(4f, Math.Min(nova.X, ClientSize.Width - 42f));
            nova.Y = Math.Max(102f, Math.Min(nova.Y, ClientSize.Height - 48f));

            // Cada shikigami tem um perfil diferente, mas todos perseguem e atacam.
            switch (nova.Indice)
            {
                case 0: nova.Velocidade = 3.8f; nova.Dano = 8; nova.IntervaloAtaque = 28; break; // Cães Divinos
                case 1: nova.Velocidade = 3.2f; nova.Dano = 7; nova.IntervaloAtaque = 32; break; // Nue
                case 2: nova.Velocidade = 2.8f; nova.Dano = 6; nova.IntervaloAtaque = 30; break; // Sapo
                case 3: nova.Velocidade = 3.4f; nova.Dano = 8; nova.IntervaloAtaque = 31; break; // Serpente
                case 4: nova.Velocidade = 2.0f; nova.Dano = 12; nova.IntervaloAtaque = 43; break; // Max Elefante
                case 5: nova.Velocidade = 4.2f; nova.Dano = 4; nova.IntervaloAtaque = 17; break; // Coelhos
                case 6: nova.Velocidade = 3.0f; nova.Dano = 5; nova.IntervaloAtaque = 28; break; // Veado Redondo
                case 7: nova.Velocidade = 4.5f; nova.Dano = 14; nova.IntervaloAtaque = 42; break; // Boi Perfurante
                case 8: nova.Velocidade = 3.6f; nova.Dano = 10; nova.IntervaloAtaque = 29; break; // Tigre Funeral
                case 9: nova.Velocidade = 3.1f; nova.Dano = 12; nova.IntervaloAtaque = 34; break; // Mahoraga
            }

            if (megumiJogador == 1)
                sombraJogador1 = nova;
            else
                sombraJogador2 = nova;
        }

        private void AtualizarSombrasInvocadas()
        {
            AtualizarSombraInvocada(sombraJogador1);
            AtualizarSombraInvocada(sombraJogador2);
        }

        private void AtualizarSombraInvocada(SombraInvocada sombra)
        {
            if (sombra == null || !sombra.Ativa)
                return;

            sombra.TicksRestantes--;
            if (sombra.TicksRestantes <= 0 || sombra.Vida <= 0)
            {
                sombra.Ativa = false;
                return;
            }

            if (sombra.CooldownAtaque > 0) sombra.CooldownAtaque--;
            if (sombra.QuadrosAtaque > 0) sombra.QuadrosAtaque--;

            float alvoX = sombra.Dono == 1 ? x2 : x;
            float alvoY = sombra.Dono == 1 ? y2 : y;
            float dx = (alvoX + 16f) - (sombra.X + 16f);
            float dy = (alvoY + 22f) - (sombra.Y + 22f);
            float distancia = (float)Math.Sqrt(dx * dx + dy * dy);

            if (distancia > 44f)
            {
                float divisor = Math.Max(0.001f, distancia);
                sombra.X += dx / divisor * sombra.Velocidade;
                sombra.Y += dy / divisor * sombra.Velocidade;

                if (Math.Abs(dx) >= Math.Abs(dy))
                    sombra.Direcao = dx < 0 ? 1 : 2;
                else
                    sombra.Direcao = dy < 0 ? 3 : 0;
            }
            else if (sombra.CooldownAtaque <= 0)
            {
                sombra.QuadrosAtaque = 8;
                sombra.CooldownAtaque = sombra.IntervaloAtaque;

                if (sombra.Dono == 1)
                {
                    vida2 = Math.Max(0, vida2 - sombra.Dano);
                    if (sombra.Indice == 1) congelado2 = Math.Max(congelado2, 8);  // Nue
                    if (sombra.Indice == 2) congelado2 = Math.Max(congelado2, 12); // Sapo
                    if (sombra.Indice == 8) congelado2 = Math.Max(congelado2, 8);  // Tigre
                    if (sombra.Indice == 9) congelado2 = Math.Max(congelado2, 10); // Mahoraga
                    if (sombra.Indice == 6) vida1 = Math.Min(100, vida1 + 3); // Veado: ataque e pequeno suporte
                }
                else
                {
                    vida1 = Math.Max(0, vida1 - sombra.Dano);
                    if (sombra.Indice == 1) congelado1 = Math.Max(congelado1, 8);
                    if (sombra.Indice == 2) congelado1 = Math.Max(congelado1, 12);
                    if (sombra.Indice == 8) congelado1 = Math.Max(congelado1, 8);
                    if (sombra.Indice == 9) congelado1 = Math.Max(congelado1, 10);
                    if (sombra.Indice == 6) vida2 = Math.Min(100, vida2 + 3);
                }

                VerificarVencedor();
            }

            sombra.X = Math.Max(0f, Math.Min(sombra.X, ClientSize.Width - 42f));
            sombra.Y = Math.Max(101f, Math.Min(sombra.Y, ClientSize.Height - 48f));
        }

        private void DesenharSombraInvocada(Graphics g, SombraInvocada sombra)
        {
            if (sombra == null || !sombra.Ativa)
                return;

            float cx = sombra.X + 16f;
            float cy = sombra.Y + 22f;
            Color corDono = sombra.Dono == 1 ? Color.DeepSkyBlue : Color.LightCoral;

            using (Brush sombraChao = new SolidBrush(Color.FromArgb(110, 7, 6, 19)))
                g.FillEllipse(sombraChao, cx - 21f, cy + 13f, 42f, 10f);

            using (Pen aura = new Pen(Color.FromArgb(205, corDono), 2f))
                g.DrawEllipse(aura, cx - 25f, cy - 25f, 50f, 50f);

            if (sombra.QuadrosAtaque > 0)
            {
                using (Pen golpe = new Pen(Color.FromArgb(225, 208, 198, 255), 3f))
                {
                    if (sombra.Direcao == 1 || sombra.Direcao == 2)
                    {
                        int sinal = sombra.Direcao == 2 ? 1 : -1;
                        g.DrawLine(golpe, cx + sinal * 9f, cy - 3f, cx + sinal * 31f, cy - 13f);
                        g.DrawLine(golpe, cx + sinal * 10f, cy + 5f, cx + sinal * 35f, cy + 7f);
                    }
                    else
                    {
                        int sinal = sombra.Direcao == 0 ? 1 : -1;
                        g.DrawLine(golpe, cx - 8f, cy + sinal * 5f, cx - 17f, cy + sinal * 28f);
                        g.DrawLine(golpe, cx + 8f, cy + sinal * 5f, cx + 18f, cy + sinal * 28f);
                    }
                }
            }

            DesenharSimboloSombra(g, sombra.Indice, cx, cy, 48f, 245);

            // Barra de vida própria, como uma unidade independente da batalha.
            const float larguraBarra = 42f;
            float barraX = cx - larguraBarra / 2f;
            float barraY = sombra.Y - 12f;
            using (Brush fundo = new SolidBrush(Color.FromArgb(220, 25, 12, 30)))
                g.FillRectangle(fundo, barraX, barraY, larguraBarra, 5f);
            float preenchimento = larguraBarra * Math.Max(0, sombra.Vida) / Math.Max(1, sombra.VidaMaxima);
            using (Brush vida = new SolidBrush(corDono))
                g.FillRectangle(vida, barraX, barraY, preenchimento, 5f);
            g.DrawRectangle(Pens.White, barraX, barraY, larguraBarra, 5f);
        }

        private int ObterCooldownPoder(TipoPersonagem tipo)
        {
            switch (tipo)
            {
                case TipoPersonagem.Gelo: return 150;       // 4,5 segundos
                case TipoPersonagem.Fogo: return 100;       // 3 segundos
                case TipoPersonagem.Natureza: return 200;   // 6 segundos
                case TipoPersonagem.Ninja: return 133;      // 4 segundos
                case TipoPersonagem.NaoyaZenin: return 180; // 5,4 segundos
                case TipoPersonagem.GojoSatoru: return 230; // 6,9 segundos
                case TipoPersonagem.RyomenSukuna: return 210; // 6,3 segundos
                case TipoPersonagem.MegumiFushiguro: return 280; // 8,4 segundos
                default: return 100;
            }
        }

        private void TimerJogo_Tick(object sender, EventArgs e)
        {
            if (telaSelecao)
            {
                Invalidate();
                return;
            }

            if (cooldown1 > 0) cooldown1--;
            if (cooldown2 > 0) cooldown2--;
            if (ataque1 > 0) ataque1--;
            if (ataque2 > 0) ataque2--;
            if (cooldownPoder1 > 0) cooldownPoder1--;
            if (cooldownPoder2 > 0) cooldownPoder2--;
            if (congelado1 > 0) congelado1--;
            if (congelado2 > 0) congelado2--;
            if (dashVisual1 > 0) dashVisual1--;
            if (dashVisual2 > 0) dashVisual2--;

            if (cutsceneNaoyaAtiva)
            {
                AtualizarCutsceneNaoya();
                Invalidate();
                return;
            }

            if (cutsceneGojoAtiva)
            {
                AtualizarCutsceneGojo();
                Invalidate();
                return;
            }

            if (cutsceneSukunaAtiva)
            {
                AtualizarCutsceneSukuna();
                Invalidate();
                return;
            }

            if (cutsceneMegumiAtiva)
            {
                AtualizarCutsceneMegumi();
                Invalidate();
                return;
            }

            if (combateTerminado)
            {
                Invalidate();
                return;
            }

            AtualizarSombrasInvocadas();

            int dx = 0, dy = 0;

            if (teclas.Contains(Keys.A)) dx--;
            if (teclas.Contains(Keys.D)) dx++;
            if (teclas.Contains(Keys.W)) dy--;
            if (teclas.Contains(Keys.S)) dy++;

            andando = dx != 0 || dy != 0;

            if (congelado1 > 0)
                andando = false;
            else if (andando)
            {
                float d = (float)Math.Sqrt(dx * dx + dy * dy);
                x += dx / d * Velocidade;
                y += dy / d * Velocidade;

                AtualizarDirecao(dx, dy, 1);

                if (++contadorAnimacao >= 4)
                {
                    quadroAnimacao = (quadroAnimacao + 1) % 2;
                    contadorAnimacao = 0;
                }
            }
            else
            {
                quadroAnimacao = 0;
                contadorAnimacao = 0;
            }

            int dx2 = 0, dy2 = 0;

            if (teclas.Contains(Keys.Left)) dx2--;
            if (teclas.Contains(Keys.Right)) dx2++;
            if (teclas.Contains(Keys.Up)) dy2--;
            if (teclas.Contains(Keys.Down)) dy2++;

            andando2 = dx2 != 0 || dy2 != 0;

            if (congelado2 > 0)
                andando2 = false;
            else if (andando2)
            {
                float d2 = (float)Math.Sqrt(dx2 * dx2 + dy2 * dy2);
                x2 += dx2 / d2 * Velocidade;
                y2 += dy2 / d2 * Velocidade;

                AtualizarDirecao(dx2, dy2, 2);

                if (++contadorAnimacao2 >= 4)
                {
                    quadroAnimacao2 = (quadroAnimacao2 + 1) % 2;
                    contadorAnimacao2 = 0;
                }
            }
            else
            {
                quadroAnimacao2 = 0;
                contadorAnimacao2 = 0;
            }

            LimitarPosicoes();
            Invalidate();
        }

        private void AtualizarDirecao(int dx, int dy, int jogador)
        {
            int dir;

            if (Math.Abs(dx) >= Math.Abs(dy))
                dir = dx < 0 ? 1 : 2;
            else
                dir = dy < 0 ? 3 : 0;

            if (jogador == 1) direcao1 = dir;
            else direcao2 = dir;
        }

        private void LimitarPosicoes()
        {
            x = Math.Max(0, Math.Min(x, ClientSize.Width - 32));
            y = Math.Max(100, Math.Min(y, ClientSize.Height - 44));
            x2 = Math.Max(0, Math.Min(x2, ClientSize.Width - 32));
            y2 = Math.Max(100, Math.Min(y2, ClientSize.Height - 44));
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            Graphics g = e.Graphics;

            if (telaSelecao)
            {
                // A tela de seleção usa um layout-base e escala de forma proporcional
                // quando o tamanho da janela muda (inclusive em 2560 x 1440).
                GraphicsState estado = g.Save();
                float escala = Math.Min(
                    (float)ClientSize.Width / LarguraBase,
                    (float)ClientSize.Height / AlturaBase);
                float deslocamentoX = (ClientSize.Width - LarguraBase * escala) / 2f;
                float deslocamentoY = (ClientSize.Height - AlturaBase * escala) / 2f;
                g.TranslateTransform(deslocamentoX, deslocamentoY);
                g.ScaleTransform(escala, escala);
                DesenharTelaSelecao(g);
                g.Restore(estado);
                return;
            }

            g.SmoothingMode = SmoothingMode.None;
            g.Clear(Color.FromArgb(95, 155, 85));

            GraphicsState estadoMundo = g.Save();
            if (cutsceneNaoyaAtiva && cutsceneNaoyaEtapa == 2)
            {
                float intensidade = naoyaAcertou && cutsceneNaoyaQuadro < 8 ? 6f : 2f;
                float tremorX = (float)Math.Sin(cutsceneNaoyaQuadro * 2.7) * intensidade;
                float tremorY = (float)Math.Cos(cutsceneNaoyaQuadro * 3.1) * intensidade * 0.6f;
                g.TranslateTransform(tremorX, tremorY);
            }

            using (Pen grade = new Pen(Color.FromArgb(80, 130, 70)))
            {
                for (int i = 0; i < ClientSize.Width; i += 32)
                    g.DrawLine(grade, i, 0, i, ClientSize.Height);

                for (int i = 0; i < ClientSize.Height; i += 32)
                    g.DrawLine(grade, 0, i, ClientSize.Width, i);
            }

            DesenharBarraVida(g, 20, 20, vida1, Color.DodgerBlue,
                "JOGADOR 1 - " + personagem1);

            DesenharBarraVida(g, ClientSize.Width - 240, 20, vida2,
                Color.Crimson, "JOGADOR 2 - " + personagem2);

            DesenharPersonagem(g, x, y, personagem1,
                andando, quadroAnimacao, direcao1, ataque1, congelado1, ataqueFogo1, dashVisual1);

            DesenharPersonagem(g, x2, y2, personagem2,
                andando2, quadroAnimacao2, direcao2, ataque2, congelado2, ataqueFogo2, dashVisual2);

            // Os shikigami permanecem no campo de batalha e são desenhados como unidades próprias.
            DesenharSombraInvocada(g, sombraJogador1);
            DesenharSombraInvocada(g, sombraJogador2);

            using (Font f = new Font("Arial", 10, FontStyle.Bold))
            {
                g.DrawString("WASD: mover | F: atacar | Q: poder",
                    f, Brushes.White, 20, 75);

                g.DrawString("Setas: mover | Enter: atacar | Shift: poder",
                    f, Brushes.White, ClientSize.Width - 350, 75);

                g.DrawString("Poder: " + (cooldownPoder1 == 0 ? "pronto" : "recarregando"),
                    f, Brushes.White, 20, 95);

                g.DrawString("Poder: " + (cooldownPoder2 == 0 ? "pronto" : "recarregando"),
                    f, Brushes.White, ClientSize.Width - 240, 95);
            }

            if (combateTerminado)
                DesenharTelaVitoria(g);

            g.Restore(estadoMundo);

            if (cutsceneNaoyaAtiva)
                DesenharCutsceneNaoya(g);
            if (cutsceneGojoAtiva)
                DesenharCutsceneGojo(g);
            if (cutsceneSukunaAtiva)
                DesenharCutsceneSukuna(g);
            if (cutsceneMegumiAtiva)
                DesenharCutsceneMegumi(g);
        }

        private void DesenharCutsceneGojo(Graphics g)
        {
            int quadro = gojoQuadro;
            int alpha = gojoEtapa == 2 ? (gojoAcertou && quadro < 5 ? 78 : 118) : 90;
            using (Brush sombra = new SolidBrush(Color.FromArgb(alpha, 7, 5, 26)))
                g.FillRectangle(sombra, ClientRectangle);

            int faixa = Math.Max(34, ClientSize.Height / 13);
            using (Brush barra = new SolidBrush(Color.FromArgb(238, 4, 5, 18)))
            {
                g.FillRectangle(barra, 0, 0, ClientSize.Width, faixa);
                g.FillRectangle(barra, 0, ClientSize.Height - faixa, ClientSize.Width, faixa);
            }

            float sx = gojoInicioX + 16f;
            float sy = gojoInicioY + 20f;
            float tx = gojoAlvoX + 16f;
            float ty = gojoAlvoY + 20f;

            if (gojoEtapa == 0)
            {
                float pulso = 20f + (quadro % 6) * 4f;
                using (Pen azul = new Pen(Color.FromArgb(220, 80, 175, 255), 3f))
                using (Pen vermelho = new Pen(Color.FromArgb(210, 255, 75, 95), 2f))
                {
                    g.DrawEllipse(azul, sx - pulso, sy - pulso, pulso * 2, pulso * 2);
                    g.DrawEllipse(vermelho, sx - pulso * 0.65f, sy - pulso * 0.65f,
                        pulso * 1.3f, pulso * 1.3f);
                }
            }
            else if (gojoEtapa == 1)
            {
                float t = Math.Min(1f, (float)quadro / QuadrosDisparoGojo);
                float px = sx + (tx - sx) * t;
                float py = sy + (ty - sy) * t;
                using (Pen rastro = new Pen(Color.FromArgb(150, 140, 100, 255), 18f))
                using (Pen roxo = new Pen(Color.FromArgb(230, 190, 145, 255), 8f))
                using (Brush nucleo = new SolidBrush(Color.FromArgb(255, 230, 220, 255)))
                {
                    rastro.StartCap = LineCap.Round; rastro.EndCap = LineCap.Round;
                    roxo.StartCap = LineCap.Round; roxo.EndCap = LineCap.Round;
                    g.DrawLine(rastro, sx, sy, px, py);
                    g.DrawLine(roxo, sx, sy, px, py);
                    g.FillEllipse(nucleo, px - 13, py - 13, 26, 26);
                }
                using (Pen riscos = new Pen(Color.FromArgb(150, 170, 200, 255), 2f))
                {
                    for (int i = 0; i < 12; i++)
                    {
                        float yy = (i * 53 + quadro * 29) % Math.Max(1, ClientSize.Height);
                        float xx = (i * 71 + quadro * 43) % Math.Max(1, ClientSize.Width);
                        g.DrawLine(riscos, xx, yy, Math.Min(ClientSize.Width, xx + 55 + i * 7), yy - 12);
                    }
                }
            }
            else
            {
                float raio = 30f + quadro * 12f;
                int brilho = Math.Max(0, 230 - quadro * 12);
                using (Pen anel = new Pen(Color.FromArgb(brilho, 180, 125, 255), 5f))
                using (Pen anel2 = new Pen(Color.FromArgb(brilho, 100, 185, 255), 2f))
                {
                    g.DrawEllipse(anel, tx - raio, ty - raio * 0.65f, raio * 2f, raio * 1.3f);
                    g.DrawEllipse(anel2, tx - raio * 0.7f, ty - raio * 0.45f,
                        raio * 1.4f, raio * 0.9f);
                }
            }

            string titulo = gojoEtapa == 0 ? "GOJO SATORU" :
                            gojoEtapa == 1 ? "HOLLOW PURPLE — ROXO" :
                            (gojoAcertou ? "IMPACTO DO ROXO!" : "TÉCNICA LANÇADA");
            string subtitulo = gojoEtapa == 0 ? "CONVERGÊNCIA DE ENERGIA" :
                               gojoEtapa == 1 ? "AZUL + VERMELHO" :
                               (gojoAcertou ? "A ENERGIA IMAGINÁRIA ATINGIU O ALVO" : "O OPONENTE ESTAVA FORA DO ALCANCE");
            DesenharTextoCinematografico(g, titulo, subtitulo,
                Color.FromArgb(235, 190, 165, 255), faixa);
        }

        private void DesenharCutsceneSukuna(Graphics g)
        {
            int quadro = sukunaQuadro;
            int alpha = sukunaEtapa == 2 && sukunaAcertou && quadro < 4 ? 65 : 112;
            using (Brush sombra = new SolidBrush(Color.FromArgb(alpha, 24, 2, 5)))
                g.FillRectangle(sombra, ClientRectangle);

            int faixa = Math.Max(34, ClientSize.Height / 13);
            using (Brush barra = new SolidBrush(Color.FromArgb(240, 12, 3, 8)))
            {
                g.FillRectangle(barra, 0, 0, ClientSize.Width, faixa);
                g.FillRectangle(barra, 0, ClientSize.Height - faixa, ClientSize.Width, faixa);
            }

            float cx = sukunaInicioX + 16f;
            float cy = sukunaInicioY + 21f;
            if (sukunaEtapa == 0)
            {
                float pulso = 80f + (quadro % 5) * 8f;
                using (Pen vermelho = new Pen(Color.FromArgb(230, 195, 30, 48), 3f))
                using (Pen ouro = new Pen(Color.FromArgb(180, 255, 105, 60), 2f))
                {
                    g.DrawEllipse(vermelho, cx - pulso, cy - pulso * 0.65f,
                        pulso * 2f, pulso * 1.3f);
                    g.DrawLine(vermelho, cx - 42, cy - 72, cx - 42, cy + 72);
                    g.DrawLine(vermelho, cx + 42, cy - 72, cx + 42, cy + 72);
                    g.DrawLine(ouro, cx - 58, cy - 45, cx, cy - 95);
                    g.DrawLine(ouro, cx, cy - 95, cx + 58, cy - 45);
                }
            }
            else if (sukunaEtapa == 1)
            {
                using (Pen corte = new Pen(Color.FromArgb(210, 255, 45, 60), 3f))
                using (Pen corteClaro = new Pen(Color.FromArgb(150, 255, 200, 180), 1.5f))
                {
                    for (int i = 0; i < 18; i++)
                    {
                        int xx = (i * 97 + quadro * 47) % Math.Max(1, ClientSize.Width);
                        int yy = (i * 61 + quadro * 37) % Math.Max(1, ClientSize.Height);
                        int comprimento = 35 + ((i * 19 + quadro * 13) % 105);
                        g.DrawLine(corte, xx, yy, Math.Min(ClientSize.Width, xx + comprimento), yy - 22);
                        if (i % 2 == 0)
                            g.DrawLine(corteClaro, xx + 8, yy + 8,
                                Math.Min(ClientSize.Width, xx + comprimento - 5), yy - 10);
                    }
                }
                using (Pen circulo = new Pen(Color.FromArgb(170, 200, 20, 40), 2f))
                    g.DrawEllipse(circulo, cx - 280, cy - 180, 560, 360);
            }
            else
            {
                float raio = 45 + quadro * 10f;
                using (Pen corte = new Pen(Color.FromArgb(Math.Max(0, 220 - quadro * 10), 255, 40, 50), 4f))
                {
                    g.DrawEllipse(corte, cx - raio, cy - raio * 0.55f, raio * 2, raio * 1.1f);
                    g.DrawLine(corte, cx - raio, cy - raio * 0.5f, cx + raio, cy + raio * 0.5f);
                    g.DrawLine(corte, cx - raio * 0.8f, cy + raio * 0.5f, cx + raio * 0.8f, cy - raio * 0.5f);
                }
            }

            string titulo = sukunaEtapa == 0 ? "RYOMEN SUKUNA" :
                            sukunaEtapa == 1 ? "SANTUÁRIO MALEVOLENTE" :
                            (sukunaAcertou ? "CORTES!" : "DOMÍNIO EXPANDIDO");
            string subtitulo = sukunaEtapa == 0 ? "EXPANSÃO DE DOMÍNIO" :
                               sukunaEtapa == 1 ? "DESMANTELAR — CORTES EM ÁREA" :
                               (sukunaAcertou ? "NINGUÉM ESCAPA DO SANTUÁRIO" : "O OPONENTE ESTAVA FORA DA ÁREA");
            DesenharTextoCinematografico(g, titulo, subtitulo,
                Color.FromArgb(255, 255, 90, 85), faixa);
        }

        private void DesenharCutsceneMegumi(Graphics g)
        {
            int quadro = megumiQuadro;
            int alphaFundo = megumiEtapa == 2 && megumiAcertou && quadro < 5 ? 48 : 128;
            using (Brush sombraFundo = new SolidBrush(Color.FromArgb(alphaFundo, 5, 7, 18)))
                g.FillRectangle(sombraFundo, ClientRectangle);

            int faixa = Math.Max(36, ClientSize.Height / 13);
            using (Brush barra = new SolidBrush(Color.FromArgb(242, 3, 5, 12)))
            {
                g.FillRectangle(barra, 0, 0, ClientSize.Width, faixa);
                g.FillRectangle(barra, 0, ClientSize.Height - faixa, ClientSize.Width, faixa);
            }

            float sx = megumiInicioX + 16f;
            float sy = megumiInicioY + 22f;
            float tx = megumiAlvoX + 16f;
            float ty = megumiAlvoY + 22f;
            string nomeSombra = NomesSombras[megumiSombraIndice];

            if (megumiEtapa == 0)
            {
                // A sombra se abre sob Megumi enquanto ele prepara a invocação.
                float progresso = (float)quadro / QuadrosPreparacaoMegumi;
                float raio = 28f + progresso * 92f;
                int a = Math.Max(0, 220 - quadro * 7);
                using (Pen anel = new Pen(Color.FromArgb(a, 95, 83, 155), 4f))
                using (Pen anelInterno = new Pen(Color.FromArgb(a, 155, 150, 205), 2f))
                {
                    g.DrawEllipse(anel, sx - raio, sy - raio * 0.42f, raio * 2f, raio * 0.84f);
                    g.DrawEllipse(anelInterno, sx - raio * 0.62f, sy - raio * 0.28f,
                        raio * 1.24f, raio * 0.56f);
                }
                using (Pen linhas = new Pen(Color.FromArgb(170, 120, 115, 190), 2f))
                {
                    for (int i = 0; i < 8; i++)
                    {
                        float ang = (float)(i * Math.PI / 4.0 + quadro * 0.08);
                        float x1 = sx + (float)Math.Cos(ang) * 18f;
                        float y1 = sy + (float)Math.Sin(ang) * 18f;
                        float x2 = sx + (float)Math.Cos(ang) * (raio + 10f);
                        float y2 = sy + (float)Math.Sin(ang) * (raio * 0.45f + 10f);
                        g.DrawLine(linhas, x1, y1, x2, y2);
                    }
                }

                // Símbolo da sombra sorteada aparece já durante a preparação.
                float pulso = 48f + (float)Math.Sin(quadro * 0.7f) * 6f;
                DesenharSimboloSombra(g, megumiSombraIndice, sx, sy - 42f, pulso, Math.Min(230, 90 + quadro * 8));
            }
            else if (megumiEtapa == 1)
            {
                // Rastro de sombra e um único shikigami sorteado avançando em direção ao alvo.
                float t = Math.Min(1f, (float)quadro / QuadrosInvocacaoMegumi);
                float fimX = sx + (tx - sx) * t;
                float fimY = sy + (ty - sy) * t;
                using (Pen trilhaEscura = new Pen(Color.FromArgb(205, 20, 19, 42), 36f))
                using (Pen trilhaRoxa = new Pen(Color.FromArgb(180, 95, 78, 150), 5f))
                {
                    trilhaEscura.StartCap = LineCap.Round;
                    trilhaEscura.EndCap = LineCap.Round;
                    trilhaRoxa.StartCap = LineCap.Round;
                    trilhaRoxa.EndCap = LineCap.Round;
                    g.DrawLine(trilhaEscura, sx, sy, fimX, fimY);
                    g.DrawLine(trilhaRoxa, sx, sy, fimX, fimY);
                }

                using (Pen riscos = new Pen(Color.FromArgb(150, 140, 130, 200), 2f))
                {
                    for (int i = 0; i < 14; i++)
                    {
                        int yy = (i * 43 + quadro * 19) % Math.Max(1, ClientSize.Height);
                        int xx = (i * 79 + quadro * 27) % Math.Max(1, ClientSize.Width);
                        g.DrawLine(riscos, xx, yy, Math.Min(ClientSize.Width, xx + 34 + i * 5), yy - 8);
                    }
                }

                float oscilacao = (float)Math.Sin(quadro * 0.38f) * 13f;
                float tamanho = Math.Min(118f, Math.Max(66f, ClientSize.Width / 14f));
                // Rastros menores do MESMO shikigami, sem exibir os outros nove.
                for (int rastro = 3; rastro >= 1; rastro--)
                {
                    float tRastro = Math.Max(0f, t - rastro * 0.075f);
                    float rx = sx + (tx - sx) * tRastro;
                    float ry = sy + (ty - sy) * tRastro + oscilacao;
                    DesenharSimboloSombra(g, megumiSombraIndice, rx, ry,
                        tamanho * (1f - rastro * 0.13f), Math.Max(22, 105 - rastro * 25));
                }
                DesenharSimboloSombra(g, megumiSombraIndice, fimX, fimY + oscilacao, tamanho,
                    Math.Min(255, 145 + quadro * 4));

                using (Font f = new Font("Segoe UI", Math.Max(12f, Math.Min(25f, ClientSize.Width / 65f)), FontStyle.Bold))
                using (Brush b = new SolidBrush(Color.FromArgb(245, 238, 236, 255)))
                using (StringFormat alinhamento = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center })
                {
                    RectangleF areaNome = new RectangleF(20, ClientSize.Height * 0.78f,
                        ClientSize.Width - 40, Math.Max(28, ClientSize.Height * 0.06f));
                    g.DrawString("SOMBRA INVOCADA: " + nomeSombra.ToUpperInvariant(), f, b, areaNome, alinhamento);
                }
            }
            else
            {
                // Impacto da sombra sorteada: uma única figura no centro, com ondas de energia.
                float progresso = Math.Min(1f, (float)quadro / QuadrosDominioMegumi);
                float raio = 45f + progresso * Math.Min(ClientSize.Width, ClientSize.Height) * 0.42f;
                int a = Math.Max(0, 230 - quadro * 10);
                float cx = ClientSize.Width / 2f;
                float cy = ClientSize.Height / 2f;
                using (Pen circulo = new Pen(Color.FromArgb(a, 93, 75, 153), 6f))
                using (Pen circuloFino = new Pen(Color.FromArgb(a, 175, 163, 220), 2f))
                {
                    g.DrawEllipse(circulo, cx - raio, cy - raio * 0.5f, raio * 2f, raio);
                    g.DrawEllipse(circuloFino, cx - raio * 0.72f, cy - raio * 0.36f, raio * 1.44f, raio * 0.72f);
                }
                using (Pen corte = new Pen(Color.FromArgb(a, 175, 160, 230), 3f))
                {
                    for (int i = 0; i < 10; i++)
                    {
                        double ang = i * Math.PI / 5.0 + quadro * 0.12;
                        float px = cx + (float)Math.Cos(ang) * raio * 0.72f;
                        float py = cy + (float)Math.Sin(ang) * raio * 0.35f;
                        g.DrawLine(corte, cx, cy, px, py);
                    }
                }
                float tamanhoSombra = Math.Min(150f, Math.Max(82f, ClientSize.Width / 11f));
                DesenharSimboloSombra(g, megumiSombraIndice, cx, cy - 8f, tamanhoSombra,
                    Math.Max(30, 235 - quadro * 7));

                if (megumiAcertou && quadro < 8)
                {
                    using (Pen flash = new Pen(Color.FromArgb(Math.Max(0, 210 - quadro * 25), 218, 218, 255), 9f))
                        g.DrawEllipse(flash, cx - 50 - quadro * 12, cy - 30 - quadro * 6,
                            100 + quadro * 24, 60 + quadro * 12);
                }
            }

            string titulo;
            string subtitulo;
            if (megumiEtapa == 0)
            {
                titulo = "MEGUMI FUSHIGURO";
                subtitulo = "TÉCNICA DAS DEZ SOMBRAS — INVOCANDO " + nomeSombra.ToUpperInvariant();
            }
            else if (megumiEtapa == 1)
            {
                titulo = "TÉCNICA DAS DEZ SOMBRAS";
                subtitulo = "SHIKIGAMI: " + nomeSombra.ToUpperInvariant();
            }
            else
            {
                titulo = nomeSombra.ToUpperInvariant() + (megumiAcertou ? " — ATAQUE!" : " — INVOCAÇÃO");
                if (megumiSombraIndice == 6)
                    subtitulo = "VEADO REDONDO — MEGUMI RECUPERA 25 PONTOS DE VIDA";
                else if (megumiAcertou)
                    subtitulo = nomeSombra.ToUpperInvariant() + " ATINGIU O ADVERSÁRIO";
                else
                    subtitulo = "O ADVERSÁRIO ESTAVA FORA DO ALCANCE";
            }

            DesenharTextoCinematografico(g, titulo, subtitulo,
                Color.FromArgb(235, 188, 178, 255), faixa);
        }

        private void DesenharSimboloSombra(Graphics g, int indice, float cx, float cy,
            float tamanho, int alpha)
        {
            float r = tamanho * 0.34f;
            using (Brush aura = new SolidBrush(Color.FromArgb(Math.Max(0, alpha / 4), 115, 95, 180)))
                g.FillEllipse(aura, cx - r * 1.45f, cy - r * 1.45f, r * 2.9f, r * 2.9f);
            using (Brush b = new SolidBrush(Color.FromArgb(alpha, 18, 17, 32)))
            using (Pen p = new Pen(Color.FromArgb(alpha, 185, 177, 224), 2f))
            {
                switch (indice)
                {
                    case 0: // Cães Divinos
                        g.FillEllipse(b, cx - r, cy - r * 0.25f, r * 2f, r * 1.45f);
                        g.FillPolygon(b, new PointF[] { new PointF(cx - r * 0.7f, cy - r * 0.1f), new PointF(cx - r * 0.85f, cy - r * 1.0f), new PointF(cx - r * 0.2f, cy - r * 0.45f) });
                        g.FillPolygon(b, new PointF[] { new PointF(cx + r * 0.25f, cy - r * 0.4f), new PointF(cx + r * 0.85f, cy - r * 0.95f), new PointF(cx + r * 0.8f, cy - r * 0.05f) });
                        g.DrawEllipse(p, cx + r * 0.25f, cy + r * 0.1f, r * 0.16f, r * 0.16f);
                        break;
                    case 1: // Nue
                        g.FillEllipse(b, cx - r * 0.38f, cy - r * 0.1f, r * 0.76f, r * 1.15f);
                        g.FillPolygon(b, new PointF[] { new PointF(cx - r * 0.25f, cy), new PointF(cx - r * 1.35f, cy - r * 0.75f), new PointF(cx - r * 0.95f, cy + r * 0.55f) });
                        g.FillPolygon(b, new PointF[] { new PointF(cx + r * 0.25f, cy), new PointF(cx + r * 1.35f, cy - r * 0.75f), new PointF(cx + r * 0.95f, cy + r * 0.55f) });
                        g.FillEllipse(b, cx - r * 0.25f, cy - r * 0.9f, r * 0.5f, r * 0.65f);
                        break;
                    case 2: // Sapo
                        g.FillEllipse(b, cx - r, cy - r * 0.2f, r * 2f, r * 1.2f);
                        g.FillEllipse(b, cx - r * 0.65f, cy - r * 0.65f, r * 0.55f, r * 0.55f);
                        g.FillEllipse(b, cx + r * 0.1f, cy - r * 0.65f, r * 0.55f, r * 0.55f);
                        g.DrawLine(p, cx + r * 0.5f, cy + r * 0.35f, cx + r * 1.25f, cy + r * 0.65f);
                        break;
                    case 3: // Serpente
                        g.DrawLines(p, new PointF[] { new PointF(cx - r, cy + r * 0.55f), new PointF(cx - r * 0.55f, cy - r * 0.45f), new PointF(cx, cy + r * 0.3f), new PointF(cx + r * 0.5f, cy - r * 0.45f), new PointF(cx + r, cy + r * 0.35f) });
                        g.FillEllipse(b, cx + r * 0.45f, cy - r * 0.65f, r * 0.8f, r * 0.55f);
                        break;
                    case 4: // Max Elefante
                        g.FillEllipse(b, cx - r, cy - r * 0.5f, r * 1.8f, r * 1.5f);
                        g.FillEllipse(b, cx + r * 0.25f, cy - r * 0.55f, r * 0.65f, r * 0.65f);
                        g.DrawArc(p, cx + r * 0.35f, cy - r * 0.05f, r * 0.7f, r * 1.2f, 20, 150);
                        g.DrawLine(p, cx - r * 0.55f, cy + r * 0.65f, cx - r * 0.55f, cy + r * 1.0f);
                        g.DrawLine(p, cx + r * 0.25f, cy + r * 0.65f, cx + r * 0.25f, cy + r * 1.0f);
                        break;
                    case 5: // Coelhos
                        g.FillEllipse(b, cx - r * 0.8f, cy, r * 0.8f, r * 0.8f);
                        g.FillEllipse(b, cx + r * 0.05f, cy, r * 0.8f, r * 0.8f);
                        g.FillEllipse(b, cx - r * 0.65f, cy - r * 1.3f, r * 0.3f, r * 1.1f);
                        g.FillEllipse(b, cx - r * 0.15f, cy - r * 1.3f, r * 0.3f, r * 1.1f);
                        g.FillEllipse(b, cx + r * 0.2f, cy - r * 1.3f, r * 0.3f, r * 1.1f);
                        g.FillEllipse(b, cx + r * 0.7f, cy - r * 1.3f, r * 0.3f, r * 1.1f);
                        break;
                    case 6: // Veado Redondo
                        g.FillEllipse(b, cx - r * 0.7f, cy - r * 0.1f, r * 1.4f, r * 1.0f);
                        g.DrawLine(p, cx - r * 0.25f, cy - r * 0.2f, cx - r * 0.65f, cy - r * 1.1f);
                        g.DrawLine(p, cx - r * 0.65f, cy - r * 1.1f, cx - r * 1.0f, cy - r * 0.8f);
                        g.DrawLine(p, cx + r * 0.25f, cy - r * 0.2f, cx + r * 0.65f, cy - r * 1.1f);
                        g.DrawLine(p, cx + r * 0.65f, cy - r * 1.1f, cx + r * 1.0f, cy - r * 0.8f);
                        break;
                    case 7: // Boi Perfurante
                        g.FillEllipse(b, cx - r, cy - r * 0.35f, r * 2f, r * 1.2f);
                        g.FillPolygon(b, new PointF[] { new PointF(cx - r * 0.65f, cy - r * 0.2f), new PointF(cx - r * 1.4f, cy - r * 0.9f), new PointF(cx - r * 0.8f, cy + r * 0.1f) });
                        g.FillPolygon(b, new PointF[] { new PointF(cx + r * 0.65f, cy - r * 0.2f), new PointF(cx + r * 1.4f, cy - r * 0.9f), new PointF(cx + r * 0.8f, cy + r * 0.1f) });
                        break;
                    case 8: // Tigre Funeral
                        g.FillEllipse(b, cx - r, cy - r * 0.25f, r * 2f, r * 1.2f);
                        for (int i = -1; i <= 1; i++)
                            g.DrawLine(p, cx + i * r * 0.5f, cy - r * 0.15f, cx + i * r * 0.25f, cy + r * 0.55f);
                        g.FillEllipse(b, cx - r * 0.35f, cy - r * 0.85f, r * 0.8f, r * 0.75f);
                        break;
                    default: // Mahoraga: figura e roda
                        g.FillEllipse(b, cx - r * 0.38f, cy - r * 0.55f, r * 0.76f, r * 0.6f);
                        g.FillRectangle(b, cx - r * 0.5f, cy + r * 0.05f, r, r * 1.2f);
                        g.DrawEllipse(p, cx - r * 1.1f, cy - r * 1.45f, r * 2.2f, r * 0.75f);
                        g.DrawLine(p, cx, cy - r * 1.45f, cx, cy - r * 0.7f);
                        g.DrawLine(p, cx - r * 0.75f, cy - r * 1.25f, cx + r * 0.75f, cy - r * 0.9f);
                        break;
                }
            }
        }

        private void DesenharTextoCinematografico(Graphics g, string titulo,
            string subtitulo, Color corTitulo, int alturaBarra)
        {
            using (Font fonteTitulo = new Font("Arial", Math.Max(18, ClientSize.Width / 38), FontStyle.Bold))
            using (Font fonteSub = new Font("Arial", Math.Max(10, ClientSize.Width / 100), FontStyle.Bold))
            using (Brush pincelTitulo = new SolidBrush(corTitulo))
            using (Brush branco = new SolidBrush(Color.White))
            {
                SizeF t = g.MeasureString(titulo, fonteTitulo);
                SizeF st = g.MeasureString(subtitulo, fonteSub);
                float yTitulo = ClientSize.Height - alturaBarra - t.Height - 10;
                if (yTitulo < alturaBarra + 4) yTitulo = alturaBarra + 4;
                g.DrawString(titulo, fonteTitulo, pincelTitulo,
                    (ClientSize.Width - t.Width) / 2f, yTitulo);
                g.DrawString(subtitulo, fonteSub, branco,
                    (ClientSize.Width - st.Width) / 2f, ClientSize.Height - alturaBarra + 5);
            }
        }

        private void DesenharCutsceneNaoya(Graphics g)
        {
            int quadro = cutsceneNaoyaQuadro;
            int escurecer = cutsceneNaoyaEtapa == 2 ? 78 : 95;
            if (cutsceneNaoyaEtapa == 2 && naoyaAcertou && quadro < 5)
                escurecer = 45; // clarão rápido no momento do impacto

            using (Brush sombra = new SolidBrush(Color.FromArgb(escurecer, 4, 7, 18)))
                g.FillRectangle(sombra, ClientRectangle);

            int alturaBarra = Math.Max(38, ClientSize.Height / 12);
            using (Brush barra = new SolidBrush(Color.FromArgb(235, 8, 10, 20)))
            {
                g.FillRectangle(barra, 0, 0, ClientSize.Width, alturaBarra);
                g.FillRectangle(barra, 0, ClientSize.Height - alturaBarra,
                    ClientSize.Width, alturaBarra);
            }

            // Linhas de velocidade animadas durante o avanço.
            if (cutsceneNaoyaEtapa == 1)
            {
                using (Pen linha = new Pen(Color.FromArgb(175, 226, 210, 125), 2f))
                {
                    for (int i = 0; i < 12; i++)
                    {
                        int yLinha = (i * 47 + quadro * 31) % Math.Max(1, ClientSize.Height);
                        int inicio = (i * 83 + quadro * 53) % Math.Max(1, ClientSize.Width);
                        int comprimento = 45 + ((i * 17 + quadro * 11) % 130);
                        g.DrawLine(linha, inicio, yLinha,
                            Math.Min(ClientSize.Width, inicio + comprimento), yLinha - 9);
                    }
                }
            }

            // Anéis de energia no impacto.
            if (cutsceneNaoyaEtapa == 2 && naoyaAcertou)
            {
                float progresso = Math.Min(1f, (float)quadro / QuadrosImpactoNaoya);
                float raio = 35f + progresso * Math.Min(ClientSize.Width, ClientSize.Height) * 0.45f;
                int alpha = Math.Max(0, 220 - quadro * 11);
                using (Pen anel = new Pen(Color.FromArgb(alpha, 239, 220, 138), 4f))
                {
                    float cx = ClientSize.Width / 2f;
                    float cy = ClientSize.Height / 2f;
                    g.DrawEllipse(anel, cx - raio, cy - raio * 0.42f,
                        raio * 2f, raio * 0.84f);
                }
            }

            string titulo;
            string subtitulo;
            if (cutsceneNaoyaEtapa == 0)
            {
                titulo = "NAOYA ZENIN";
                subtitulo = "TÉCNICA DE PROJEÇÃO";
            }
            else if (cutsceneNaoyaEtapa == 1)
            {
                titulo = "TÉCNICA DE PROJEÇÃO";
                subtitulo = "ACELERAÇÃO — 24 QUADROS";
            }
            else
            {
                titulo = naoyaAcertou ? "IMPACTO!" : "AVANÇO CONCLUÍDO";
                subtitulo = naoyaAcertou ? "O OPONENTE FOI ATORDOADO" : "O OPONENTE ESTAVA FORA DE ALCANCE";
            }

            using (Font fonteTitulo = new Font("Arial", Math.Max(18, ClientSize.Width / 36), FontStyle.Bold))
            using (Font fonteSub = new Font("Arial", Math.Max(10, ClientSize.Width / 95), FontStyle.Bold))
            using (Brush ouro = new SolidBrush(Color.FromArgb(255, 238, 218, 133)))
            using (Brush branco = new SolidBrush(Color.White))
            {
                SizeF tamTitulo = g.MeasureString(titulo, fonteTitulo);
                SizeF tamSub = g.MeasureString(subtitulo, fonteSub);
                float yTitulo = ClientSize.Height - alturaBarra - tamTitulo.Height - 12;
                float ySub = ClientSize.Height - alturaBarra + 7;
                if (yTitulo < alturaBarra + 5) yTitulo = alturaBarra + 5;
                g.DrawString(titulo, fonteTitulo, ouro,
                    (ClientSize.Width - tamTitulo.Width) / 2f, yTitulo);
                g.DrawString(subtitulo, fonteSub, branco,
                    (ClientSize.Width - tamSub.Width) / 2f, ySub);
            }
        }

        private void DesenharTelaSelecao(Graphics g)
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.Clear(Color.FromArgb(15, 18, 32));

            // Fundo dividido de forma simétrica para separar visualmente os jogadores.
            using (Brush faixa1 = new SolidBrush(Color.FromArgb(35, 35, 80, 155)))
                g.FillRectangle(faixa1, 0, 0, LarguraBase / 2, AlturaBase);
            using (Brush faixa2 = new SolidBrush(Color.FromArgb(35, 155, 35, 60)))
                g.FillRectangle(faixa2, LarguraBase / 2, 0, LarguraBase / 2, AlturaBase);

            using (Font titulo = new Font("Segoe UI", 25, FontStyle.Bold))
            using (Font subtitulo = new Font("Segoe UI", 10, FontStyle.Regular))
            using (Brush branco = new SolidBrush(Color.White))
            using (Brush dourado = new SolidBrush(Color.FromArgb(255, 240, 207, 112)))
            using (StringFormat centralizado = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center })
            {
                string textoTitulo = "ESCOLHA SEU PERSONAGEM";
                g.DrawString(textoTitulo, titulo, dourado,
                    new RectangleF(0, 8, LarguraBase, 38), centralizado);

                string subt = "Selecione um personagem e confirme para iniciar a batalha.";
                g.DrawString(subt, subtitulo, branco,
                    new RectangleF(0, 45, LarguraBase, 24), centralizado);
            }

            const float painelY = 80f;
            const float painelAltura = 438f;
            const float painelLargura = 465f;
            const float painel1X = 22f;
            const float painel2X = 513f;
            DesenharPainelSelecao(g, new RectangleF(painel1X, painelY, painelLargura, painelAltura),
                "JOGADOR 1", Color.DeepSkyBlue);
            DesenharPainelSelecao(g, new RectangleF(painel2X, painelY, painelLargura, painelAltura),
                "JOGADOR 2", Color.LightCoral);

            DesenharCartoesSelecao(g, painel1X, painelLargura, escolha1, confirmado1);
            DesenharCartoesSelecao(g, painel2X, painelLargura, escolha2, confirmado2);

            using (Font instrucoes = new Font("Segoe UI", 10, FontStyle.Bold))
            using (Font rodape = new Font("Segoe UI", 9, FontStyle.Regular))
            using (StringFormat centralizado = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center })
            {
                g.DrawString("A / D: trocar personagem     F: confirmar",
                    instrucoes, Brushes.DeepSkyBlue, new RectangleF(painel1X, 524, painelLargura, 24), centralizado);
                g.DrawString("← / →: trocar personagem     ENTER: confirmar",
                    instrucoes, Brushes.LightCoral, new RectangleF(painel2X, 524, painelLargura, 24), centralizado);

                string status1 = confirmado1 ? "ESCOLHA CONFIRMADA" : "ESCOLHA UM PERSONAGEM";
                string status2 = confirmado2 ? "ESCOLHA CONFIRMADA" : "ESCOLHA UM PERSONAGEM";
                g.DrawString(status1, rodape, confirmado1 ? Brushes.LightGreen : Brushes.White,
                    new RectangleF(painel1X, 550, painelLargura, 20), centralizado);
                g.DrawString(status2, rodape, confirmado2 ? Brushes.LightGreen : Brushes.White,
                    new RectangleF(painel2X, 550, painelLargura, 20), centralizado);

                string aviso = confirmado1 && confirmado2
                    ? "Preparando a batalha..."
                    : "A batalha começa quando os dois jogadores confirmarem.";
                g.DrawString(aviso, rodape, Brushes.Gold,
                    new RectangleF(0, 586, LarguraBase, 22), centralizado);
            }
        }

        private void DesenharPainelSelecao(Graphics g, RectangleF painel, string titulo, Color cor)
        {
            using (Brush fundo = new SolidBrush(Color.FromArgb(45, 8, 12, 25)))
                g.FillRectangle(fundo, painel);
            using (Pen borda = new Pen(Color.FromArgb(120, cor), 1.5f))
                g.DrawRectangle(borda, painel.X, painel.Y, painel.Width, painel.Height);
            using (Font fonte = new Font("Segoe UI", 13, FontStyle.Bold))
            using (Brush pincel = new SolidBrush(cor))
            using (StringFormat centralizado = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center })
                g.DrawString(titulo, fonte, pincel,
                    new RectangleF(painel.X, painel.Y + 3, painel.Width, 27), centralizado);
        }

        private void DesenharCartoesSelecao(Graphics g, float painelX, float painelLargura,
            int escolha, bool confirmado)
        {
            TipoPersonagem[] tipos = new TipoPersonagem[]
            {
                TipoPersonagem.Gelo,
                TipoPersonagem.Fogo,
                TipoPersonagem.Natureza,
                TipoPersonagem.Ninja,
                TipoPersonagem.NaoyaZenin,
                TipoPersonagem.GojoSatoru,
                TipoPersonagem.RyomenSukuna,
                TipoPersonagem.MegumiFushiguro
            };

            const float margemInterna = 12f;
            const float espacamentoColunas = 10f;
            const float topoCartoes = 114f;
            const float alturaCartao = 70f;
            const float espacamentoLinhas = 8f;
            float larguraCartao = (painelLargura - margemInterna * 2f - espacamentoColunas) / 2f;

            using (Font inicial = new Font("Segoe UI", 12, FontStyle.Bold))
            using (Font fonteNome = new Font("Segoe UI", 9.5f, FontStyle.Bold))
            using (Font fonteDescricao = new Font("Segoe UI", 7.5f, FontStyle.Regular))
            using (Font fonteEstado = new Font("Segoe UI", 6.8f, FontStyle.Bold))
            using (StringFormat centralizado = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center })
            using (StringFormat textoEsquerda = new StringFormat { Alignment = StringAlignment.Near, LineAlignment = StringAlignment.Center, Trimming = StringTrimming.EllipsisCharacter, FormatFlags = StringFormatFlags.NoWrap })
            {
                for (int i = 0; i < tipos.Length; i++)
                {
                    int coluna = i % 2;
                    int linha = i / 2;
                    float cardX = painelX + margemInterna + coluna * (larguraCartao + espacamentoColunas);
                    float cardY = topoCartoes + linha * (alturaCartao + espacamentoLinhas);
                    RectangleF cartao = new RectangleF(cardX, cardY, larguraCartao, alturaCartao);
                    Color cor = CorPersonagem(tipos[i]);
                    bool selecionado = escolha == i;

                    using (Brush fundo = new SolidBrush(selecionado
                        ? Color.FromArgb(100, cor)
                        : Color.FromArgb(48, 235, 239, 255)))
                        g.FillRectangle(fundo, cartao);

                    using (Pen borda = new Pen(selecionado
                        ? (confirmado ? Color.LimeGreen : Color.White)
                        : Color.FromArgb(85, 180, 190, 210), selecionado ? 2.5f : 1f))
                        g.DrawRectangle(borda, cartao.X, cartao.Y, cartao.Width, cartao.Height);

                    // Ícone centralizado em um círculo de tamanho fixo para todos os cartões.
                    RectangleF circulo = new RectangleF(cardX + 11f, cardY + 17f, 36f, 36f);
                    using (Brush simbolo = new SolidBrush(cor))
                        g.FillEllipse(simbolo, circulo);

                    string letra = tipos[i] == TipoPersonagem.Gelo ? "G" :
                                   tipos[i] == TipoPersonagem.Fogo ? "F" :
                                   tipos[i] == TipoPersonagem.Natureza ? "N" :
                                   tipos[i] == TipoPersonagem.Ninja ? "X" :
                                   tipos[i] == TipoPersonagem.NaoyaZenin ? "Z" :
                                   tipos[i] == TipoPersonagem.GojoSatoru ? "∞" :
                                   tipos[i] == TipoPersonagem.RyomenSukuna ? "S" : "M";
                    g.DrawString(letra, inicial, Brushes.White, circulo, centralizado);

                    float textoX = cardX + 56f;
                    float textoLargura = larguraCartao - 64f;
                    g.DrawString(NomePersonagem(tipos[i]), fonteNome, Brushes.White,
                        new RectangleF(textoX, cardY + 8f, textoLargura, 20f), textoEsquerda);
                    g.DrawString(DescricaoPersonagem(tipos[i]), fonteDescricao, Brushes.Gainsboro,
                        new RectangleF(textoX, cardY + 29f, textoLargura, 16f), textoEsquerda);

                    if (selecionado)
                    {
                        string legenda = confirmado ? "CONFIRMADO" : "SELECIONADO";
                        using (Brush destaque = new SolidBrush(confirmado ? Color.LightGreen : Color.Gold))
                            g.DrawString(legenda, fonteEstado, destaque,
                                new RectangleF(textoX, cardY + 48f, textoLargura, 13f), textoEsquerda);
                    }
                }
            }
        }

        private Color CorPersonagem(TipoPersonagem tipo)
        {
            switch (tipo)
            {
                case TipoPersonagem.Gelo: return Color.DeepSkyBlue;
                case TipoPersonagem.Fogo: return Color.Crimson;
                case TipoPersonagem.Natureza: return Color.ForestGreen;
                case TipoPersonagem.Ninja: return Color.MediumPurple;
                case TipoPersonagem.NaoyaZenin: return Color.DarkKhaki;
                case TipoPersonagem.GojoSatoru: return Color.DodgerBlue;
                case TipoPersonagem.RyomenSukuna: return Color.Crimson;
                case TipoPersonagem.MegumiFushiguro: return Color.MediumSlateBlue;
                default: return Color.DarkKhaki;
            }
        }

        private string NomePersonagem(TipoPersonagem tipo)
        {
            switch (tipo)
            {
                case TipoPersonagem.Gelo: return "Gelo";
                case TipoPersonagem.Fogo: return "Fogo";
                case TipoPersonagem.Natureza: return "Natureza";
                case TipoPersonagem.Ninja: return "Ninja";
                case TipoPersonagem.NaoyaZenin: return "Naoya Zenin";
                case TipoPersonagem.GojoSatoru: return "Gojo Satoru";
                case TipoPersonagem.RyomenSukuna: return "Ryomen Sukuna";
                case TipoPersonagem.MegumiFushiguro: return "Megumi Fushiguro";
                default: return "Personagem";
            }
        }

        private string DescricaoPersonagem(TipoPersonagem tipo)
        {
            switch (tipo)
            {
                case TipoPersonagem.Gelo: return "Congela o adversário";
                case TipoPersonagem.Fogo: return "Fortalece o ataque";
                case TipoPersonagem.Natureza: return "Recupera 30 de vida";
                case TipoPersonagem.Ninja: return "Teleporte curto";
                case TipoPersonagem.NaoyaZenin: return "Avanço veloz e atordoa";
                case TipoPersonagem.GojoSatoru: return "Disparo Roxo";
                case TipoPersonagem.RyomenSukuna: return "Cortes em área";
                case TipoPersonagem.MegumiFushiguro: return "Invoca 1 sombra aleatória";
                default: return "Habilidade especial.";
            }
        }

        private void DesenharBarraVida(Graphics g, int bx, int by,
            int vida, Color cor, string nome)
        {
            using (Font f = new Font("Arial", 10, FontStyle.Bold))
                g.DrawString(nome + " " + vida + "/100",
                    f, Brushes.White, bx, by);

            using (Brush fundo = new SolidBrush(Color.DarkRed))
                g.FillRectangle(fundo, bx, by + 23, 220, 18);

            int largura = (int)(220 * vida / 100.0);

            if (largura > 0)
            {
                using (Brush b = new SolidBrush(cor))
                    g.FillRectangle(b, bx, by + 23, largura, 18);
            }

            g.DrawRectangle(Pens.White, bx, by + 23, 220, 18);
        }

        private void DesenharPersonagem(Graphics g, float px, float py,
            TipoPersonagem tipo, bool andandoLocal, int quadro,
            int direcao, int ataque, int congelado, bool fogoAtivo, int dashVisual)
        {
            int passo = andandoLocal ? quadro * 3 : 0;

            Color roupa, cabelo, pele = Color.PeachPuff;

            switch (tipo)
            {
                case TipoPersonagem.Gelo:
                    roupa = Color.DeepSkyBlue;
                    cabelo = Color.WhiteSmoke;
                    break;
                case TipoPersonagem.Fogo:
                    roupa = Color.Crimson;
                    cabelo = Color.DarkRed;
                    break;
                case TipoPersonagem.Natureza:
                    roupa = Color.ForestGreen;
                    cabelo = Color.SaddleBrown;
                    break;
                case TipoPersonagem.Ninja:
                    roupa = Color.MediumPurple;
                    cabelo = Color.Black;
                    pele = Color.SandyBrown;
                    break;
                case TipoPersonagem.GojoSatoru:
                    roupa = Color.FromArgb(25, 29, 42);
                    cabelo = Color.FromArgb(235, 239, 250);
                    pele = Color.PeachPuff;
                    break;
                case TipoPersonagem.RyomenSukuna:
                    roupa = Color.FromArgb(125, 35, 48);
                    cabelo = Color.FromArgb(220, 145, 155);
                    pele = Color.FromArgb(245, 205, 183);
                    break;
                case TipoPersonagem.MegumiFushiguro:
                    roupa = Color.FromArgb(25, 31, 50);
                    cabelo = Color.FromArgb(25, 25, 34);
                    pele = Color.FromArgb(238, 204, 181);
                    break;
                default: // Naoya Zenin: uniforme escuro e cabelo loiro-esverdeado.
                    roupa = Color.FromArgb(35, 38, 48);
                    cabelo = Color.FromArgb(190, 184, 112);
                    pele = Color.PeachPuff;
                    break;
            }

            g.FillEllipse(Brushes.DarkGreen, px + 3, py + 35, 26, 7);

            if (tipo == TipoPersonagem.NaoyaZenin && dashVisual > 0)
            {
                int pulsacao = (dashVisual % 3) * 2;
                using (Pen aura = new Pen(Color.FromArgb(170, 239, 220, 138), 2f))
                using (Pen auraInterna = new Pen(Color.FromArgb(110, 245, 245, 210), 1f))
                {
                    g.DrawEllipse(aura, px - 7 - pulsacao, py - 7 - pulsacao,
                        46 + pulsacao * 2, 54 + pulsacao * 2);
                    g.DrawEllipse(auraInterna, px - 3, py - 3, 38, 46);
                }
            }

            if (dashVisual > 0)
            {
                using (Pen rastro = new Pen(Color.FromArgb(190, Color.Khaki), 2f))
                {
                    for (int i = 0; i < 3; i++)
                    {
                        float desloc = i * 5;
                        if (direcao == 2)
                            g.DrawLine(rastro, px - 6 - desloc, py + 8 + i * 10, px - 22 - desloc, py + 8 + i * 10);
                        else if (direcao == 1)
                            g.DrawLine(rastro, px + 32 + desloc, py + 8 + i * 10, px + 48 + desloc, py + 8 + i * 10);
                        else if (direcao == 0)
                            g.DrawLine(rastro, px + 7 + i * 9, py - 5 - desloc, px + 7 + i * 9, py - 18 - desloc);
                        else
                            g.DrawLine(rastro, px + 7 + i * 9, py + 42 + desloc, px + 7 + i * 9, py + 55 + desloc);
                    }
                }
            }

            if (tipo == TipoPersonagem.NaoyaZenin && dashVisual > 0)
            {
                using (Pen corte = new Pen(Color.FromArgb(200, 246, 231, 166), 3f))
                {
                    if (direcao == 1 || direcao == 2)
                    {
                        int sinal = direcao == 2 ? -1 : 1;
                        g.DrawLine(corte, px + 8, py + 3, px + 8 + sinal * 31, py - 9);
                        g.DrawLine(corte, px + 8, py + 14, px + 8 + sinal * 37, py + 9);
                        g.DrawLine(corte, px + 8, py + 26, px + 8 + sinal * 27, py + 28);
                    }
                    else
                    {
                        g.DrawLine(corte, px + 2, py + 8, px - 10, py + 8 + (direcao == 0 ? 1 : -1) * 27);
                        g.DrawLine(corte, px + 15, py + 8, px + 15, py + 8 + (direcao == 0 ? 1 : -1) * 34);
                        g.DrawLine(corte, px + 27, py + 8, px + 39, py + 8 + (direcao == 0 ? 1 : -1) * 25);
                    }
                }
            }

            using (Brush b = new SolidBrush(cabelo))
            {
                g.FillRectangle(b, px + 6, py, 20, 10);
                g.FillRectangle(b, px + 3, py + 5, 26, 7);

                if (tipo == TipoPersonagem.GojoSatoru)
                {
                    g.FillPolygon(b, new Point[] {
                        new Point((int)px + 3, (int)py + 8),
                        new Point((int)px + 0, (int)py - 1),
                        new Point((int)px + 10, (int)py + 3),
                        new Point((int)px + 13, (int)py - 5),
                        new Point((int)px + 19, (int)py + 2),
                        new Point((int)px + 27, (int)py - 2),
                        new Point((int)px + 29, (int)py + 9)
                    });
                }
                else if (tipo == TipoPersonagem.RyomenSukuna)
                {
                    g.FillPolygon(b, new Point[] {
                        new Point((int)px + 3, (int)py + 8),
                        new Point((int)px + 1, (int)py - 2),
                        new Point((int)px + 10, (int)py + 2),
                        new Point((int)px + 15, (int)py - 3),
                        new Point((int)px + 22, (int)py + 2),
                        new Point((int)px + 28, (int)py - 1),
                        new Point((int)px + 29, (int)py + 9)
                    });
                }
                else if (tipo == TipoPersonagem.MegumiFushiguro)
                {
                    g.FillPolygon(b, new Point[] {
                        new Point((int)px + 3, (int)py + 9),
                        new Point((int)px - 1, (int)py - 4),
                        new Point((int)px + 7, (int)py + 1),
                        new Point((int)px + 10, (int)py - 10),
                        new Point((int)px + 15, (int)py + 1),
                        new Point((int)px + 21, (int)py - 7),
                        new Point((int)px + 23, (int)py + 2),
                        new Point((int)px + 31, (int)py - 3),
                        new Point((int)px + 28, (int)py + 10)
                    });
                }
            }

            using (Brush b = new SolidBrush(pele))
            {
                g.FillRectangle(b, px + 7, py + 8, 18, 13);
                g.FillRectangle(b, px, py + 22 + passo, 4, 8);
                g.FillRectangle(b, px + 28, py + 22 + (3 - passo), 4, 8);
            }

            if (direcao != 3)
            {
                g.FillRectangle(Brushes.Black, px + 10, py + 12, 3, 3);
                g.FillRectangle(Brushes.Black, px + 19, py + 12, 3, 3);
            }

            if (tipo == TipoPersonagem.MegumiFushiguro)
            {
                // Olhos escuros e gola alta do uniforme de Megumi.
                using (Brush gola = new SolidBrush(Color.FromArgb(10, 13, 24)))
                    g.FillRectangle(gola, px + 7, py + 19, 18, 5);
            }
            else if (tipo == TipoPersonagem.GojoSatoru)
            {
                // Faixa escura sobre os olhos, marca visual do Gojo nesta versão pixel-art.
                using (Brush venda = new SolidBrush(Color.FromArgb(18, 20, 27)))
                    g.FillRectangle(venda, px + 5, py + 10, 22, 5);
                using (Pen brilho = new Pen(Color.FromArgb(100, 120, 185, 255), 1f))
                    g.DrawLine(brilho, px + 6, py + 11, px + 26, py + 11);
            }
            else if (tipo == TipoPersonagem.RyomenSukuna)
            {
                using (Pen marca = new Pen(Color.FromArgb(190, 45, 20, 28), 2f))
                {
                    g.DrawLine(marca, px + 8, py + 10, px + 13, py + 15);
                    g.DrawLine(marca, px + 13, py + 10, px + 8, py + 15);
                    g.DrawLine(marca, px + 20, py + 10, px + 25, py + 15);
                    g.DrawLine(marca, px + 25, py + 10, px + 20, py + 15);
                    g.DrawLine(marca, px + 13, py + 19, px + 21, py + 19);
                }
            }

            using (Brush b = new SolidBrush(roupa))
                g.FillRectangle(b, px + 4, py + 21, 24, 12);

            using (Brush b = new SolidBrush(Color.DarkSlateBlue))
            {
                g.FillRectangle(b, px + 7, py + 33, 7, 7 - passo);
                g.FillRectangle(b, px + 18, py + 33, 7, 4 + passo);
            }

            g.FillRectangle(Brushes.SaddleBrown, px + 6, py + 38, 8, 4);
            g.FillRectangle(Brushes.SaddleBrown, px + 18, py + 38, 8, 4);

            // O bastão pertence ao estilo dos personagens originais; Gojo e Sukuna
            // lutam sem arma nesta versão inspirada no anime.
            if (tipo != TipoPersonagem.GojoSatoru && tipo != TipoPersonagem.RyomenSukuna &&
                tipo != TipoPersonagem.MegumiFushiguro)
            {
                int comprimento = ataque > 0 ? 34 : 22;

                using (Pen bastao = new Pen(Color.SaddleBrown, 5))
                {
                    bastao.StartCap = LineCap.Round;
                    bastao.EndCap = LineCap.Round;

                    float cx = px + 16;
                    float cy = py + 25;

                    if (direcao == 0)
                        g.DrawLine(bastao, cx + 9, cy, cx + 9, cy + comprimento);
                    else if (direcao == 3)
                        g.DrawLine(bastao, cx - 9, cy, cx - 9, cy - comprimento);
                    else if (direcao == 1)
                        g.DrawLine(bastao, cx, cy + 5, cx - comprimento, cy + 5);
                    else
                        g.DrawLine(bastao, cx, cy + 5, cx + comprimento, cy + 5);
                }
            }

            if (congelado > 0)
            {
                using (Pen p = new Pen(Color.Cyan, 3))
                {
                    g.DrawRectangle(p, px - 4, py - 4, 40, 49);
                    g.DrawLine(p, px, py + 5, px + 28, py + 35);
                    g.DrawLine(p, px + 28, py + 5, px, py + 35);
                }
            }

            if (fogoAtivo)
            {
                using (Pen p = new Pen(Color.OrangeRed, 3))
                    g.DrawRectangle(p, px - 3, py - 3, 38, 46);
            }
        }

        private void DesenharTelaVitoria(Graphics g)
        {
            using (Brush b = new SolidBrush(Color.FromArgb(200, 0, 0, 0)))
                g.FillRectangle(b, ClientRectangle);

            using (Font f = new Font("Arial", 32, FontStyle.Bold))
            {
                SizeF tamanho = g.MeasureString(vencedor, f);

                g.DrawString(vencedor, f, Brushes.Gold,
                    (ClientSize.Width - tamanho.Width) / 2,
                    (ClientSize.Height - tamanho.Height) / 2);
            }
        }

        protected override void OnFormClosed(FormClosedEventArgs e)
        {
            timerJogo.Stop();
            timerJogo.Dispose();
            base.OnFormClosed(e);
        }
        // Ponte entre a lógica original do WinForms e o loop do Blazor.
        public override void StepFrame() => timerJogo.Fire();

    }
}
