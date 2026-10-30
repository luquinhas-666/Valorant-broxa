// Renderizador Canvas 2D para os comandos de desenho dos jogos C# originais.
window.movimentoGame = (() => {
    let canvas = null;
    let ctx = null;
    let bridge = null;
    const held = new Set();
    let cleaners = [];
    const valid = new Set([
        "KeyA", "KeyD", "KeyW", "KeyS", "KeyF", "KeyQ",
        "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
        "Enter", "NumpadEnter", "ShiftLeft", "ShiftRight"
    ]);

    function bind(element, eventName, handler, options) {
        element.addEventListener(eventName, handler, options);
        cleaners.push(() => element.removeEventListener(eventName, handler, options));
    }

    function press(code) {
        if (!bridge || !valid.has(code) || held.has(code)) return;
        held.add(code);
        bridge.invokeMethodAsync("OnKeyDown", code).catch(() => {});
    }

    function release(code) {
        if (!held.delete(code)) return;
        if (bridge) bridge.invokeMethodAsync("OnKeyUp", code).catch(() => {});
    }

    function releaseAll() {
        for (const key of [...held]) release(key);
    }

    function init(surface, dotNetRef) {
        dispose();
        canvas = surface;
        ctx = canvas.getContext("2d", { alpha: false });
        bridge = dotNetRef;

        bind(window, "keydown", e => {
            if (!valid.has(e.code)) return;
            // Não roubar o teclado de campos editáveis.
            if (e.target.closest?.("input, textarea, select, [contenteditable]")) return;
            e.preventDefault();
            if (!e.repeat) press(e.code);
        }, { passive: false });

        bind(window, "keyup", e => {
            if (valid.has(e.code)) {
                e.preventDefault();
                release(e.code);
            }
        }, { passive: false });

        bind(window, "blur", releaseAll);
        bind(document, "visibilitychange", () => {
            if (document.hidden) releaseAll();
        });

        document.querySelectorAll("[data-game-key]").forEach(button => {
            const code = button.dataset.gameKey;
            bind(button, "pointerdown", e => {
                e.preventDefault();
                button.setPointerCapture?.(e.pointerId);
                button.classList.add("is-pressed");
                press(code);
            }, { passive: false });
            const stop = e => {
                e.preventDefault();
                button.classList.remove("is-pressed");
                release(code);
            };
            bind(button, "pointerup", stop, { passive: false });
            bind(button, "pointercancel", stop, { passive: false });
            bind(button, "lostpointercapture", () => {
                button.classList.remove("is-pressed");
                release(code);
            });
            bind(button, "contextmenu", e => e.preventDefault());
        });
    }

    function render(commands) {
        if (!ctx || !canvas) return;
        const c2 = ctx;
        c2.setTransform(1, 0, 0, 1, 0, 0);
        c2.clearRect(0, 0, canvas.width, canvas.height);

        for (const cmd of commands) {
            const type = cmd.type;
            const x = cmd.x || 0, y = cmd.y || 0, w = cmd.w || 0, h = cmd.h || 0;
            const color = cmd.color || "white";
            if (type === "clear") {
                c2.save();
                c2.setTransform(1, 0, 0, 1, 0, 0);
                c2.fillStyle = color;
                c2.fillRect(0, 0, canvas.width, canvas.height);
                c2.restore();
            } else if (type === "save") c2.save();
            else if (type === "restore") c2.restore();
            else if (type === "translate") c2.translate(x, y);
            else if (type === "scale") c2.scale(x, y);
            else if (type === "smoothing") c2.imageSmoothingEnabled = w > 0;
            else if (type === "fillRect") {
                c2.fillStyle = color;
                c2.fillRect(x, y, w, h);
            } else if (type === "strokeRect") {
                c2.strokeStyle = color;
                c2.lineWidth = cmd.width || 1;
                c2.lineCap = cmd.cap || "butt";
                c2.strokeRect(x, y, w, h);
            } else if (type === "fillEllipse" || type === "strokeEllipse" || type === "arc") {
                c2.beginPath();
                c2.ellipse(x + w / 2, y + h / 2, Math.max(0.1, Math.abs(w / 2)),
                    Math.max(0.1, Math.abs(h / 2)), 0,
                    type === "arc" ? (cmd.startAngle || 0) * Math.PI / 180 : 0,
                    type === "arc" ? ((cmd.startAngle || 0) + (cmd.sweepAngle || 0)) * Math.PI / 180 : Math.PI * 2);
                if (type === "fillEllipse") {
                    c2.fillStyle = color; c2.fill();
                } else {
                    c2.strokeStyle = color; c2.lineWidth = cmd.width || 1; c2.lineCap = cmd.cap || "butt"; c2.stroke();
                }
            } else if (type === "line") {
                c2.beginPath(); c2.moveTo(x, y); c2.lineTo(w, h);
                c2.strokeStyle = color; c2.lineWidth = cmd.width || 1;
                c2.lineCap = cmd.cap || "butt";
                c2.stroke();
            } else if (type === "lines" || type === "polygon") {
                const points = cmd.points || [];
                if (points.length >= 4) {
                    c2.beginPath();
                    c2.moveTo(points[0], points[1]);
                    for (let i = 2; i < points.length; i += 2)
                        c2.lineTo(points[i], points[i + 1]);
                    if (type === "polygon") {
                        c2.closePath(); c2.fillStyle = color; c2.fill();
                    } else {
                        c2.strokeStyle = color; c2.lineWidth = cmd.width || 1; c2.lineCap = cmd.cap || "butt"; c2.stroke();
                    }
                }
            } else if (type === "text") {
                drawText(c2, cmd);
            }
        }
    }

    function drawText(c2, cmd) {
        const text = cmd.text || "";
        if (!text) return;
        const fontSize = Math.max(6, cmd.fontSize || 14);
        c2.font = `${cmd.bold ? "700 " : ""}${fontSize}px "${cmd.fontFamily || "Arial"}", Arial, sans-serif`;
        c2.fillStyle = cmd.color || "#fff";
        c2.textBaseline = "top";
        c2.textAlign = cmd.align === "center" ? "center" : cmd.align === "far" ? "right" : "left";
        const area = cmd.w > 0 ? cmd.w : 0;
        const left = cmd.x || 0, top = cmd.y || 0;
        const x = c2.textAlign === "center" ? left + area / 2
              : c2.textAlign === "right" ? left + area : left;

        if (area > 0 && cmd.h > 0) {
            c2.save();
            c2.beginPath();
            c2.rect(left, top, cmd.w, cmd.h);
            c2.clip();

            const words = text.split(/\s+/);
            let rows = [];
            if (cmd.noWrap) {
                rows = [text];
            } else {
                let line = "";
                for (const word of words) {
                    const next = line ? `${line} ${word}` : word;
                    if (line && c2.measureText(next).width > area) {
                        rows.push(line);
                        line = word;
                    } else line = next;
                }
                if (line) rows.push(line);
            }
            const lineHeight = fontSize * 1.15;
            const totalHeight = rows.length * lineHeight;
            const beginY = cmd.verticalAlign === "center" ? top + Math.max(0, (cmd.h - totalHeight) / 2) : top;
            rows.forEach((line, i) => c2.fillText(line, x, beginY + i * lineHeight));
            c2.restore();
        } else {
            text.split("\n").forEach((line, i) => c2.fillText(line, x, top + i * fontSize * 1.18));
        }
    }

    function dispose() {
        releaseAll();
        for (const cleanup of cleaners.splice(0)) cleanup();
        bridge = null;
        canvas = null;
        ctx = null;
    }

    return { init, render, releaseAll, dispose };
})();
