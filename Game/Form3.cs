using System;
using System.Collections.Generic;
using System.Drawing;


namespace movimento
{
    public partial class Form3 : Form
    {
        private readonly GameTimer timerJogo;
        private readonly HashSet<Keys> teclas = new HashSet<Keys>();

        // JOGADOR 1
        private float x = 100;
        private float y = 100;
        private int vida1 = 100;
        private int direcao1 = 2;
        private int quadroAnimacao = 0;
        private int contadorAnimacao = 0;
        private bool andando = false;

        // JOGADOR 2
        private float x2 = 200;
        private float y2 = 100;
        private int vida2 = 100;
        private int direcao2 = 1;
        private int quadroAnimacao2 = 0;
        private int contadorAnimacao2 = 0;
        private bool andando2 = false;

        // COMBATE
        private int cooldown1 = 0;
        private int cooldown2 = 0;
        private int ataque1 = 0;
        private int ataque2 = 0;

        private const float Velocidade = 4f;
        private const int Dano = 10;
        private const int Alcance = 65;
        private bool combateTerminado = false;
        private string vencedor = "";

        public Form3()
        {
            InitializeComponent();

            Text = "Meu RPG 2D - Combate";
            ClientSize = new Size(1000, 650);
            StartPosition = FormStartPosition.CenterScreen;
            KeyPreview = true;
            DoubleBuffered = true;

            KeyDown += Form3_KeyDown;
            KeyUp += Form3_KeyUp;

            timerJogo = new GameTimer();
            timerJogo.Interval = 30;
            timerJogo.Tick += TimerJogo_Tick;
            timerJogo.Start();
        }

        private void Form3_Load(object sender, EventArgs e)
        {
        }

        private void Form3_KeyDown(object sender, KeyEventArgs e)
        {
            teclas.Add(e.KeyCode);

            if (e.KeyCode == Keys.F)
                Atacar(1);

            if (e.KeyCode == Keys.Enter)
                Atacar(2);

            if (e.KeyCode == Keys.F || e.KeyCode == Keys.Enter)
                e.Handled = true;
        }

        private void Form3_KeyUp(object sender, KeyEventArgs e)
        {
            teclas.Remove(e.KeyCode);
        }

        private void Atacar(int jogador)
        {
            if (combateTerminado)
                return;

            if (jogador == 1 && cooldown1 > 0)
                return;

            if (jogador == 2 && cooldown2 > 0)
                return;

            float atacanteX = jogador == 1 ? x : x2;
            float atacanteY = jogador == 1 ? y : y2;

            float alvoX = jogador == 1 ? x2 : x;
            float alvoY = jogador == 1 ? y2 : y;

            float diferencaX = alvoX - atacanteX;
            float diferencaY = alvoY - atacanteY;

            double distancia = Math.Sqrt(
                diferencaX * diferencaX +
                diferencaY * diferencaY);

            // O ataque só acerta se o adversário estiver perto.
            if (distancia > Alcance)
                return;

            // Impede acertar através das costas:
            // o jogador precisa estar virado para o adversário.
            int direcao = jogador == 1 ? direcao1 : direcao2;

            bool estaNaFrente =
                (direcao == 0 && diferencaY > 0 &&
                    Math.Abs(diferencaY) >= Math.Abs(diferencaX)) ||
                (direcao == 3 && diferencaY < 0 &&
                    Math.Abs(diferencaY) >= Math.Abs(diferencaX)) ||
                (direcao == 1 && diferencaX < 0 &&
                    Math.Abs(diferencaX) >= Math.Abs(diferencaY)) ||
                (direcao == 2 && diferencaX > 0 &&
                    Math.Abs(diferencaX) >= Math.Abs(diferencaY));

            if (!estaNaFrente)
                return;

            if (jogador == 1)
            {
                vida2 = Math.Max(0, vida2 - Dano);
                cooldown1 = 15;
                ataque1 = 7;
            }
            else
            {
                vida1 = Math.Max(0, vida1 - Dano);
                cooldown2 = 15;
                ataque2 = 7;
            }

            if (vida1 <= 0)
            {
                combateTerminado = true;
                vencedor = "Jogador 2 venceu!";
            }
            else if (vida2 <= 0)
            {
                combateTerminado = true;
                vencedor = "Jogador 1 venceu!";
            }

            Invalidate();
        }

