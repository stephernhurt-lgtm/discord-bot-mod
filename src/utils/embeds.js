const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const { getSettings } = require('../database/db');
const { truncate } = require('./text');

const COLORS = {
  success: 0x57f287,
  error: 0xed4245,
  warning: 0xfee75c,
  info: 0x5865f2,
};

function getBrand(guild) {
  if (!guild) {
    return {
      name: config.defaultBrandName,
      color: config.defaultColor,
      logo: null,
    };
  }

  const settings = getSettings(guild.id);
  return {
    name: settings.brand_name || config.defaultBrandName,
    color: settings.brand_color || config.defaultColor,
    logo: settings.brand_logo || null,
  };
}

/**
 * Cria um embed já com a identidade visual do servidor.
 */
function baseEmbed(guild, options = {}) {
  const brand = getBrand(guild);
  const embed = new EmbedBuilder()
    .setColor(options.color || brand.color)
    .setTimestamp();

  const footerText = typeof options.footerText === 'string'
    ? options.footerText
    : brand.name;

  if (options.title) embed.setTitle(truncate(options.title, 256));
  if (options.description) embed.setDescription(truncate(options.description, 4096));

  if (Array.isArray(options.fields) && options.fields.length > 0) {
    const fields = options.fields
      .filter((field) => field && field.name && field.value !== undefined && field.value !== null)
      .slice(0, 25)
      .map((field) => ({
        name: truncate(field.name, 256),
        value: truncate(field.value, 1024),
        inline: Boolean(field.inline),
      }));

    if (fields.length > 0) embed.addFields(fields);
  }

  if (options.image) embed.setImage(options.image);
  if (options.thumbnail) embed.setThumbnail(options.thumbnail);

  if (brand.logo && options.thumbnail !== false) {
    try {
      embed.setThumbnail(brand.logo);
    } catch {
      // URL de logo inválida: ignora.
    }
  }

  try {
    embed.setFooter({
      text: truncate(footerText, 2048),
      iconURL: brand.logo || undefined,
    });
  } catch {
    embed.setFooter({ text: truncate(footerText, 2048) });
  }

  return embed;
}

function successEmbed(guild, title, description) {
  return baseEmbed(guild, {
    title: `✅ ${title}`,
    description,
    color: COLORS.success,
    thumbnail: false,
  });
}

function errorEmbed(guild, title, description) {
  return baseEmbed(guild, {
    title: `❌ ${title}`,
    description,
    color: COLORS.error,
    thumbnail: false,
  });
}

function warningEmbed(guild, title, description) {
  return baseEmbed(guild, {
    title: `⚠️ ${title}`,
    description,
    color: COLORS.warning,
    thumbnail: false,
  });
}

module.exports = {
  COLORS,
  getBrand,
  baseEmbed,
  successEmbed,
  errorEmbed,
  warningEmbed,
};
