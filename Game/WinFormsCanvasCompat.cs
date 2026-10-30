using System;
using System.Collections.Generic;
using System.Drawing;

namespace movimento;

// Compatibilidade mínima para reutilizar as regras e desenhos do jogo original
// em Blazor WebAssembly, sem System.Windows.Forms e sem System.Drawing.Common.
// As operações de desenho são enviadas ao Canvas 2D do navegador.

public enum Keys { A, D, W, S, F, Q, Left, Right, Up, Down, Enter, ShiftKey }
public enum FormStartPosition { CenterScreen }
public enum SmoothingMode { None, AntiAlias }
public enum FontStyle { Regular, Bold }
public enum LineCap { Flat, Round, Square }
public enum StringAlignment { Near, Center, Far }
public enum StringTrimming { None, EllipsisCharacter }
[Flags] public enum StringFormatFlags { None = 0, NoWrap = 1 }

public sealed class KeyEventArgs(Keys key) : EventArgs
{
    public Keys KeyCode { get; } = key;
    public bool Handled { get; set; }
}

public sealed class PaintEventArgs(Graphics graphics) : EventArgs
{
    public Graphics Graphics { get; } = graphics;
}

public sealed class FormClosedEventArgs : EventArgs { }

public abstract class Form : IDisposable
{
    public string Text { get; set; } = "";
    public Size ClientSize { get; set; } = new(1000, 650);
    public Rectangle ClientRectangle => new(0, 0, ClientSize.Width, ClientSize.Height);
    public FormStartPosition StartPosition { get; set; }
    public bool KeyPreview { get; set; }
    public bool DoubleBuffered { get; set; }

    public event EventHandler<KeyEventArgs>? KeyDown;
    public event EventHandler<KeyEventArgs>? KeyUp;

    protected void InitializeComponent() { }
    protected void Invalidate() { } // Renderização é dirigida pelo loop Blazor
    protected virtual void OnPaint(PaintEventArgs e) { }
    protected virtual void OnFormClosed(FormClosedEventArgs e) { }

    public void Press(Keys key) => KeyDown?.Invoke(this, new KeyEventArgs(key));
    public void Release(Keys key) => KeyUp?.Invoke(this, new KeyEventArgs(key));
    public abstract void StepFrame();
    public IReadOnlyList<DrawCommand> RenderFrame()
    {
        var surface = new Graphics();
        OnPaint(new PaintEventArgs(surface));
        return surface.Commands;
    }

    public void Dispose()
    {
        OnFormClosed(new FormClosedEventArgs());
        GC.SuppressFinalize(this);
    }
}

public sealed class GameTimer : IDisposable
{
    public int Interval { get; set; } = 30;
    public event EventHandler? Tick;
    private bool _running;
    public void Start() => _running = true;
    public void Stop() => _running = false;
    public void Fire()
    {
        if (_running)
            Tick?.Invoke(this, EventArgs.Empty);
    }
    public void Dispose() { _running = false; Tick = null; }
}

public class Brush(Color color) : IDisposable
{
    public Color Color { get; } = color;
    public void Dispose() { }
}

public sealed class SolidBrush(Color color) : Brush(color) { }

public static class Brushes
{
    public static readonly Brush Black = new(Color.Black);
    public static readonly Brush White = new(Color.White);
    public static readonly Brush WhiteSmoke = new(Color.WhiteSmoke);
    public static readonly Brush Gainsboro = new(Color.Gainsboro);
    public static readonly Brush Gold = new(Color.Gold);
    public static readonly Brush DarkGreen = new(Color.DarkGreen);
    public static readonly Brush SaddleBrown = new(Color.SaddleBrown);
    public static readonly Brush DeepSkyBlue = new(Color.DeepSkyBlue);
    public static readonly Brush LightCoral = new(Color.LightCoral);
    public static readonly Brush LightGreen = new(Color.LightGreen);
}

public sealed class Pen(Color color, float width = 1f) : IDisposable
{
    public Color Color { get; } = color;
    public float Width { get; } = width;
    public LineCap StartCap { get; set; } = LineCap.Flat;
    public LineCap EndCap { get; set; } = LineCap.Flat;
    public void Dispose() { }
}

