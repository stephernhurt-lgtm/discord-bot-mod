const { PermissionsBitField } = require('discord.js');

const PERMISSION_LABELS = {
  Administrator: 'Administrador',
  BanMembers: 'Banir Membros',
  EmbedLinks: 'Inserir Links',
  KickMembers: 'Expulsar Membros',
  ManageChannels: 'Gerenciar Canais',
  ManageGuild: 'Gerenciar Servidor',
  ManageMessages: 'Gerenciar Mensagens',
  ModerateMembers: 'Silenciar Membros',
  ReadMessageHistory: 'Ler Histórico de Mensagens',
  SendMessages: 'Enviar Mensagens',
  ViewAuditLog: 'Ver Registro de Auditoria',
  ViewChannel: 'Ver Canais',
};

/**
 * Verifica se o moderador pode agir sobre o membro alvo,
 * respeitando a hierarquia de cargos e o dono do servidor.
 */
function canModerate(moderator, targetMember, guild) {
  if (!targetMember) return true;
  if (!moderator || !guild) return false;

  if (targetMember.id === guild.ownerId) return false;
  if (targetMember.id === moderator.id) return false;

  const botMember = guild.members.me;
  if (!botMember) return false;

  if (targetMember.roles.highest.position >= botMember.roles.highest.position) {
    return false;
  }

  if (moderator.id !== guild.ownerId && targetMember.roles.highest.position >= moderator.roles.highest.position) {
    return false;
  }

  return true;
}

function formatPermissions(permissions) {
  return new PermissionsBitField(permissions)
    .toArray()
    .map((name) => PERMISSION_LABELS[name] || name)
    .join(', ');
}

module.exports = { canModerate, formatPermissions };
