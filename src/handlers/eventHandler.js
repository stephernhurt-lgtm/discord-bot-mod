const fs = require('node:fs');
const path = require('node:path');

const EVENTS_DIR = path.join(__dirname, '..', 'events');

function loadEvents(client) {
  const files = fs
    .readdirSync(EVENTS_DIR)
    .filter((file) => file.endsWith('.js'));

  let loaded = 0;

  for (const file of files) {
    try {
      const event = require(path.join(EVENTS_DIR, file));

      if (!event?.name || typeof event.execute !== 'function') {
        console.warn(`[Eventos] Ignorando arquivo inválido: ${file}`);
        continue;
      }

      const listener = (...args) => {
        Promise.resolve(event.execute(...args)).catch((error) => {
          console.error(`[Evento:${event.name}]`, error);
        });
      };

      if (event.once) {
        client.once(event.name, listener);
      } else {
        client.on(event.name, listener);
      }

      loaded += 1;
    } catch (error) {
      console.error(`[Eventos] Falha ao carregar ${file}:`, error);
    }
  }

  console.log(`[Eventos] ${loaded} evento(s) carregado(s).`);
}

module.exports = { loadEvents };
