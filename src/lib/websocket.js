// src/lib/websocket.js
// Cliente WebSocket com reconexão automática

class WSClient {
  constructor() {
    this.ws = null;
    this.handlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnect = 15;
    this.reconnectTimer = null;
    this.token = null;
  }

  connect(token) {
    this.token = token;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = import.meta.env.VITE_WS_URL || window.location.host;
    const url = `${protocol}://${host}/ws?token=${token}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('[WS] Conectado');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const { evento, dados } = JSON.parse(event.data);
          const callbacks = this.handlers.get(evento);
          if (callbacks) {
            callbacks.forEach((cb) => cb(dados));
          }
          // Handler wildcard
          const wildcards = this.handlers.get('*');
          if (wildcards) {
            wildcards.forEach((cb) => cb(evento, dados));
          }
        } catch {
          // Ignorar mensagens inválidas
        }
      };

      this.ws.onclose = (event) => {
        console.log('[WS] Desconectado', event.code);
        if (event.code !== 1000) {
          this._reconnect();
        }
      };

      this.ws.onerror = () => {
        // onclose será chamado em seguida
      };
    } catch (err) {
      console.error('[WS] Erro ao conectar', err);
      this._reconnect();
    }
  }

  _reconnect() {
    if (this.reconnectAttempts >= this.maxReconnect) {
      console.error('[WS] Máximo de tentativas atingido');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.token) this.connect(this.token);
    }, delay);
  }

  on(evento, callback) {
    if (!this.handlers.has(evento)) {
      this.handlers.set(evento, new Set());
    }
    this.handlers.get(evento).add(callback);

    // Retorna função de cleanup
    return () => {
      this.handlers.get(evento)?.delete(callback);
    };
  }

  off(evento, callback) {
    this.handlers.get(evento)?.delete(callback);
  }

  send(evento, dados) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ evento, dados }));
    }
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close(1000);
      this.ws = null;
    }
  }
}

export const wsClient = new WSClient();
export default wsClient;
