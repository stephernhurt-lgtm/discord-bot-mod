const { PermissionFlagsBits } = require('discord.js');
const { getAutomod } = require('../database/db');
const { baseEmbed } = require('../utils/embeds');
const { sendLog, LOG_COLORS } = require('../utils/logger');
const { ignoreDeletion } = require('../utils/deletions');
const { markAction, clearAction } = require('../utils/actionTracker');
const {
  containsBadWord,
  extractDomain,
  isDomainAllowed,
  truncate,
} = require('../utils/text');
const { formatDuration } = require('../utils/time');

const spamTracker = new Map();
const punishedUntil = new Map();
const ghostMessages = new Map();

const INVITE_REGEX = /(?:discord\.(?:gg|io|me|li)|discord(?:app)?\.com\/invite)\/[a-z0-9-]+/i;
const URL_REGEX = /https?:\/\/[^\s<>()]+/gi;
const GHOST_PING_WINDOW = 60_000;
const MAX_TIMEOUT = 28 * 86_400_000;

const PUNISHMENT_PERMISSIONS = {
  timeout: PermissionFlagsBits.ModerateMembers,
  kick: PermissionFlagsBits.KickMembers,
  ban: PermissionFlagsBits.BanMembers,
};

function isExempt(member) {
  if (!member) return true;
  return member.permissions.has(PermissionFlagsBits.Administrator)
    || member.permissions.has(PermissionFlagsBits.ManageMessages);
}

function trackGhostPing(message) {
  if (!message.inGuild() || message.author.bot) return;

  const mentionedUsers = [...message.mentions.users.keys()]
    .filter((id) => id !== message.author.id)
    .slice(0, 10);
  const mentionedRoles = [...message.mentions.roles.keys()].slice(0, 5);
  const everyone = message.mentions.everyone;

  if (mentionedUsers.length === 0 && mentionedRoles.length === 0 && !everyone) return;

  ghostMessages.set(message.id, {
    guildId: message.guild.id,
    channelId: message.channelId,
    authorId: message.author.id,
    content: truncate(message.content || '', 900),
    mentionedUsers,
    mentionedRoles,
    everyone,
    createdAt: Date.now(),
  });
}

async function handleGhostPing(message) {
  const cached = ghostMessages.get(message.id);
  if (!cached) return;

  ghostMessages.delete(message.id);
  if (!message.guild || cached.guildId !== message.guild.id) return;
  if (Date.now() - cached.createdAt > GHOST_PING_WINDOW) return;

  const settings = getAutomod(message.guild.id);
  if (!settings.ghostping_enabled) return;

  const mentions = [
    ...cached.mentionedUsers.map((id) => `<@${id}>`),
    ...cached.mentionedRoles.map((id) => `<@&${id}>`),
    ...(cached.everyone ? ['@everyone'] : []),
  ];

  await sendLog(message.guild, {
    title: '👻 Ghost Ping detectado',
    color: LOG_COLORS.automod,
    fields: [
      {
        name: 'Autor',
        value: `<@${cached.authorId}> (\`${cached.authorId}\`)`,
        inline: true,
      },
      {
        name: 'Canal',
        value: `<#${cached.channelId}>`,
        inline: true,
      },
      {
        name: 'Mencionados',
        value: truncate(mentions.join(', ') || 'Ninguém', 1024),
      },
      {
        name: 'Mensagem apagada',
        value: cached.content || '*Sem conteúdo de texto*',
      },
    ],
  });
}