        private void TimerJogo_Tick(object sender, EventArgs e)
        {
            if (cooldown1 > 0) cooldown1--;
            if (cooldown2 > 0) cooldown2--;
            if (ataque1 > 0) ataque1--;
            if (ataque2 > 0) ataque2--;

            if (combateTerminado)
            {
                Invalidate();
                return;
            }

            // JOGADOR 1: WASD
            int dx = 0;
            int dy = 0;

            if (teclas.Contains(Keys.A)) dx--;
            if (teclas.Contains(Keys.D)) dx++;
            if (teclas.Contains(Keys.W)) dy--;
            if (teclas.Contains(Keys.S)) dy++;

            andando = dx != 0 || dy != 0;

            if (andando)
            {
                float distancia =
                    (float)Math.Sqrt(dx * dx + dy * dy);

                x += dx / distancia * Velocidade;
                y += dy / distancia * Velocidade;

                if (Math.Abs(dx) >= Math.Abs(dy))
                    direcao1 = dx < 0 ? 1 : 2;
                else
                    direcao1 = dy < 0 ? 3 : 0;

                contadorAnimacao++;

                if (contadorAnimacao >= 4)
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

            // JOGADOR 2: SETAS
            int dx2 = 0;
            int dy2 = 0;

            if (teclas.Contains(Keys.Left)) dx2--;
            if (teclas.Contains(Keys.Right)) dx2++;
            if (teclas.Contains(Keys.Up)) dy2--;
            if (teclas.Contains(Keys.Down)) dy2++;

            andando2 = dx2 != 0 || dy2 != 0;

            if (andando2)
            {
                float distancia2 =
                    (float)Math.Sqrt(dx2 * dx2 + dy2 * dy2);

                x2 += dx2 / distancia2 * Velocidade;
                y2 += dy2 / distancia2 * Velocidade;

                if (Math.Abs(dx2) >= Math.Abs(dy2))
                    direcao2 = dx2 < 0 ? 1 : 2;
                else
                    direcao2 = dy2 < 0 ? 3 : 0;

                contadorAnimacao2++;

                if (contadorAnimacao2 >= 4)
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

            // Limites da tela
            x = Math.Max(0, Math.Min(x, ClientSize.Width - 32));
            y = Math.Max(35, Math.Min(y, ClientSize.Height - 44));

            x2 = Math.Max(0, Math.Min(x2, ClientSize.Width - 32));
            y2 = Math.Max(35, Math.Min(y2, ClientSize.Height - 44));

            Invalidate();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);

            Graphics g = e.Graphics;
            g.Clear(Color.FromArgb(95, 155, 85));

            // Grade do cenário
            using (Pen grade = new Pen(Color.FromArgb(80, 130, 70)))
            {
                for (int i = 0; i < ClientSize.Width; i += 32)
                    g.DrawLine(grade, i, 0, i, ClientSize.Height);

                for (int i = 0; i < ClientSize.Height; i += 32)
                    g.DrawLine(grade, 0, i, ClientSize.Width, i);
            }

            // Barras de vida
            DesenharBarraVida(g, 20, 20, vida1, Color.DodgerBlue, "JOGADOR 1");
            DesenharBarraVida(g, ClientSize.Width - 240, 20, vida2, Color.Crimson, "JOGADOR 2");

            DesenharPersonagem(g, x, y, Color.RoyalBlue,
                Color.Brown, Color.PeachPuff,
                andando, quadroAnimacao, direcao1, ataque1);

            DesenharPersonagem(g, x2, y2, Color.Crimson,
                Color.Black, Color.SandyBrown,
                andando2, quadroAnimacao2, direcao2, ataque2);

            using (Font fonte = new Font("Arial", 11, FontStyle.Bold))
            {
                g.DrawString("WASD + F: mover e atacar",
                    fonte, Brushes.White, 20, 65);

                g.DrawString("Setas + ENTER: mover e atacar",
                    fonte, Brushes.White, ClientSize.Width - 270, 65);
            }

            if (combateTerminado)
            {
                using (Brush fundo = new SolidBrush(
                    Color.FromArgb(190, 0, 0, 0)))
                {
                    g.FillRectangle(fundo, ClientRectangle);
                }

                using (Font fonte = new Font("Arial", 32, FontStyle.Bold))
                {
                    SizeF tamanho = g.MeasureString(vencedor, fonte);

                    g.DrawString(vencedor, fonte, Brushes.Gold,
                        (ClientSize.Width - tamanho.Width) / 2,
                        (ClientSize.Height - tamanho.Height) / 2);
                }

                using (Font fonte = new Font("Arial", 14))
                {
                    string mensagem = "Feche e abra o jogo novamente para jogar outra partida.";
                    SizeF tamanho = g.MeasureString(mensagem, fonte);

                    g.DrawString(mensagem, fonte, Brushes.White,
                        (ClientSize.Width - tamanho.Width) / 2,
                        ClientSize.Height / 2 + 45);
                }
            }
        }

        private void DesenharBarraVida(
            Graphics g, int bx, int by, int vida,
            Color cor, string nome)
        {
            using (Font fonte = new Font("Arial", 12, FontStyle.Bold))
            {
                g.DrawString(nome + "  " + vida + "/100",
                    fonte, Brushes.White, bx, by);
            }

            using (Brush fundo = new SolidBrush(Color.DarkRed))
                g.FillRectangle(fundo, bx, by + 23, 220, 18);

            int largura = (int)(220 * vida / 100.0);

            if (largura > 0)
            {
                using (Brush preenchimento = new SolidBrush(cor))
                    g.FillRectangle(preenchimento, bx, by + 23, largura, 18);
            }

            g.DrawRectangle(Pens.White, bx, by + 23, 220, 18);
        }

        private void DesenharPersonagem(
            Graphics g, float px, float py,
            Color roupaCor, Color cabeloCor, Color peleCor,
            bool andandoLocal, int quadro, int direcao, int ataque)
        {
            int passo = andandoLocal ? quadro * 3 : 0;

            g.FillEllipse(Brushes.DarkGreen, px + 3, py + 35, 26, 7);

            using (Brush cabelo = new SolidBrush(cabeloCor))
            {
                g.FillRectangle(cabelo, px + 6, py, 20, 10);
                g.FillRectangle(cabelo, px + 3, py + 5, 26, 7);
            }

            using (Brush pele = new SolidBrush(peleCor))
            {
                g.FillRectangle(pele, px + 7, py + 8, 18, 13);
            }

            if (direcao != 3)
            {
                g.FillRectangle(Brushes.Black, px + 10, py + 12, 3, 3);
                g.FillRectangle(Brushes.Black, px + 19, py + 12, 3, 3);
            }

            using (Brush roupa = new SolidBrush(roupaCor))
            {
                g.FillRectangle(roupa, px + 4, py + 21, 24, 12);
            }

            using (Brush pele = new SolidBrush(peleCor))
            {
                g.FillRectangle(pele, px, py + 22 + passo, 4, 8);
                g.FillRectangle(pele, px + 28, py + 22 + (3 - passo), 4, 8);
            }

            using (Brush calca = new SolidBrush(Color.DarkBlue))
            {
                g.FillRectangle(calca, px + 7, py + 33, 7, 7 - passo);
                g.FillRectangle(calca, px + 18, py + 33, 7, 4 + passo);
            }

            g.FillRectangle(Brushes.SaddleBrown, px + 6, py + 38, 8, 4);
            g.FillRectangle(Brushes.SaddleBrown, px + 18, py + 38, 8, 4);

            // Bastão na mão. Durante o ataque, ele se estende.
            int comprimento = ataque > 0 ? 34 : 22;

            using (Pen bastao = new Pen(Color.SaddleBrown, 5))
            {
                bastao.StartCap = LineCap.Round;
                bastao.EndCap = LineCap.Round;

                float centroX = px + 16;
                float centroY = py + 25;

                if (direcao == 0) // baixo
                {
                    g.DrawLine(bastao, centroX + 9, centroY,
                        centroX + 9, centroY + comprimento);
                }
                else if (direcao == 3) // cima
                {
                    g.DrawLine(bastao, centroX - 9, centroY,
                        centroX - 9, centroY - comprimento);
                }
                else if (direcao == 1) // esquerda
                {
                    g.DrawLine(bastao, centroX, centroY + 5,
                        centroX - comprimento, centroY + 5);
                }
                else // direita
                {
                    g.DrawLine(bastao, centroX, centroY + 5,
                        centroX + comprimento, centroY + 5);
                }
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