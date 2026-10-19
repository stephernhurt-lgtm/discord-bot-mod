const {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');
const { getAutomod, updateAutomod } = require('../../database/db');
const {
  baseEmbed,
  errorEmbed,
  successEmbed,
} = require('../../utils/embeds');
const { parseDuration, formatDuration } = require('../../utils/time');
const { truncate } = require('../../utils/text');

const MAX_TIMEOUT = 28 * 86_400_000;

const MODULE_COLUMNS = {
  spam: 'spam_enabled',
  invites: 'invites_enabled',
  links: 'links_enabled',
  mentions: 'mentions_enabled',
  badwords: 'badwords_enabled',
  ghostping: 'ghostping_enabled',
};

const MODULE_LABELS = {
  spam: 'Spam / Flood',
  invites: 'Convites do Discord',
  links: 'Links externos',
  mentions: 'Menções em massa',
  badwords: 'Palavras proibidas',
  ghostping: 'Ghost Ping',
};

const PUNISHMENT_LABELS = {
  delete: 'Apagar mensagem',
  timeout: 'Silenciar',
  kick: 'Expulsar',
  ban: 'Banir',
};

function punishmentDescription(automod) {
  if (automod.punishment === 'timeout') {
    return `${PUNISHMENT_LABELS.timeout} (${formatDuration(automod.timeout_duration)})`;
  }
  return PUNISHMENT_LABELS[automod.punishment] || automod.punishment;
}

function normalizeDomain(input) {
  let value = String(input).trim().toLowerCase();

  value = value
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .split('?')[0]
    .split('#')[0]
    .split(':')[0]
    .replace(/^www\./, '');

  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(value)) return null;
  return value;
}

function buildStatusEmbed(guild) {
  const automod = getAutomod(guild.id);

  const modules = Object.entries(MODULE_LABELS)
    .map(([key, label]) => `${automod[MODULE_COLUMNS[key]] ? '✅' : '❌'} ${label}`)
    .join('\n');

  const embed = baseEmbed(guild, {
    title: '🤖 Configuração do AutoMod',
    color: automod.punishment === 'delete' ? 0x5865f2 : 0xeb459e,
    fields: [
      { name: 'Módulos', value: modules, inline: true },
      {
        name: 'Punição',
        value: punishmentDescription(automod),
        inline: true,
      },
      {
        name: 'Limites',
        value: [
          `Spam: **${automod.spam_count} msgs / ${Math.round(automod.spam_window / 1000)}s**`,
          `Menções: **${automod.mention_limit}**`,
          `Timeout: **${formatDuration(automod.timeout_duration)}**`,
        ].join('\n'),
        inline: true,
      },
      {
        name: 'Advertências',
        value: automod.warn_autoban
          ? `Auto-ban após **${automod.warn_threshold}**`
          : 'Auto-ban desativado',
        inline: true,
      },
      {
        name: 'Palavras proibidas',
        value: `${automod.badwords.length} cadastrada(s)`,
        inline: true,
      },
      {
        name: 'Links permitidos',
        value: `${automod.allowed_domains.length} domínio(s) na whitelist`,
        inline: true,
      },
    ],
  });

  return embed;
}

