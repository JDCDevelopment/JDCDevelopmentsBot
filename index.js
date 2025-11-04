require('dotenv').config();
const fs = require('fs');
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

let data = {
  companies: [],
  channelId: null,
  messageId: null
};

// Load saved data from companies.json
function loadData() {
  if (fs.existsSync('companies.json')) {
    const fileData = fs.readFileSync('companies.json', 'utf8');
    data = JSON.parse(fileData);
  }
}

// Save data to companies.json
function saveData() {
  fs.writeFileSync('companies.json', JSON.stringify(data, null, 2));
}

// Helper: Build embed
function buildCompanyEmbed() {
  const embed = new EmbedBuilder()
    .setTitle('📋 Company Tracker')
    .setColor('#5865F2')
    .setDescription(
      data.companies.length > 0
        ? data.companies.map((c, i) => `${i + 1}. **${c}**`).join('\n')
        : '_No companies added yet._'
    )
    .setFooter({ text: `Total: ${data.companies.length}` })
    .setTimestamp();
  return embed;
}

// Update or send the company list embed
async function updateCompanyListEmbed(channel) {
  const embed = buildCompanyEmbed();
  try {
    if (data.messageId) {
      const message = await channel.messages.fetch(data.messageId);
      await message.edit({ embeds: [embed] });
    } else {
      const message = await channel.send({ embeds: [embed] });
      data.messageId = message.id;
      saveData();
    }
  } catch (err) {
    console.error('⚠️ Failed to update or fetch message:', err);
    const message = await channel.send({ embeds: [embed] });
    data.messageId = message.id;
    saveData();
  }
}

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

// On startup
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  loadData();
  if (data.channelId) {
    try {
      const channel = await client.channels.fetch(data.channelId);
      await updateCompanyListEmbed(channel);
      console.log('📋 Restored company list embed.');
    } catch (err) {
      console.error('⚠️ Failed to restore embed:', err);
    }
  }
});

// Handle interactions
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'companysetchannel') {
    const channel = interaction.options.getChannel('channel');
    data.channelId = channel.id;
    saveData();
    await interaction.reply(`✅ Company list channel set to ${channel}.`);
    await updateCompanyListEmbed(channel);
    return;
  }

  if (commandName === 'companyadd') {
    const name = interaction.options.getString('name').trim();
    if (data.companies.includes(name.toLowerCase())) {
      await interaction.reply(`⚠️ **${name}** is already in the list.`);
      return;
    }
    data.companies.push(name.toLowerCase());
    saveData();
    await interaction.reply(`✅ Added **${name}** to the list.`);

    if (data.channelId) {
      const channel = await client.channels.fetch(data.channelId);
      await updateCompanyListEmbed(channel);
    }
    return;
  }

  if (commandName === 'checkcompany') {
    const name = interaction.options.getString('name');
    if (data.companies.includes(name.toLowerCase())) {
      await interaction.reply(`✅ **${name}** is already in the list.`);
    } else {
      await interaction.reply(`❌ **${name}** is not in the list.`);
    }
  }
});

client.login(process.env.BOT_TOKEN);