public static class Pens
{
    public static readonly Pen White = new(Color.White);
}

public sealed class Font(string family, float size, FontStyle style = FontStyle.Regular) : IDisposable
{
    public string Family { get; } = family;
    public float Size { get; } = size;
    public bool Bold => style == FontStyle.Bold;
    public void Dispose() { }
}

public sealed class StringFormat : IDisposable
{
    public StringAlignment Alignment { get; set; } = StringAlignment.Near;
    public StringAlignment LineAlignment { get; set; } = StringAlignment.Near;
    public StringTrimming Trimming { get; set; } = StringTrimming.None;
    public StringFormatFlags FormatFlags { get; set; } = StringFormatFlags.None;
    public void Dispose() { }
}

public sealed class GraphicsState { }

public sealed class DrawCommand
{
    public string Type { get; set; } = "";
    public string? Color { get; set; }
    public float X { get; set; }
    public float Y { get; set; }
    public float W { get; set; }
    public float H { get; set; }
    public float Width { get; set; } = 1;
    public float? StartAngle { get; set; }
    public float? SweepAngle { get; set; }
    public float[]? Points { get; set; }
    public string? Text { get; set; }
    public float FontSize { get; set; }
    public string? FontFamily { get; set; }
    public bool Bold { get; set; }
    public string? Cap { get; set; }
    public string? Align { get; set; }
    public string? VerticalAlign { get; set; }
    public bool NoWrap { get; set; }
}

public sealed class Graphics
{
    public List<DrawCommand> Commands { get; } = new(256);
    private SmoothingMode _smoothingMode;
    public SmoothingMode SmoothingMode
    {
        get => _smoothingMode;
        set
        {
            _smoothingMode = value;
            Commands.Add(new DrawCommand { Type = "smoothing", W = value == SmoothingMode.AntiAlias ? 1 : 0 });
        }
    }

    public static string Css(Color c) =>
        $"rgba({c.R},{c.G},{c.B},{(c.A / 255.0).ToString(System.Globalization.CultureInfo.InvariantCulture)})";

    public void Clear(Color c) => Commands.Add(new() { Type = "clear", Color = Css(c) });

    private static string CanvasCap(Pen pen) =>
        pen.StartCap == LineCap.Round || pen.EndCap == LineCap.Round ? "round"
        : pen.StartCap == LineCap.Square || pen.EndCap == LineCap.Square ? "square" : "butt";

    private void Rect(string type, Color c, float x, float y, float w, float h, float width = 1, string? cap = null) =>
        Commands.Add(new() { Type = type, Color = Css(c), X = x, Y = y, W = w, H = h, Width = width, Cap = cap });

    public void FillRectangle(Brush brush, float x, float y, float w, float h) => Rect("fillRect", brush.Color, x, y, w, h);
    public void FillRectangle(Brush brush, Rectangle rect) => FillRectangle(brush, rect.X, rect.Y, rect.Width, rect.Height);
    public void FillRectangle(Brush brush, RectangleF rect) => FillRectangle(brush, rect.X, rect.Y, rect.Width, rect.Height);
    public void DrawRectangle(Pen pen, float x, float y, float w, float h) => Rect("strokeRect", pen.Color, x, y, w, h, pen.Width, CanvasCap(pen));
    public void DrawRectangle(Pen pen, Rectangle rect) => DrawRectangle(pen, rect.X, rect.Y, rect.Width, rect.Height);
    public void DrawRectangle(Pen pen, RectangleF rect) => DrawRectangle(pen, rect.X, rect.Y, rect.Width, rect.Height);
    public void FillEllipse(Brush brush, float x, float y, float w, float h) => Rect("fillEllipse", brush.Color, x, y, w, h);
    public void FillEllipse(Brush brush, Rectangle rect) => FillEllipse(brush, rect.X, rect.Y, rect.Width, rect.Height);
    public void FillEllipse(Brush brush, RectangleF rect) => FillEllipse(brush, rect.X, rect.Y, rect.Width, rect.Height);
    public void DrawEllipse(Pen pen, float x, float y, float w, float h) => Rect("strokeEllipse", pen.Color, x, y, w, h, pen.Width, CanvasCap(pen));
    public void DrawEllipse(Pen pen, Rectangle rect) => DrawEllipse(pen, rect.X, rect.Y, rect.Width, rect.Height);
    public void DrawEllipse(Pen pen, RectangleF rect) => DrawEllipse(pen, rect.X, rect.Y, rect.Width, rect.Height);

