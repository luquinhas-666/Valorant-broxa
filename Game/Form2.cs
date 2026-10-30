using System;
using System.Collections.Generic;
using System.Drawing;


namespace movimento
{
    public partial class Form2 : Form
    {
        private readonly GameTimer timerJogo;
        private readonly HashSet<Keys> teclas;

        private float x = 100;
        private float y = 100;

        private const float Velocidade = 4f;

        private int quadroAnimacao = 0;
        private int contadorAnimacao = 0;

        private bool andando = false;

        public Form2()
        {
            InitializeComponent();

            // Configura a janela
            this.Text = "Meu RPG 2D";
            this.ClientSize = new Size(1000, 650);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.KeyPreview = true;
            this.DoubleBuffered = true;

            teclas = new HashSet<Keys>();

            // Eventos do teclado
            this.KeyDown += Form2_KeyDown;
            this.KeyUp += Form2_KeyUp;

            // Timer do jogo
            timerJogo = new GameTimer();
            timerJogo.Interval = 30;
            timerJogo.Tick += TimerJogo_Tick;
            timerJogo.Start();
        }

        private void Form2_Load(object sender, EventArgs e)
        {
            // Inicialização opcional do formulário
        }

        private void Form2_KeyDown(object sender, KeyEventArgs e)
        {
            teclas.Add(e.KeyCode);
        }

        private void Form2_KeyUp(object sender, KeyEventArgs e)
        {
            teclas.Remove(e.KeyCode);
        }

        private void TimerJogo_Tick(object sender, EventArgs e)
        {
            int dx = 0;
            int dy = 0;

            if (teclas.Contains(Keys.A) ||
                teclas.Contains(Keys.Left))
            {
                dx--;
            }

            if (teclas.Contains(Keys.D) ||
                teclas.Contains(Keys.Right))
            {
                dx++;
            }

            if (teclas.Contains(Keys.W) ||
                teclas.Contains(Keys.Up))
            {
                dy--;
            }

            if (teclas.Contains(Keys.S) ||
                teclas.Contains(Keys.Down))
            {
                dy++;
            }

            andando = dx != 0 || dy != 0;

            if (andando)
            {
                // Mantém a mesma velocidade na diagonal
                float distancia =
                    (float)Math.Sqrt(dx * dx + dy * dy);

                x += dx / distancia * Velocidade;
                y += dy / distancia * Velocidade;

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

            // Limita o personagem à área visível
            x = Math.Max(0, Math.Min(x, ClientSize.Width - 32));
            y = Math.Max(0, Math.Min(y, ClientSize.Height - 44));

            Invalidate();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);

            Graphics g = e.Graphics;

            // Fundo verde
            g.Clear(Color.FromArgb(95, 155, 85));

            // Grade do cenário
            using (Pen caneta = new Pen(
                Color.FromArgb(80, 130, 70)))
            {
                for (int i = 0; i < ClientSize.Width; i += 32)
                {
                    g.DrawLine(
                        caneta, i, 0, i, ClientSize.Height);
                }

                for (int i = 0; i < ClientSize.Height; i += 32)
                {
                    g.DrawLine(
                        caneta, 0, i, ClientSize.Width, i);
                }
            }

            DesenharPersonagem(g);

            using (Font fonte = new Font("Arial", 11))
            {
                g.DrawString(
                    "",
                    fonte,
                    Brushes.White,
                    10, 10);
            }
        }

        private void DesenharPersonagem(Graphics g)
        {
            int passo = andando ? quadroAnimacao * 3 : 0;

            // Sombra
            g.FillEllipse(
                Brushes.DarkGreen,
                x + 3, y + 35, 26, 7);

            // Cabelo
            using (Brush cabelo =
                new SolidBrush(Color.Brown))
            {
                g.FillRectangle(cabelo, x + 6, y, 20, 15);
                g.FillRectangle(cabelo, x + 3, y + 5, 26, 7);
            }

            // Rosto
            using (Brush pele =
                new SolidBrush(Color.PeachPuff))
            {
                g.FillRectangle(pele, x + 7, y + 8, 18, 13);

                // Braços animados
                g.FillRectangle(
                    pele, x, y + 22 + passo, 4, 8);

                g.FillRectangle(
                    pele, x + 28, y + 22 + (3 - passo), 4, 8);
            }

            // Olhos
            g.FillRectangle(Brushes.Black, x + 10, y + 12, 3, 3);
            g.FillRectangle(Brushes.Black, x + 19, y + 12, 3, 3);

            // Roupa
            using (Brush roupa =
                new SolidBrush(Color.RoyalBlue))
            {
                g.FillRectangle(roupa, x + 4, y + 21, 24, 12);
            }

            // Pernas animadas
            using (Brush calca =
                new SolidBrush(Color.DarkBlue))
            {
                g.FillRectangle(
                    calca, x + 7, y + 33, 7, 7 - passo);

                g.FillRectangle(
                    calca, x + 18, y + 33, 7, 4 + passo);
            }

            // Botas
            g.FillRectangle(
                Brushes.SaddleBrown, x + 6, y + 38, 8, 4);

            g.FillRectangle(
                Brushes.SaddleBrown, x + 18, y + 38, 8, 4);
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