module.exports = {
  category: 'Configuração',
  requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
  requiredBotPermissions: [],
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Configura a proteção automática do servidor')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) => subcommand
      .setName('status')
      .setDescription('Mostra a configuração atual do AutoMod'))
    .addSubcommand((subcommand) => subcommand
      .setName('alternar')
      .setDescription('Liga ou desliga um módulo do AutoMod')
      .addStringOption((option) => option
        .setName('modulo')
        .setDescription('Módulo que será alterado')
        .setRequired(true)
        .addChoices(
          { name: 'Spam / Flood', value: 'spam' },
          { name: 'Convites do Discord', value: 'invites' },
          { name: 'Links externos', value: 'links' },
          { name: 'Menções em massa', value: 'mentions' },
          { name: 'Palavras proibidas', value: 'badwords' },
          { name: 'Ghost Ping', value: 'ghostping' },
        ))
      .addBooleanOption((option) => option
        .setName('ativo')
        .setDescription('Ativar ou desativar')
        .setRequired(true)))
    .addSubcommand((subcommand) => subcommand
      .setName('punicao')
      .setDescription('Define a punição aplicada pelo AutoMod')
      .addStringOption((option) => option
        .setName('tipo')
        .setDescription('Punição aplicada ao infrator')
        .setRequired(true)
        .addChoices(
          { name: 'Apenas apagar a mensagem', value: 'delete' },
          { name: 'Silenciar (timeout)', value: 'timeout' },
          { name: 'Expulsar do servidor', value: 'kick' },
          { name: 'Banir do servidor', value: 'ban' },
        ))
      .addStringOption((option) => option
        .setName('duracao')
        .setDescription('Duração do timeout (ex: 10m, 1h, 1d)')
        .setMaxLength(20)))
    .addSubcommand((subcommand) => subcommand
      .setName('limites')
      .setDescription('Ajusta os limites de detecção e o auto-ban por advertências')
      .addIntegerOption((option) => option
        .setName('spam_mensagens')
        .setDescription('Mensagens na janela que disparam a punição (2 a 30)')
        .setMinValue(2)
        .setMaxValue(30))
      .addIntegerOption((option) => option
        .setName('spam_segundos')
        .setDescription('Janela de detecção de spam em segundos (2 a 120)')
        .setMinValue(2)
        .setMaxValue(120))
      .addIntegerOption((option) => option
        .setName('mencoes')
        .setDescription('Menções necessárias para punir (2 a 30)')
        .setMinValue(2)
        .setMaxValue(30))
      .addIntegerOption((option) => option
        .setName('avisos')
        .setDescription('Advertências necessárias para o auto-ban (1 a 20)')
        .setMinValue(1)
        .setMaxValue(20))
      .addBooleanOption((option) => option
        .setName('autoban')
        .setDescription('Ativar ou desativar o banimento automático por advertências')))
    .addSubcommand((subcommand) => subcommand
      .setName('palavras')
      .setDescription('Gerencia a lista de palavras proibidas')
      .addStringOption((option) => option
        .setName('acao')
        .setDescription('Adicionar, remover ou listar')
        .setRequired(true)
        .addChoices(
          { name: 'Adicionar', value: 'adicionar' },
          { name: 'Remover', value: 'remover' },
          { name: 'Listar', value: 'listar' },
        ))
      .addStringOption((option) => option
        .setName('palavra')
        .setDescription('Palavra ou frase (obrigatório para adicionar/remover)')
        .setMaxLength(80)))
    .addSubcommand((subcommand) => subcommand
      .setName('links')
      .setDescription('Gerencia a whitelist de domínios permitidos')
      .addStringOption((option) => option
        .setName('acao')
        .setDescription('Adicionar, remover ou listar')
        .setRequired(true)
        .addChoices(
          { name: 'Adicionar', value: 'adicionar' },
          { name: 'Remover', value: 'remover' },
          { name: 'Listar', value: 'listar' },
        ))
      .addStringOption((option) => option
        .setName('dominio')
        .setDescription('Domínio permitido (ex: youtube.com)')
        .setMaxLength(100))),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    const subcommand = interaction.options.getSubcommand(true);

    if (subcommand === 'status') {
      return interaction.editReply({ embeds: [buildStatusEmbed(guild)] });
    }

    if (subcommand === 'alternar') {
      const moduleKey = interaction.options.getString('modulo', true);
      const enabled = interaction.options.getBoolean('ativo', true);
      const column = MODULE_COLUMNS[moduleKey];

      if (!column) {
        return interaction.editReply({
          embeds: [errorEmbed(guild, 'Módulo inválido', 'Selecione um módulo válido.')],
        });
      }

      updateAutomod(guild.id, { [column]: enabled });

      return interaction.editReply({
        embeds: [successEmbed(
          guild,
          enabled ? 'Módulo ativado' : 'Módulo desativado',
          `**${MODULE_LABELS[moduleKey]}** foi ${enabled ? 'ativado' : 'desativado'}.`,
        )],
      });
    }

    if (subcommand === 'punicao') {
      const type = interaction.options.getString('tipo', true);
      const durationInput = interaction.options.getString('duracao');
      const patch = { punishment: type };

      if (durationInput) {
        const duration = parseDuration(durationInput);

        if (duration === null || duration < 1000 || duration > MAX_TIMEOUT) {
          return interaction.editReply({
            embeds: [errorEmbed(
              guild,
              'Duração inválida',
              'Use formatos como **10m**, **1h** ou **1d**. O máximo é de **28 dias**.',
            )],
          });
        }

        patch.timeout_duration = duration;
      }

      const automod = updateAutomod(guild.id, patch);

      return interaction.editReply({
        embeds: [successEmbed(
          guild,
          'Punição atualizada',
          `O AutoMod agora aplicará: **${punishmentDescription(automod)}**.`,
        )],
      });
    }

    if (subcommand === 'limites') {
      const spamCount = interaction.options.getInteger('spam_mensagens');
      const spamSeconds = interaction.options.getInteger('spam_segundos');
      const mentions = interaction.options.getInteger('mencoes');
      const warnings = interaction.options.getInteger('avisos');
      const autoBan = interaction.options.getBoolean('autoban');
      const patch = {};

      if (spamCount !== null) patch.spam_count = spamCount;
      if (spamSeconds !== null) patch.spam_window = spamSeconds * 1000;
      if (mentions !== null) patch.mention_limit = mentions;
      if (warnings !== null) patch.warn_threshold = warnings;
      if (autoBan !== null) patch.warn_autoban = autoBan;

      if (Object.keys(patch).length === 0) {
        return interaction.editReply({
          embeds: [errorEmbed(
            guild,
            'Nada para alterar',
            'Informe pelo menos um limite ou a opção **autoban**.',
          )],
        });
      }

      const automod = updateAutomod(guild.id, patch);

      return interaction.editReply({
        embeds: [baseEmbed(guild, {
          title: '📏 Limites atualizados',
          color: 0x57f287,
          thumbnail: false,
          fields: [
            {
              name: 'Spam',
              value: `${automod.spam_count} mensagens em ${Math.round(automod.spam_window / 1000)}s`,
              inline: true,
            },
            { name: 'Menções', value: `${automod.mention_limit}`, inline: true },
            {
              name: 'Auto-ban',
              value: automod.warn_autoban
                ? `Após ${automod.warn_threshold} advertências`
                : 'Desativado',
              inline: true,
            },
          ],
        })],
      });
    }

    if (subcommand === 'palavras') {
      const action = interaction.options.getString('acao', true);
      const wordInput = interaction.options.getString('palavra');
      const automod = getAutomod(guild.id);

      if (action === 'listar') {
        if (automod.badwords.length === 0) {
          return interaction.editReply({
            embeds: [baseEmbed(guild, {
              title: '🚫 Palavras proibidas',
              description: 'Nenhuma palavra cadastrada.',
              thumbnail: false,
            })],
          });
        }

        const list = automod.badwords
          .slice(0, 100)
          .map((word) => `\`${word}\``)
          .join(', ');

        return interaction.editReply({
          embeds: [baseEmbed(guild, {
            title: '🚫 Palavras proibidas',
            description: truncate(list, 3900),
            fields: [{ name: 'Total', value: `${automod.badwords.length}`, inline: true }],
            thumbnail: false,
          })],
        });
      }

      if (!wordInput || wordInput.trim().length < 2) {
        return interaction.editReply({
          embeds: [errorEmbed(guild, 'Palavra inválida', 'Informe uma palavra ou frase com pelo menos 2 caracteres.')],
        });
      }

      const word = wordInput.trim().toLowerCase();
      const exists = automod.badwords.some((item) => item.toLowerCase() === word);

      if (action === 'adicionar') {
        if (exists) {
          return interaction.editReply({
            embeds: [errorEmbed(guild, 'Palavra já cadastrada', `\`${word}\` já está na lista.`)],
          });
        }

        if (automod.badwords.length >= 100) {
          return interaction.editReply({
            embeds: [errorEmbed(guild, 'Limite atingido', 'A lista permite no máximo **100** palavras.')],
          });
        }

        updateAutomod(guild.id, { badwords: [...automod.badwords, word] });

        return interaction.editReply({
          embeds: [successEmbed(guild, 'Palavra adicionada', `\`${word}\` foi adicionada à lista de palavras proibidas.`)],
        });
      }

      if (action === 'remover') {
        if (!exists) {
          return interaction.editReply({
            embeds: [errorEmbed(guild, 'Palavra não encontrada', `\`${word}\` não está na lista.`)],
          });
        }

        const updated = automod.badwords.filter((item) => item.toLowerCase() !== word);
        updateAutomod(guild.id, { badwords: updated });

        return interaction.editReply({
          embeds: [successEmbed(guild, 'Palavra removida', `\`${word}\` foi removida da lista.`)],
        });
      }
    }

    if (subcommand === 'links') {
      const action = interaction.options.getString('acao', true);
      const domainInput = interaction.options.getString('dominio');
      const automod = getAutomod(guild.id);

      if (action === 'listar') {
        if (automod.allowed_domains.length === 0) {
          return interaction.editReply({
            embeds: [baseEmbed(guild, {
              title: '🔗 Domínios permitidos',
              description: 'Nenhum domínio cadastrado. Quando o filtro de links está ativo, todos os links são bloqueados.',
              thumbnail: false,
            })],
          });
        }

        return interaction.editReply({
          embeds: [baseEmbed(guild, {
            title: '🔗 Domínios permitidos',
            description: automod.allowed_domains
              .map((domain) => `\`${domain}\``)
              .join('\n'),
            fields: [{ name: 'Total', value: `${automod.allowed_domains.length}`, inline: true }],
            thumbnail: false,
          })],
        });
      }

      const domain = domainInput ? normalizeDomain(domainInput) : null;

      if (!domain) {
        return interaction.editReply({
          embeds: [errorEmbed(guild, 'Domínio inválido', 'Informe um domínio válido, como **youtube.com**.')],
        });
      }

      const exists = automod.allowed_domains.includes(domain);

      if (action === 'adicionar') {
        if (exists) {
          return interaction.editReply({
            embeds: [errorEmbed(guild, 'Domínio já cadastrado', `\`${domain}\` já está na whitelist.`)],
          });
        }

        if (automod.allowed_domains.length >= 100) {
          return interaction.editReply({
            embeds: [errorEmbed(guild, 'Limite atingido', 'A whitelist permite no máximo **100** domínios.')],
          });
        }

        updateAutomod(guild.id, {
          allowed_domains: [...automod.allowed_domains, domain],
        });

        return interaction.editReply({
          embeds: [successEmbed(guild, 'Domínio adicionado', `\`${domain}\` agora é permitido quando o filtro de links estiver ativo.`)],
        });
      }

      if (action === 'remover') {
        if (!exists) {
          return interaction.editReply({
            embeds: [errorEmbed(guild, 'Domínio não encontrado', `\`${domain}\` não está na whitelist.`)],
          });
        }

        updateAutomod(guild.id, {
          allowed_domains: automod.allowed_domains.filter((item) => item !== domain),
        });

        return interaction.editReply({
          embeds: [successEmbed(guild, 'Domínio removido', `\`${domain}\` foi removido da whitelist.`)],
        });
      }
    }

    return interaction.editReply({
      embeds: [errorEmbed(guild, 'Subcomando inválido', 'Use /automod status para ver as opções.')],
    });
  },
};