async function handleViolation(message, settings, violation) {
  const guild = message.guild;
  const member = message.member;
  if (!guild || !member) return;

  ignoreDeletion(message.id);
  await message.delete().catch(() => {});

  let actionLabel = 'Mensagem apagada';

  if (settings.punishment !== 'delete') {
    const punishKey = `${guild.id}:${member.id}`;

    // Evita punir várias vezes o mesmo usuário por mensagens do mesmo fluxo.
    if ((punishedUntil.get(punishKey) || 0) > Date.now()) return;

    const me = guild.members.me;
    const permission = PUNISHMENT_PERMISSIONS[settings.punishment];
    const canPunish = Boolean(
      me
      && permission
      && me.permissions.has(permission)
      && member.id !== guild.ownerId
      && member.roles.highest.position < me.roles.highest.position,
    );

    if (!canPunish) {
      actionLabel = 'Mensagem apagada (sem permissão para punir)';
    } else {
      const reason = `AutoMod: ${violation.label} (${violation.details})`;
      const duration = Math.min(
        Math.max(settings.timeout_duration, 10_000),
        MAX_TIMEOUT,
      );

      const plannedLabel = settings.punishment === 'timeout'
        ? `Silenciado por ${formatDuration(duration)}`
        : settings.punishment === 'kick'
          ? 'Expulso do servidor'
          : 'Banido do servidor';

      // A DM precisa ser enviada antes de expulsar/banir: depois disso o bot
      // pode não compartilhar mais um servidor com o usuário.
      const dm = baseEmbed(guild, {
        title: '🛡️ AutoMod',
        description: `Sua mensagem foi removida em **${guild.name}**.`,
        color: LOG_COLORS.automod,
      });

      dm.addFields(
        { name: 'Motivo', value: violation.label },
        { name: 'Punição', value: plannedLabel },
      );

      await member.user.send({ embeds: [dm] }).catch(() => {});

      // Reserva a punição antes da chamada para evitar ações duplicadas
      // quando várias mensagens são processadas ao mesmo tempo.
      punishedUntil.set(punishKey, Date.now() + 20_000);

      try {
        if (settings.punishment === 'timeout') {
          markAction('timeout', guild.id, member.id);
          await member.timeout(duration, reason);
        } else if (settings.punishment === 'kick') {
          markAction('kick', guild.id, member.id);
          markAction('memberRemove', guild.id, member.id);
          await member.kick(reason);
        } else if (settings.punishment === 'ban') {
          markAction('ban', guild.id, member.id);
          markAction('memberRemove', guild.id, member.id);
          await member.ban({ reason });
        }

        actionLabel = plannedLabel;
      } catch (error) {
        console.error('[AutoMod] Falha ao aplicar punição:', error.message);
        punishedUntil.delete(punishKey);

        if (settings.punishment === 'timeout') {
          clearAction('timeout', guild.id, member.id);
        } else {
          clearAction(settings.punishment, guild.id, member.id);
          clearAction('memberRemove', guild.id, member.id);
        }

        actionLabel = 'Mensagem apagada (falha ao punir)';
      }
    }
  }

  await sendLog(guild, {
    title: `🤖 AutoMod • ${violation.label}`,
    color: LOG_COLORS.automod,
    fields: [
      {
        name: 'Usuário',
        value: `${member.user} (\`${member.id}\`)`,
        inline: true,
      },
      { name: 'Canal', value: `<#${message.channelId}>`, inline: true },
      { name: 'Punição', value: actionLabel, inline: true },
      { name: 'Detalhes', value: truncate(violation.details, 1024) },
      { name: 'Mensagem', value: truncate(message.content || '*Sem texto*', 1024) },
    ],
  });
}

async function handleMessage(message) {
  if (!message.inGuild() || message.author.bot || message.system) return;

  trackGhostPing(message);

  if (!message.member || isExempt(message.member)) return;

  const settings = getAutomod(message.guild.id);
  const content = message.content || '';

  if (settings.spam_enabled) {
    const now = Date.now();
    const key = `${message.guild.id}:${message.author.id}`;
    const windowMs = Math.max(settings.spam_window, 1000);
    const timestamps = (spamTracker.get(key) || []).filter((time) => now - time < windowMs);

    timestamps.push(now);
    spamTracker.set(key, timestamps);

    if (timestamps.length >= Math.max(settings.spam_count, 2)) {
      spamTracker.delete(key);
      await handleViolation(message, settings, {
        type: 'spam',
        label: 'Spam / Flood',
        details: `${timestamps.length} mensagens em ${Math.round(windowMs / 1000)}s`,
      });
      return;
    }
  }

  if (settings.invites_enabled && INVITE_REGEX.test(content)) {
    await handleViolation(message, settings, {
      type: 'invites',
      label: 'Convite do Discord',
      details: 'Envio de link de convite não permitido',
    });
    return;
  }

  if (settings.links_enabled) {
    const links = content.match(URL_REGEX) || [];
    const blocked = links.filter((link) => {
      const domain = extractDomain(link);
      return !domain || !isDomainAllowed(domain, settings.allowed_domains);
    });

    if (blocked.length > 0) {
      await handleViolation(message, settings, {
        type: 'links',
        label: 'Link não permitido',
        details: `Link bloqueado: ${truncate(blocked[0], 300)}`,
      });
      return;
    }
  }

  if (settings.mentions_enabled) {
    const mentionCount = message.mentions.users.size
      + message.mentions.roles.size
      + (message.mentions.everyone ? 1 : 0);

    if (mentionCount >= Math.max(settings.mention_limit, 2)) {
      await handleViolation(message, settings, {
        type: 'mentions',
        label: 'Menções em massa',
        details: `${mentionCount} menções em uma única mensagem`,
      });
      return;
    }
  }

  if (settings.badwords_enabled && containsBadWord(content, settings.badwords)) {
    await handleViolation(message, settings, {
      type: 'badwords',
      label: 'Palavra proibida',
      details: 'A mensagem contém um termo bloqueado pelo servidor',
    });
  }
}

const cleanupInterval = setInterval(() => {
  const now = Date.now();

  for (const [key, timestamps] of spamTracker) {
    if (timestamps.length === 0 || now - timestamps[timestamps.length - 1] > 120_000) {
      spamTracker.delete(key);
    }
  }

  for (const [key, until] of punishedUntil) {
    if (until <= now) punishedUntil.delete(key);
  }

  for (const [messageId, data] of ghostMessages) {
    if (now - data.createdAt > 300_000) ghostMessages.delete(messageId);
  }
}, 60_000);

cleanupInterval.unref();

module.exports = { handleMessage, handleGhostPing };
