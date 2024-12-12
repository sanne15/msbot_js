const { Client, GatewayIntentBits, Events, REST, Routes, EmbedBuilder } = require('discord.js');
require('dotenv').config();

// 기존의 botconfig.json 대신 환경변수 사용
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const TOKEN = process.env.TOKEN;

const { capitalQuiz, textGame } = require('./games');
const BotService = require('./services/botService');
const mongodb = require('./db/mongodb');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildScheduledEvents,
        GatewayIntentBits.AutoModerationConfiguration,
        GatewayIntentBits.AutoModerationExecution
    ] 
});

const commands = [
    {
        name: 'capital',
        description: 'Start a capital quiz',
    },
    {
        name: 'help',
        description: 'Get information about the bot commands',
    },
    {
        name: 'ping',
        description: 'Ping the bot',
    },
    {
        name: 'text맞추기',
        description: '텍스트 맞추기 게임을 시작합니다',
        options: [
            {
                name: 'timelimit',
                description: '대기 시간을 설정합니다 (초 단위, 기본값: 10)',
                type: 4,  // INTEGER
                required: false,
                min_value: 5
            },
            {
                name: 'role',
                description: '멘션할 역할을 선택합니다',
                type: 8,  // ROLE
                required: false
            },
            {
                name: 'target_score',
                description: '목표 점수를 설정합니다 (기본값: 50)',
                type: 4,  // INTEGER
                required: false,
                min_value: 10
            }
        ]
    }
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

const botService = new BotService(client, GUILD_ID);

client.once('ready', async () => {
    console.log('Discord bot is ready!');
    await mongodb.connect();
    await mongodb.checkConnection();
});

// 기존의 함수들을 botService의 메서드로 대체
module.exports = {
    getBotStatus: () => botService.getBotStatus(),
    getAccessibleChannels: () => botService.getAccessibleChannels(),
    getRecentMessages: (channelId) => botService.getRecentMessages(channelId),
    getBotInfo: () => botService.getBotInfo()
};

client.login(TOKEN).catch(console.error);

// command interaction 처리
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'ping') {
        const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
        const timeTaken = sent.createdTimestamp - interaction.createdTimestamp;
        await interaction.editReply(`Pong! 🏓 Response time: ${timeTaken}ms`);
    } else if (commandName === 'capital') {
        await capitalQuiz.startQuiz(interaction);
    } else if (commandName === 'help') {
        const helpEmbed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle('도움말 - 봇 명령어')
          .setDescription('사용 가능한 명령어 목록입니다:')
          .addFields(
            { name: '/capital', value: '수도 퀴즈를 시작합니다. 여러 나라의 수도를 맞추는 퀴즈에 참여할 수 있습니다. 60초 동안 진행되며, 정답자 순위도 확인할 수 있습니다.' },
            { name: '/help', value: '봇의 모든 명령어와 사용법을 확인할 수 있습니다. 각 명령어에 대한 자세한 설명을 제공합니다.' },
            { name: '/ping', value: '봇의 응답 시간을 측정합니다. 봇의 현재 연결 상태를 확인할 수 있습니다.' },
            { name: '/text맞추기', value: '텍스트 맞추기 게임을 시작합니다. 주어진 문장을 정확하게 입력하는 게임입니다.' }
          );
    
        await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
    } else if (commandName === 'text맞추기') {
        const timeLimit = interaction.options.getInteger('timelimit') || 10;
        const role = interaction.options.getRole('role') || '<@&1096134050877554719>';
        const targetScore = interaction.options.getInteger('target_score') || 50;
        
        await textGame.startGame(interaction, role, {
            timeLimit: timeLimit,
            scoreCutline: targetScore
        });
    }
});

// 모든 interaction 로그 + 외부 명령어 interaction 전달
client.on(Events.InteractionCreate, async interaction => {
    const { user } = interaction;
  
    console.log(`Interaction received: Type - ${interaction.type}, User - ${user.username}`);
  
    if (interaction.isCommand()) {
        const { commandName } = interaction;
        console.log(`Command interaction by ${user.username}: Command - ${commandName}`);
    } else if (interaction.isButton()) {
        console.log(`Button interaction: Custom ID - ${interaction.customId}`);
        await capitalQuiz.handleButtonInteraction(interaction);
    } else if (interaction.isSelectMenu()) {
        console.log(`Select menu interaction: Custom ID - ${interaction.customId}`);
    } else if (interaction.isAutocomplete()) {
        console.log(`Autocomplete interaction: Command - ${interaction.commandName}`);

        // 자동 완성 상호작용 처리
        const focusedOption = interaction.options.getFocused(true);
        const choices = ['Option1', 'Option2', 'Option3'];
        const filtered = choices.filter(choice => choice.startsWith(focusedOption.value));
        await interaction.respond(
            filtered.map(choice => ({ name: choice, value: choice }))
        );
    } else if (interaction.isModalSubmit()) {
        console.log(`Modal submit interaction: Custom ID - ${interaction.customId}`);
        
        // 모달 제출 상호작용 처리
        const input = interaction.fields.getTextInputValue('inputFieldId');
        await interaction.reply({ content: `You submitted: ${input}`, ephemeral: true });
    }
});