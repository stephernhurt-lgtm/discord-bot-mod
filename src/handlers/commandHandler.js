const fs = require('node:fs');
const path = require('node:path');

const COMMANDS_DIR = path.join(__dirname, '..', 'commands');

function getCommandFiles(directory = COMMANDS_DIR) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...getCommandFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

function loadCommandModules() {
  const modules = [];
  const names = new Set();

  for (const file of getCommandFiles()) {
    try {
      const command = require(file);

      if (!command?.data || typeof command.execute !== 'function') {
        console.warn(`[Comandos] Ignorando arquivo inválido: ${path.basename(file)}`);
        continue;
      }

      const name = command.data.name;
      if (names.has(name)) {
        console.warn(`[Comandos] Comando duplicado ignorado: /${name}`);
        continue;
      }

      names.add(name);
      modules.push(command);
    } catch (error) {
      console.error(`[Comandos] Falha ao carregar ${path.basename(file)}:`, error);
    }
  }

  return modules;
}

function loadCommands(client) {
  const commands = loadCommandModules();

  for (const command of commands) {
    client.commands.set(command.data.name, command);
  }

  console.log(`[Comandos] ${commands.length} comando(s) carregado(s).`);
  return commands;
}

module.exports = { getCommandFiles, loadCommandModules, loadCommands };
