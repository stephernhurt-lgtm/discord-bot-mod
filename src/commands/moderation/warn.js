const {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');
const {
  addWarning,
  getAutomod,
  logCase,
} = require('../../database/db');
const { baseEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { canModerate } = require('../../utils/permissions');
const { logModeration } = require('../../utils/logger');
const { markAction, clearAction } = require('../../utils/actionTracker');
const { truncate } = require('../../utils/text');

module.exports = {
  category: 'Moderação',
  requiredUserPermissions: [PermissionFlagsBits.ModerateMembers],
  requiredBotPermissions: [],
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Aplica uma advertência a um usuário')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) => option
      .setName('usuario')
      .setDescription('Usuário que receberá a advertência')
      .setRequired(true))
    .addStringOption((option) => option
      .setName('motivo')
      .setDescription('Motivo da advertência')
      .setRequired(true)
      .setMaxLength(400)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    const user = interaction.options.getUser('usuario', true);
    const reason = interaction.options.getString('motivo', true);
    const automod = getAutomod(guild.id);

    if (user.id === interaction.user.id) {
      return interaction.editReply({
        embeds: [errorEmbed(guild, 'Ação inválida', 'Você não pode advertir a si mesmo.')],
      });
    }

    const { id: warningId, count } = addWarning(
      guild.id,
      user.id,
      interaction.user.id,
      reason,
    );

    const dm = baseEmbed(guild, {
      title: '⚠️ Você recebeu uma advertência',
      description: `Uma advertência foi registrada na sua conta em **${guild.name}**.`,
      color: 0xfee75c,
    });

    dm.addFields(
      { name: 'Motivo', value: truncate(reason, 1024) },
      { name: 'Advertência', value: `#${warningId}`, inline: true },
      { name: 'Total', value: `${count}`, inline: true },
    );

    if (automod.warn_autoban) {
      dm.addFields({
        name: 'Atenção',
        value: `Ao atingir **${automod.warn_threshold}** advertências, o banimento é automático.`,
      });
    }

    await user.send({ embeds: [dm] }).catch(() => {});

    await logModeration(guild, {
      action: 'Advertência',
      moderator: interaction.user,
      target: user,
      reason,
      extra: `Advertência #${warningId} • Total: ${count}`,
    });

    let autoBanned = false;

    if (automod.warn_autoban && count >= automod.warn_threshold) {
      const member = await guild.members.fetch(user.id).catch(() => null);

      if (member && canModerate(interaction.member, member, guild)) {
        try {
          const banReason = `Auto-ban: ${count} advertências (limite: ${automod.warn_threshold})`;

          markAction('ban', guild.id, user.id);
          markAction('memberRemove', guild.id, user.id);

          await member.ban({ reason: `${interaction.user.tag}: ${banReason}` });
          autoBanned = true;

          const caseId = logCase(
            guild.id,
            'autoban',
            user.id,
            interaction.user.id,
            banReason,
          );

          await logModeration(guild, {
            action: 'Auto-ban por advertências',
            moderator: interaction.user,
            target: user,
            reason: banReason,
            caseId,
          });
        } catch (error) {
          console.error('[Warn] Falha no auto-ban:', error);
          clearAction('ban', guild.id, user.id);
          clearAction('memberRemove', guild.id, user.id);
        }
      }
    }

    let description = `**${user.tag}** recebeu uma advertência.\n\n`
      + `**Motivo:** ${reason}\n`
      + `**Advertência:** #${warningId}\n`
      + `**Total:** ${count}`;

    if (autoBanned) {
      description += `\n\n🚨 O limite de **${automod.warn_threshold}** advertências foi atingido. O usuário foi **banido automaticamente**.`;
    } else if (automod.warn_autoban) {
      description += `\n\n**Auto-ban:** ${count}/${automod.warn_threshold}`;
    }

    return interaction.editReply({
      embeds: [successEmbed(guild, 'Advertência aplicada', description)],
    });
  },
};