    public void DrawLine(Pen pen, float x1, float y1, float x2, float y2) =>
        Commands.Add(new() { Type = "line", Color = Css(pen.Color), Width = pen.Width, Cap = CanvasCap(pen), X = x1, Y = y1, W = x2, H = y2 });

    public void DrawLines(Pen pen, PointF[] points) =>
        Commands.Add(new() { Type = "lines", Color = Css(pen.Color), Width = pen.Width, Cap = CanvasCap(pen),
            Points = points.SelectMany(p => new[] { p.X, p.Y }).ToArray() });

    public void FillPolygon(Brush brush, PointF[] points) =>
        Commands.Add(new() { Type = "polygon", Color = Css(brush.Color),
            Points = points.SelectMany(p => new[] { p.X, p.Y }).ToArray() });

    public void FillPolygon(Brush brush, Point[] points) =>
        Commands.Add(new() { Type = "polygon", Color = Css(brush.Color),
            Points = points.SelectMany(p => new float[] { p.X, p.Y }).ToArray() });

    public void DrawArc(Pen pen, float x, float y, float w, float h, float startAngle, float sweepAngle) =>
        Commands.Add(new() { Type = "arc", Color = Css(pen.Color), Width = pen.Width, Cap = CanvasCap(pen),
            X = x, Y = y, W = w, H = h, StartAngle = startAngle, SweepAngle = sweepAngle });

    public SizeF MeasureString(string text, Font font)
    {
        // Estimativa suficiente para centralização; medição real depende do navegador.
        var lines = (text ?? "").Split('\n');
        float max = lines.Length == 0 ? 0 : lines.Max(line => line.Sum(c => c == ' ' ? 0.34f : c is 'I' or 'i' or 'l' or '!' ? 0.3f : 0.61f));
        float pixels = font.Size * 1.333f;
        return new SizeF(max * pixels * (font.Bold ? 1.06f : 1f), lines.Length * pixels * 1.2f);
    }

    public void DrawString(string text, Font font, Brush brush, float x, float y) =>
        Text(text, font, brush, x, y, 0, 0, null);

    public void DrawString(string text, Font font, Brush brush, RectangleF rectangle) =>
        Text(text, font, brush, rectangle.X, rectangle.Y, rectangle.Width, rectangle.Height, null);

    public void DrawString(string text, Font font, Brush brush, RectangleF rectangle, StringFormat format) =>
        Text(text, font, brush, rectangle.X, rectangle.Y, rectangle.Width, rectangle.Height, format);

    private void Text(string text, Font font, Brush brush, float x, float y, float w, float h, StringFormat? format)
    {
        Commands.Add(new()
        {
            Type = "text", Text = text ?? "", Color = Css(brush.Color),
            X = x, Y = y, W = w, H = h, FontSize = font.Size * 1.333f,
            FontFamily = font.Family, Bold = font.Bold,
            Align = format?.Alignment.ToString().ToLowerInvariant() ?? "near",
            VerticalAlign = format?.LineAlignment.ToString().ToLowerInvariant() ?? "near",
            NoWrap = format?.FormatFlags.HasFlag(StringFormatFlags.NoWrap) ?? false
        });
    }

    public GraphicsState Save()
    {
        Commands.Add(new() { Type = "save" });
        return new GraphicsState();
    }

    public void Restore(GraphicsState _) => Commands.Add(new() { Type = "restore" });
    public void TranslateTransform(float x, float y) =>
        Commands.Add(new() { Type = "translate", X = x, Y = y });

    public void ScaleTransform(float x, float y) =>
        Commands.Add(new() { Type = "scale", X = x, Y = y });
}
