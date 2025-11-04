require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder,
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const companies = [];
let companyListMessage = null; // reference to the message we’ll update
let companyChannelId = null;   // channel to post the embed in

// Define slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('companyadd')
    .setDescription('Add a company to the list')
    .addStringOption(option =>
      option.setName('name').setDescription('Company name').setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('checkcompany')
    .setDescription('Check if a company is already in the list')
    .addStringOption(option =>
      option.setName('name').setDescription('Company name').setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('companysetchannel')
    .setDescription('Set the channel where the company list should be displayed')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('Select a channel for the company list embed')
        .setRequired(true)
    ),
].map(command => command.toJSON());

// Register slash commands
const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
(async () => {
  try {
    console.log('🔁 Registering slash commands...');
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });
    console.log('✅ Commands registered!');
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
})();

// Helper: Build embed
function buildCompanyEmbed() {
  const embed = new EmbedBuilder()
    .setTitle('📋 Company Tracker')
    .setColor('#5865F2')
    .setDescription(
      companies.length > 0
        ? companies.map((c, i) => `${i + 1}. **${c}**`).join('\n')
        : '_No companies added yet._'
    )
    .setFooter({ text: `Total: ${companies.length}` })
    .setTimestamp();
  return embed;
}

// Update or send the company list embed
async function updateCompanyListEmbed(channel) {
  const embed = buildCompanyEmbed();
  if (companyListMessage) {
    await companyListMessage.edit({ embeds: [embed] });
  } else {
    companyListMessage = await channel.send({ embeds: [embed] });
  }
}

// Ready event
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// Handle interactions
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'companysetchannel') {
    const channel = interaction.options.getChannel('channel');
    companyChannelId = channel.id;
    await interaction.reply(`✅ Company list channel set to ${channel}.`);
    await updateCompanyListEmbed(channel);
    return;
  }

  if (commandName === 'companyadd') {
    const name = interaction.options.getString('name');
    if (companies.includes(name.toLowerCase())) {
      await interaction.reply(`⚠️ **${name}** is already in the list.`);
      return;
    }
    companies.push(name.toLowerCase());
    await interaction.reply(`✅ Added **${name}** to the list.`);

    if (companyChannelId) {
      const channel = await client.channels.fetch(companyChannelId);
      await updateCompanyListEmbed(channel);
    }
    return;
  }

  if (commandName === 'checkcompany') {
    const name = interaction.options.getString('name');
    if (companies.includes(name.toLowerCase())) {
      await interaction.reply(`✅ **${name}** is already in the list.`);
    } else {
      await interaction.reply(`❌ **${name}** is not in the list.`);
    }
  }
});

client.login(process.env.BOT_TOKEN);
