const UNITS = {
  s: 1000,
  seg: 1000,
  segundo: 1000,
  segundos: 1000,
  m: 60_000,
  min: 60_000,
  minuto: 60_000,
  minutos: 60_000,
  h: 3_600_000,
  hora: 3_600_000,
  horas: 3_600_000,
  d: 86_400_000,
  dia: 86_400_000,
  dias: 86_400_000,
  w: 604_800_000,
  semana: 604_800_000,
  semanas: 604_800_000,
};

/**
 * Converte textos como "10m", "1h", "1 dia" em milissegundos.
 * Retorna null quando o formato é inválido.
 */
function parseDuration(input) {
  if (input === null || input === undefined) return null;

  const normalized = String(input)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');

  const match = normalized.match(/^(\d+)([a-zç]+)$/);
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = UNITS[match[2]];

  if (!Number.isFinite(amount) || !unit) return null;
  return amount * unit;
}

function formatDuration(milliseconds) {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return '0s';

  const units = [
    ['d', 86_400_000],
    ['h', 3_600_000],
    ['min', 60_000],
    ['s', 1000],
  ];

  let remaining = Math.floor(milliseconds);
  const parts = [];

  for (const [label, size] of units) {
    const amount = Math.floor(remaining / size);
    if (amount > 0) {
      parts.push(`${amount}${label}`);
      remaining -= amount * size;
    }
  }

  return parts.join(' ') || '0s';
}

module.exports = { parseDuration, formatDuration };
