import { SERVER_URL } from './online-config.js';
import { AGENTS } from './data.js';

export function setupOnline(game) {
  // The server uses the same game module with a headless renderer.
  if (typeof WebSocket === 'undefined') return null;
  const $ = (id) => document.getElementById(id);
  let socket = null,
    session = null,
    lobby = null,
    retry = 0,
    intentional = false,
    reconnectTimer,
    lastPing = 0;
  const status = (text) => ($('online-status').textContent = text);
  const send = (data) => {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(data));
  };
  function endpoint() {
    const value = $('server-url').value.trim();
    const url = new URL(value);
    if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) || url.username || url.password)
      throw Error('Informe um endereço http:// ou https:// do servidor.');
    if (location.protocol === 'https:' && ['http:', 'ws:'].includes(url.protocol))
      throw Error('Use HTTPS para conectar a partir do GitHub Pages.');
    url.protocol = ['https:', 'wss:'].includes(url.protocol) ? 'wss:' : 'ws:';
    url.pathname = '/ws';
    url.search = '';
    url.hash = '';
    return url.href;
  }
  function connect(first) {
    if (socket) socket.close();
    intentional = false;
    let url;
    try {
      url = endpoint();
    } catch (e) {
      status(e.message);
      return;
    }
    $('online-create').disabled = $('online-join').disabled = true;
    status(
      retry
        ? 'Reconectando à sala…'
        : 'Conectando… O servidor gratuito pode levar cerca de um minuto para despertar.',
    );
    socket = new WebSocket(url);
    const current = socket;
    socket.onopen = () => {
      if (current !== socket) return;
      retry = 0;
      send(session ? { type: 'resume', ...session } : first);
      try {
        localStorage.setItem('rupture-server', $('server-url').value);
        localStorage.setItem('rupture-nickname', $('nickname').value);
      } catch {}
    };
    socket.onmessage = (e) => {
      let data;
      try {
        data = JSON.parse(e.data);
      } catch {
        return;
      }
      if (data.type === 'welcome') {
        session = { id: data.id, token: data.token, code: data.code };
      }
      if (data.type === 'lobby') {
        lobby = data;
        drawLobby();
      }
      if (data.type === 'snapshot' && session) {
        game.receive(data.snapshot, session.id);
      }
      if (data.type === 'pong') {
        $('net-info').textContent =
          `SALA ${session?.code || ''} · ${Math.round(performance.now() - data.time)} ms`;
      }
      if (data.type === 'error') {
        status(data.message);
        $('online-create').disabled = $('online-join').disabled = false;
      }
      if (data.type === 'closed') {
        leave();
        game.menu();
        $('online').classList.remove('hidden');
        status(data.message);
      }
    };
    socket.onerror = () =>
      status('Não foi possível conectar. Confira o endereço e se o servidor está ligado.');
    socket.onclose = () => {
      if (current !== socket || intentional) return;
      $('online-create').disabled = $('online-join').disabled = false;
      if (session && retry < 7) {
        game.toast('Conexão interrompida. Tentando voltar à sala…');
        reconnectTimer = setTimeout(
          () => {
            retry++;
            connect();
          },
          Math.min(1000 * 2 ** retry, 8000),
        );
      } else {
        session = null;
        game.menu();
        $('online').classList.remove('hidden');
        status('Conexão encerrada. Você pode criar ou entrar em uma sala novamente.');
      }
    };
  }
  function drawLobby() {
    game.menu();
    $('online').classList.remove('hidden');
    $('online-setup').classList.add('hidden');
    $('online-lobby').classList.remove('hidden');
    $('room-code').textContent = lobby.code;
    $('lobby-mode').textContent =
      `${lobby.mode === 'competitive' ? 'Competitivo · 13 vitórias' : 'Rápida · 4 vitórias'} / ${lobby.bots ? 'vagas com bots' : 'somente amigos'}`;
    $('lobby-players').replaceChildren();
    for (const team of [0, 1]) {
      const section = document.createElement('section'),
        title = document.createElement('h3');
      title.textContent = team === 0 ? 'EQUIPE AZUL' : 'EQUIPE VERMELHA';
      section.append(title);
      for (const p of lobby.players.filter((p) => p.team === team)) {
        const row = document.createElement('p');
        row.textContent = `${p.name} · ${p.agent.toUpperCase()}${p.id === lobby.host ? ' ♛' : ''}${!p.connected ? ' (reconectando)' : ''}`;
        section.append(row);
      }
      $('lobby-players').append(section);
    }
    const own = lobby.players.find((p) => p.id === session.id);
    $('online-team').value = String(own.team);
    $('online-agent').value = own.agent;
    $('online-start').disabled = lobby.host !== session.id;
    $('online-start').textContent =
      lobby.host === session.id ? 'INICIAR PARTIDA →' : 'AGUARDANDO O DONO DA SALA';
    status('Escolha a equipe e o agente. O dono da sala inicia quando todos entrarem.');
  }
  function leave() {
    intentional = true;
    clearTimeout(reconnectTimer);
    send({ type: 'leave' });
    socket?.close();
    socket = null;
    session = null;
    lobby = null;
    retry = 0;
    $('online-setup').classList.remove('hidden');
    $('online-lobby').classList.add('hidden');
    $('online-create').disabled = $('online-join').disabled = false;
  }
  try {
    $('server-url').value =
      SERVER_URL ||
      localStorage.getItem('rupture-server') ||
      (/^localhost$|^127\.0\.0\.1$/.test(location.hostname)
        ? 'http://' + location.hostname + ':8787'
        : location.origin.includes('github.io')
          ? ''
          : location.origin);
    $('nickname').value = localStorage.getItem('rupture-nickname') || '';
  } catch {}
  for (const agent of AGENTS) {
    const o = document.createElement('option');
    o.value = agent.id;
    o.textContent = agent.name;
    $('online-agent').append(o);
  }
  $('online-btn').onclick = () => {
    $('online').classList.remove('hidden');
    status('Crie uma sala ou entre com o código de um amigo.');
  };
  $('online-close').onclick = () => {
    if (session) leave();
    $('online').classList.add('hidden');
  };
  $('online-create').onclick = () =>
    connect({
      type: 'create',
      name: $('nickname').value,
      agent: game.agent(),
      mode: $('online-mode').value,
      bots: $('online-bots').checked,
    });
  $('online-join').onclick = () =>
    connect({
      type: 'join',
      name: $('nickname').value,
      agent: game.agent(),
      code: $('join-code').value.trim().toUpperCase(),
    });
  $('online-team').onchange = () =>
    send({ type: 'choose', team: Number($('online-team').value), agent: $('online-agent').value });
  $('online-agent').onchange = $('online-team').onchange;
  $('online-start').onclick = () => send({ type: 'start' });
  $('online-leave').onclick = () => {
    leave();
    status('Você saiu da sala.');
  };
  $('copy-code').onclick = async () => {
    try {
      await navigator.clipboard.writeText(session.code);
      status('Código copiado!');
    } catch {
      status('Código da sala: ' + session.code);
    }
  };
  setInterval(() => {
    if (session && socket?.readyState === 1) send({ type: 'input', ...game.input() });
  }, 33);
  setInterval(() => {
    if (session) {
      lastPing = performance.now();
      send({ type: 'ping', time: lastPing });
    }
  }, 2000);
  window.addEventListener('beforeunload', () => {
    intentional = true;
    socket?.close();
  });
  return {
    leave,
    command: (action, value) => {
      if (action === 'rematch') {
        if (lobby?.host !== session?.id) {
          game.toast('O dono da sala pode abrir a próxima partida.');
          return;
        }
        send({ type: 'rematch' });
        return;
      }
      send({ type: 'command', action, value });
    },
  };
}
