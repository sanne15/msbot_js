const { ChannelType } = require('discord.js');

class BotService {
    constructor(client, guildId) {
        this.client = client;
        this.guildId = guildId;
    }

    async getBotStatus() {
        return this.client.isReady() ? 'Online' : 'Offline';
    }

    async getAccessibleChannels() {
        const guild = this.client.guilds.cache.get(this.guildId);
        if (!guild) return [];
        return guild.channels.cache
            .filter(channel => channel.type === ChannelType.GuildText)
            .map(channel => ({ 
                id: channel.id, 
                name: channel.name, 
                parent: channel.parent ? channel.parent.name : null 
            }));
    }

    async getRecentMessages(channelId) {
        const channel = this.client.channels.cache.get(channelId);
        if (!channel || channel.type !== ChannelType.GuildText) return [];
        
        const messages = await channel.messages.fetch({ limit: 15 });
        return messages.map(message => {
            const imageUrl = message.attachments.size > 0 ? 
                message.attachments.first().url : null;
            return {
                id: message.id,
                content: message.content,
                author: message.author.username,
                timestamp: message.createdTimestamp,
                imageUrl: imageUrl
            };
        });
    }

    async getBotInfo() {
        const guild = this.client.guilds.cache.get(this.guildId);
        if (!guild) {
            return { 
                clientId: this.client.user.id, 
                guildName: '', 
                guildId: '' 
            };
        }
        
        return { 
            clientId: this.client.user.id, 
            guildName: guild.name, 
            guildId: guild.id 
        };
    }
}

module.exports = BotService; 