
using System;
using System.Collections.Generic;
using System.Drawing;



namespace movimento
{
    public partial class Form4 : Form
    {
        private int ObterCooldownPoder(TipoPersonagem tipo)
        {
            switch (tipo)
            {
                case TipoPersonagem.Gelo:
                    return 190; // Aproximadamente 5 segundos

                case TipoPersonagem.Fogo:
                    return 100; // Aproximadamente 3 segundos

                case TipoPersonagem.Natureza:
                    return 200; // Aproximadamente 6 segundos

                case TipoPersonagem.Ninja:
                    return 40; // Aproximadamente 1,5 segundos

                default:
                    return 100;
            }
        }

        private readonly GameTimer timerJogo;
        private readonly HashSet<Keys> teclas = new HashSet<Keys>();

        private enum TipoPersonagem
        {
            Gelo, Fogo, Natureza, Ninja
        }

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

        private bool ataqueFogo1 = false, ataqueFogo2 = false;

        private bool combateTerminado = false;
        private string vencedor = "";

        private const float Velocidade = 4f;
        private const int Dano = 10;
        private const float Alcance = 65f;

        public Form4()
        {
            InitializeComponent();

            Text = "Meu RPG 2D - Combate";
            ClientSize = new Size(1000, 650);
            StartPosition = FormStartPosition.CenterScreen;
            KeyPreview = true;
            DoubleBuffered = true;

            KeyDown += Form4_KeyDown;
            KeyUp += Form4_KeyUp;

            timerJogo = new GameTimer();
            timerJogo.Interval = 30;
            timerJogo.Tick += TimerJogo_Tick;
            timerJogo.Start();
        }

        private void Form4_Load(object sender, EventArgs e) { }

        private void Form4_KeyDown(object sender, KeyEventArgs e)
        {
            if (!teclas.Add(e.KeyCode))
                return;

            // Na tela inicial, as teclas servem para escolher os personagens.
            if (telaSelecao)
            {
                if (!confirmado1)
                {
                    if (e.KeyCode == Keys.A)
                        escolha1 = (escolha1 + 3) % 4;
                    else if (e.KeyCode == Keys.D)
                        escolha1 = (escolha1 + 1) % 4;
                    else if (e.KeyCode == Keys.F)
                        confirmado1 = true;
                }

                if (!confirmado2)
                {
                    if (e.KeyCode == Keys.Left)
                        escolha2 = (escolha2 + 3) % 4;
                    else if (e.KeyCode == Keys.Right)
                        escolha2 = (escolha2 + 1) % 4;
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

            // Controles normais durante a batalha.
            if (e.KeyCode == Keys.F) Atacar(1);
            if (e.KeyCode == Keys.Enter) Atacar(2);
            if (e.KeyCode == Keys.Q) UsarPoder(1);

            if (e.KeyCode == Keys.ShiftKey)
                UsarPoder(2);
        }

        private void Form4_KeyUp(object sender, KeyEventArgs e)
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
            float tx = jogador == 1 ? x2 : x;
            float ty = jogador == 1 ? y2 : y;

            float dx = tx - ax;
            float dy = ty - ay;

            if (Math.Sqrt(dx * dx + dy * dy) > Alcance)
                return;

            int dir = jogador == 1 ? direcao1 : direcao2;

            bool frente =
                (dir == 0 && dy > 0 && Math.Abs(dy) >= Math.Abs(dx)) ||
                (dir == 3 && dy < 0 && Math.Abs(dy) >= Math.Abs(dx)) ||
                (dir == 1 && dx < 0 && Math.Abs(dx) >= Math.Abs(dy)) ||
                (dir == 2 && dx > 0 && Math.Abs(dx) >= Math.Abs(dy));

            if (!frente) return;

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
            }

            if (jogador == 1)
                cooldownPoder1 = ObterCooldownPoder(personagem1);
            else
                cooldownPoder2 = ObterCooldownPoder(personagem2);

            Invalidate();
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

            if (combateTerminado)
            {
                Invalidate();
                return;
            }

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
                DesenharTelaSelecao(g);
                return;
            }

