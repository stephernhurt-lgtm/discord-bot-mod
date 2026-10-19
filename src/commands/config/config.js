const {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');
const {
  getAutomod,
  getSettings,
  updateSettings,
} = require('../../database/db');
const {
  baseEmbed,
  errorEmbed,
  successEmbed,
} = require('../../utils/embeds');

function normalizeColor(input) {
  const value = String(input).trim().replace(/^#/, '');
  if (!/^[0-9a-f]{6}$/i.test(value)) return null;
  return `#${value.toUpperCase()}`;
}

function isValidLogoUrl(input) {
  try {
    const url = new URL(String(input).trim());
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

module.exports = {
  category: 'Configuração',
  requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
  requiredBotPermissions: [],
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configura a identidade visual e os logs do bot')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) => subcommand
      .setName('marca')
      .setDescription('Define o nome, a cor e o logo da sua marca')
      .addStringOption((option) => option
        .setName('nome')
        .setDescription('Nome que aparece nos embeds do bot')
        .setMaxLength(50))
      .addStringOption((option) => option
        .setName('cor')
        .setDescription('Cor em hexadecimal (ex: #5865F2)')
        .setMinLength(6)
        .setMaxLength(7))
      .addStringOption((option) => option
        .setName('logo')
        .setDescription('URL de uma imagem para usar como logo')
        .setMaxLength(500)))
    .addSubcommand((subcommand) => subcommand
      .setName('logs')
      .setDescription('Define o canal que receberá os logs')
      .addChannelOption((option) => option
        .setName('canal')
        .setDescription('Canal de logs')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)))
    .addSubcommand((subcommand) => subcommand
      .setName('ver')
      .setDescription('Mostra a configuração atual do bot')),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand(false);
    const guild = interaction.guild;

    if (subcommand === 'marca') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const name = interaction.options.getString('nome');
      const colorInput = interaction.options.getString('cor');
      const logo = interaction.options.getString('logo');
      const patch = {};

      if (name) {
        const trimmed = name.trim();
        if (trimmed.length < 2) {
          return interaction.editReply({
            embeds: [errorEmbed(guild, 'Nome inválido', 'O nome precisa ter pelo menos 2 caracteres.')],
          });
        }
        patch.brand_name = trimmed;
      }

      if (colorInput) {
        const color = normalizeColor(colorInput);
        if (!color) {
          return interaction.editReply({
            embeds: [errorEmbed(guild, 'Cor inválida', 'Use o formato hexadecimal, como **#5865F2**.')],
          });
        }
        patch.brand_color = color;
      }

      if (logo) {
        if (!isValidLogoUrl(logo)) {
          return interaction.editReply({
            embeds: [errorEmbed(guild, 'Logo inválido', 'Informe uma URL válida começando com **http://** ou **https://**.')],
          });
        }
        patch.brand_logo = logo.trim();
      }

      if (Object.keys(patch).length === 0) {
        return interaction.editReply({
          embeds: [errorEmbed(
            guild,
            'Nada para alterar',
            'Informe pelo menos um dos campos: **nome**, **cor** ou **logo**.',
          )],
        });
      }

      const settings = updateSettings(guild.id, patch);

      const embed = baseEmbed(guild, {
        title: '🎨 Identidade visual atualizada',
        description: 'Esta é uma prévia de como a sua marca aparecerá nos embeds do bot.',
        color: settings.brand_color,
      });

      embed.addFields(
        { name: 'Nome', value: settings.brand_name, inline: true },
        { name: 'Cor', value: `\`${settings.brand_color}\``, inline: true },
        {
          name: 'Logo',
          value: settings.brand_logo
            ? `[Abrir imagem](${settings.brand_logo})`
            : 'Não definido',
          inline: true,
        },
      );

      return interaction.editReply({ embeds: [embed] });
    }

    if (subcommand === 'logs') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const channel = interaction.options.getChannel('canal', true);
      const me = guild.members.me;

      if (!me) {
        return interaction.editReply({
          embeds: [errorEmbed(guild, 'Bot não carregado', 'Aguarde alguns segundos e tente novamente.')],
        });
      }

      const permissions = channel.permissionsFor(me);

      if (!channel.isTextBased()) {
        return interaction.editReply({
          embeds: [errorEmbed(guild, 'Canal inválido', 'Selecione um canal de texto.')],
        });
      }

      const required = [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
      ];

      if (!permissions || !permissions.has(required)) {
        return interaction.editReply({
          embeds: [errorEmbed(
            guild,
            'Sem permissão no canal',
            `O bot precisa de **Ver Canal**, **Enviar Mensagens** e **Inserir Links** em <#${channel.id}>.`,
          )],
        });
      }

      try {
        await channel.send({
          embeds: [baseEmbed(guild, {
            title: '✅ Logs ativados',
            description: 'Este canal foi definido para receber os logs de moderação, AutoMod e eventos do servidor.',
            color: 0x57f287,
            thumbnail: false,
          })],
        });
      } catch (error) {
        console.error('[Config] Falha ao enviar teste de logs:', error);

        return interaction.editReply({
          embeds: [errorEmbed(
            guild,
            'Falha ao enviar mensagem',
            'Não foi possível enviar a mensagem de teste. Verifique as permissões do bot no canal.',
          )],
        });
      }

      updateSettings(guild.id, { log_channel_id: channel.id });

      return interaction.editReply({
        embeds: [successEmbed(
          guild,
          'Canal de logs definido',
          `Os logs agora serão enviados em <#${channel.id}>.`,
        )],
      });
    }

    if (subcommand === 'ver') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const settings = getSettings(guild.id);
      const automod = getAutomod(guild.id);

      const modules = [
        ['Spam / Flood', automod.spam_enabled],
        ['Convites do Discord', automod.invites_enabled],
        ['Links externos', automod.links_enabled],
        ['Menções em massa', automod.mentions_enabled],
        ['Palavras proibidas', automod.badwords_enabled],
        ['Ghost Ping', automod.ghostping_enabled],
      ];

      const activeModules = modules.filter(([, enabled]) => enabled).length;

      const embed = baseEmbed(guild, {
        title: '⚙️ Configuração do servidor',
        color: settings.brand_color,
        fields: [
          { name: 'Nome da marca', value: settings.brand_name, inline: true },
          { name: 'Cor', value: `\`${settings.brand_color}\``, inline: true },
          {
            name: 'Logo',
            value: settings.brand_logo ? 'Definido' : 'Não definido',
            inline: true,
          },
          {
            name: 'Canal de logs',
            value: settings.log_channel_id
              ? `<#${settings.log_channel_id}>`
              : 'Não definido',
            inline: true,
          },
          {
            name: 'AutoMod',
            value: `${activeModules}/6 módulos ativos`,
            inline: true,
          },
          {
            name: 'Advertências',
            value: automod.warn_autoban
              ? `Auto-ban após ${automod.warn_threshold}`
              : 'Auto-ban desativado',
            inline: true,
          },
        ],
      });

      return interaction.editReply({ embeds: [embed] });
    }

    return interaction.editReply({
      embeds: [errorEmbed(guild, 'Subcomando inválido', 'Use /config marca, /config logs ou /config ver.')],
    }).catch(() => {});
  },
};
