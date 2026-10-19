const { Events } = require('discord.js');
const { handleMessage } = require('../handlers/automod');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    try {
      await handleMessage(message);
    } catch (error) {
      console.error('[AutoMod] Erro ao processar mensagem:', error);
    }
  },
};