            g.SmoothingMode = SmoothingMode.None;
            g.Clear(Color.FromArgb(95, 155, 85));

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
                andando, quadroAnimacao, direcao1, ataque1, congelado1, ataqueFogo1);

            DesenharPersonagem(g, x2, y2, personagem2,
                andando2, quadroAnimacao2, direcao2, ataque2, congelado2, ataqueFogo2);

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
        }

        private void DesenharTelaSelecao(Graphics g)
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.Clear(Color.FromArgb(18, 22, 38));

            // Faixas decorativas no fundo.
            using (Brush faixa1 = new SolidBrush(Color.FromArgb(30, 35, 80, 150)))
                g.FillRectangle(faixa1, 0, 0, ClientSize.Width / 2, ClientSize.Height);
            using (Brush faixa2 = new SolidBrush(Color.FromArgb(30, 150, 35, 60)))
                g.FillRectangle(faixa2, ClientSize.Width / 2, 0,
                    ClientSize.Width / 2, ClientSize.Height);

            using (Font titulo = new Font("Arial", 25, FontStyle.Bold))
            using (Font subtitulo = new Font("Arial", 10, FontStyle.Regular))
            using (Brush branco = new SolidBrush(Color.White))
            using (Brush dourado = new SolidBrush(Color.Gold))
            {
                string textoTitulo = "ESCOLHA SEU PERSONAGEM";
                SizeF tamanho = g.MeasureString(textoTitulo, titulo);
                g.DrawString(textoTitulo, titulo, dourado,
                    (ClientSize.Width - tamanho.Width) / 2, 18);

                string subt = "Cada jogador deve selecionar e confirmar um personagem para iniciar a batalha.";
                tamanho = g.MeasureString(subt, subtitulo);
                g.DrawString(subt, subtitulo, branco,
                    (ClientSize.Width - tamanho.Width) / 2, 58);

                using (Font jogador = new Font("Arial", 14, FontStyle.Bold))
                {
                    g.DrawString("JOGADOR 1", jogador, Brushes.DeepSkyBlue, 30, 91);
                    g.DrawString("JOGADOR 2", jogador, Brushes.LightCoral, 515, 91);
                }
            }

            DesenharCartoesSelecao(g, 30, escolha1, confirmado1, true);
            DesenharCartoesSelecao(g, 515, escolha2, confirmado2, false);

            using (Font instrucoes = new Font("Arial", 10, FontStyle.Bold))
            using (Font rodape = new Font("Arial", 9, FontStyle.Regular))
            {
                g.DrawString("A / D: trocar personagem     F: confirmar",
                    instrucoes, Brushes.DeepSkyBlue, 30, 455);
                g.DrawString("← / →: trocar personagem     ENTER: confirmar",
                    instrucoes, Brushes.LightCoral, 515, 455);

                string status1 = confirmado1 ? "Jogador 1: escolha confirmada!" : "Jogador 1: escolha seu personagem";
                string status2 = confirmado2 ? "Jogador 2: escolha confirmada!" : "Jogador 2: escolha seu personagem";
                g.DrawString(status1, rodape, confirmado1 ? Brushes.LightGreen : Brushes.White, 30, 490);
                g.DrawString(status2, rodape, confirmado2 ? Brushes.LightGreen : Brushes.White, 515, 490);

                string aviso = confirmado1 && confirmado2
                    ? "Preparando a batalha..."
                    : "A batalha começa quando os dois jogadores confirmarem.";
                SizeF tamanho = g.MeasureString(aviso, rodape);
                g.DrawString(aviso, rodape, Brushes.Gold,
                    (ClientSize.Width - tamanho.Width) / 2, 555);
            }
        }

        private void DesenharCartoesSelecao(Graphics g, int inicioX, int escolha,
            bool confirmado, bool jogador1)
        {
            TipoPersonagem[] tipos = new TipoPersonagem[]
            {
                TipoPersonagem.Gelo,
                TipoPersonagem.Fogo,
                TipoPersonagem.Natureza,
                TipoPersonagem.Ninja
            };

            for (int i = 0; i < tipos.Length; i++)
            {
                int coluna = i % 2;
                int linha = i / 2;
                Rectangle cartao = new Rectangle(inicioX + coluna * 225, 125 + linha * 155, 210, 140);
                Color cor = CorPersonagem(tipos[i]);
                bool selecionado = escolha == i;

                using (Brush fundo = new SolidBrush(selecionado
                    ? Color.FromArgb(100, cor)
                    : Color.FromArgb(45, 255, 255, 255)))
                    g.FillRectangle(fundo, cartao);

                using (Pen borda = new Pen(selecionado
                    ? (confirmado ? Color.LimeGreen : Color.White)
                    : Color.FromArgb(90, 180, 190, 210), selecionado ? 3 : 1))
                    g.DrawRectangle(borda, cartao);

                using (Brush simbolo = new SolidBrush(cor))
                    g.FillEllipse(simbolo, cartao.X + 14, cartao.Y + 13, 34, 34);

                using (Font inicial = new Font("Arial", 15, FontStyle.Bold))
                using (Font nome = new Font("Arial", 12, FontStyle.Bold))
                using (Font descricao = new Font("Arial", 9, FontStyle.Regular))
                {
                    string letra = tipos[i] == TipoPersonagem.Gelo ? "G" :
                                   tipos[i] == TipoPersonagem.Fogo ? "F" :
                                   tipos[i] == TipoPersonagem.Natureza ? "N" : "X";
                    SizeF tamLetra = g.MeasureString(letra, inicial);
                    g.DrawString(letra, inicial, Brushes.White,
                        cartao.X + 31 - tamLetra.Width / 2, cartao.Y + 18);
                    g.DrawString(NomePersonagem(tipos[i]), nome, Brushes.White,
                        cartao.X + 58, cartao.Y + 20);
                    g.DrawString(DescricaoPersonagem(tipos[i]), descricao,
                        Brushes.WhiteSmoke, new RectangleF(cartao.X + 14, cartao.Y + 58, 185, 40));

                    if (selecionado)
                    {
                        string legenda = confirmado ? "CONFIRMADO" : "SELECIONADO";
                        using (Brush destaque = new SolidBrush(confirmado ? Color.LimeGreen : Color.Gold))
                            g.DrawString(legenda, descricao, destaque, cartao.X + 14, cartao.Y + 112);
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
                default: return Color.MediumPurple;
            }
        }

        private string NomePersonagem(TipoPersonagem tipo)
        {
            switch (tipo)
            {
                case TipoPersonagem.Gelo: return "Gelo";
                case TipoPersonagem.Fogo: return "Fogo";
                case TipoPersonagem.Natureza: return "Natureza";
                default: return "Ninja";
            }
        }

        private string DescricaoPersonagem(TipoPersonagem tipo)
        {
            switch (tipo)
            {
                case TipoPersonagem.Gelo: return "Poder: congela o adversário.";
                case TipoPersonagem.Fogo: return "Poder: fortalece o próximo ataque.";
                case TipoPersonagem.Natureza: return "Poder: recupera 30 pontos de vida.";
                default: return "Poder: teletransporta para perto do rival.";
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
            int direcao, int ataque, int congelado, bool fogoAtivo)
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
                default:
                    roupa = Color.MediumPurple;
                    cabelo = Color.Black;
                    pele = Color.SandyBrown;
                    break;
            }

            g.FillEllipse(Brushes.DarkGreen, px + 3, py + 35, 26, 7);

            using (Brush b = new SolidBrush(cabelo))
            {
                g.FillRectangle(b, px + 6, py, 20, 10);
                g.FillRectangle(b, px + 3, py + 5, 26, 7);
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

            using (Brush b = new SolidBrush(roupa))
                g.FillRectangle(b, px + 4, py + 21, 24, 12);

            using (Brush b = new SolidBrush(Color.DarkSlateBlue))
            {
                g.FillRectangle(b, px + 7, py + 33, 7, 7 - passo);
                g.FillRectangle(b, px + 18, py + 33, 7, 4 + passo);
            }

            g.FillRectangle(Brushes.SaddleBrown, px + 6, py + 38, 8, 4);
            g.FillRectangle(Brushes.SaddleBrown, px + 18, py + 38, 8, 4);

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
