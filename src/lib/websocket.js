// src/lib/websocket.js
// Cliente WebSocket ROBUSTO — heartbeat, reconexão infinita, status reativo

class WSClient {
  constructor() {
    this.ws = null;
    this.handlers = new Map();
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.token = null;
    this.status = 'desconectado'; // desconectado | conectando | conectado
    this.statusCallbacks = new Set();
    this._forceClose = false;
  }

  connect(token) {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) return;
    this.token = token;
    this._forceClose = false;
    this._setStatus('conectando');

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = import.meta.env.VITE_WS_URL || window.location.host;
    const url = `${protocol}://${host}/ws?token=${token}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('[WS] Conectado');
        this.reconnectAttempts = 0;
        this._setStatus('conectado');
        this._iniciarHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const { evento, dados } = JSON.parse(event.data);

          // Heartbeat pong do servidor
          if (evento === 'pong' || evento === 'conexao') return;

          const callbacks = this.handlers.get(evento);
          if (callbacks) {
            callbacks.forEach((cb) => {
              try { cb(dados); } catch (e) { console.error('[WS] Erro no handler:', e); }
            });
          }
          // Handler wildcard
          const wildcards = this.handlers.get('*');
          if (wildcards) {
            wildcards.forEach((cb) => {
              try { cb(evento, dados); } catch (e) { console.error('[WS] Erro no wildcard:', e); }
            });
          }
        } catch {
          // Ignorar mensagens inválidas
        }
      };

      this.ws.onclose = (event) => {
        console.log('[WS] Desconectado', event.code);
        this._pararHeartbeat();
        this._setStatus('desconectado');
        if (!this._forceClose) {
          this._reconnect();
        }
      };

      this.ws.onerror = () => {
        // onclose será chamado em seguida
      };
    } catch (err) {
      console.error('[WS] Erro ao conectar', err);
      this._setStatus('desconectado');
      this._reconnect();
    }
  }

  _reconnect() {
    if (this._forceClose) return;

    // NUNCA desistir — reconectar infinitamente com backoff
    // 1s, 2s, 4s, 8s, 15s, 15s, 15s... (cap em 15s)
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 15000);
    this.reconnectAttempts++;
    this._setStatus('conectando');

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.token && !this._forceClose) {
        console.log(`[WS] Reconectando (tentativa ${this.reconnectAttempts})...`);
        this.connect(this.token);
      }
    }, delay);
  }

  // Heartbeat — ping a cada 25s. Se não receber pong, reconectar
  _iniciarHeartbeat() {
    this._pararHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ evento: 'ping' }));
      } else {
        // WS morreu silenciosamente — forçar reconexão
        this._pararHeartbeat();
        this.ws?.close();
      }
    }, 25000);
  }

  _pararHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  _setStatus(novoStatus) {
    if (this.status === novoStatus) return;
    this.status = novoStatus;
    this.statusCallbacks.forEach((cb) => {
      try { cb(novoStatus); } catch (_) {}
    });
  }

  // Observar mudanças de status (pra UI)
  onStatus(callback) {
    this.statusCallbacks.add(callback);
    // Emite status atual imediatamente
    callback(this.status);
    return () => this.statusCallbacks.delete(callback);
  }

  on(evento, callback) {
    if (!this.handlers.has(evento)) {
      this.handlers.set(evento, new Set());
    }
    this.handlers.get(evento).add(callback);
    return () => { this.handlers.get(evento)?.delete(callback); };
  }

  off(evento, callback) {
    this.handlers.get(evento)?.delete(callback);
  }

  send(evento, dados) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ evento, dados }));
    }
  }

  get conectado() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  disconnect() {
    this._forceClose = true;
    this._pararHeartbeat();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close(1000);
      this.ws = null;
    }
    this._setStatus('desconectado');
  }
}

export const wsClient = new WSClient();
export default wsClient;
