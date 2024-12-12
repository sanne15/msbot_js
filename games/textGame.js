const { ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
require('dotenv').config();

class TextGame {
    constructor() {
        this.gameStarted = false;
        this.players = [];
        this.scores = {};
        this.scoreCutline = parseInt(process.env.DEFAULT_SCORE_CUTLINE) || 50;
        this.roundNum = 1;
        this.channelList = [];
        this.startMessage = null;
        this.gameChannelName = process.env.GAME_CHANNEL_NAME || '마식봇';
    }

    async startGame(interaction, mentionRole = `<@&${process.env.DEFAULT_MENTION_ROLE}>` ,options = { 
        timeLimit: parseInt(process.env.DEFAULT_TIME_LIMIT) || 10, 
        scoreCutline: parseInt(process.env.DEFAULT_SCORE_CUTLINE) || 50 
    }) {
        if (this.gameStarted) {
            await interaction.reply("게임이 이미 시작되었습니다.");
            return;
        }

        if (interaction.channel.name !== '마식봇') {
            await interaction.reply("마식봇 채널에서만 게임 진행이 가능합니다.");
            return;
        }

        this.gameStarted = true;
        this.players = [];
        this.scores = {};
        this.scoreCutline = options.scoreCutline;
        
        try {
            // 먼저 interaction에 응답
            await interaction.reply('게임을 시작합니다!');
            
            // 초기 임베드 생성
            const gameEmbed = new EmbedBuilder()
                .setTitle('텍스트 게임')
                .setDescription('게임 참가자를 모집합니다! ✅ 로 참가해주세요.')
                .setColor('#7289da')
                .setFooter({ text: `${options.timeLimit}초 안에 반응해주세요.` });

            // channel.send로 게임 메시지 전송
            const gameMessage = await interaction.channel.send({
                content: `${mentionRole}`,
                embeds: [gameEmbed]
            });

            // 리액션 추가
            await gameMessage.react("✅");

            // 플레이어 모집
            this.players = await this.getPlayers(gameMessage, options.timeLimit);

            // await interaction.channel.send(`플레이어 모집 완료! 총 ${this.players.length}명이 참가했어요!`);
            
            // 메시지가 여전히 존재하는지 확인
            try {
                await interaction.channel.messages.fetch(gameMessage.id);
            } catch (error) {
                console.error('메시지를 찾을 수 없음:', error);
                return await interaction.channel.send('게임이 중단되었습니다. 다시 시작해주세요.');
            }
            
            if (!this.players.length) {
                try {
                    // 플레이어가 없는 경우 임베드 업데이트
                    gameEmbed
                        .setDescription('참가자가 없어 게임이 취소되었습니다.')
                        .setColor('#ff0000')
                        .setFooter({ text: '게임 종료' });
                    
                    await gameMessage.edit({ embeds: [gameEmbed] });
                } catch (error) {
                    console.error('메시지 수정 실패:', error);
                    await interaction.channel.send('참가자가 없어 게임이 취소되었습니다.');
                }
                this.gameStarted = false;
                return;
            }

            try {
                // 참가자 목록으로 임베드 업데이트
                gameEmbed
                    .setDescription('게임을 시작해 볼까요?')
                    .addFields({
                        name: '참가자',
                        value: this.players.map(p => p.username).join('\n')
                    })
                    .setFooter({ text: '게임을 시작합니다!' });

                await gameMessage.edit({ embeds: [gameEmbed] });
            } catch (error) {
                console.error('메시지 수정 실패:', error);
                // 수정 실패 시 새 메시지 전송
                await interaction.channel.send({
                    content: '게임 진행 중 오류가 발생했습니다.',
                    embeds: [gameEmbed]
                });
            }
            
        } catch (error) {
            console.error('게임 시작 중 오류 발생:', error);
            this.gameStarted = false;
            await interaction.channel.send('게임 진행 중 오류가 발생했습니다. 다시 시작해주세요.');
        }

        try {
            const thread = await interaction.channel.threads.create({
                name: `text맞추기 스레드 ${new Date().toISOString()}`,
                autoArchiveDuration: 60
            });

            await thread.send("게임 쓰레드를 생성했어요!");
            const startemb = new EmbedBuilder()
                .setTitle('게임시작')
                .setDescription("게임 참가자가 모두 모였습니다. 이제부터 게임을 시작하겠습니다.")
                .setColor('#00ff00')
                .addFields({ 
                    name: '참가링크', 
                    value: `여기에서 게임에 참가하세요! : ${thread.toString()}`, 
                    inline: false 
                });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('join_midgame')
                        .setLabel('중도참가')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('force_end')
                        .setLabel('강제종료')
                        .setStyle(ButtonStyle.Danger)
                );

            this.startMessage = await interaction.channel.send({ 
                embeds: [startemb], 
                components: [row] 
            });

            // 버튼 이벤트 수집기
            const collector = this.startMessage.createMessageComponentCollector({ 
                time: 1000 * 60 * 20  // 20분
            });

            collector.on('collect', async i => {
                // 상호작용 확인
                if (!i.isButton()) return;

                // 즉시 응답
                if (i.customId === 'join_midgame') {
                    try {
                        await i.reply({ 
                            content: '아직 미구현된 기능입니다!', 
                            ephemeral: true 
                        });
                    } catch (error) {
                        console.error('중도참가 버튼 처리 중 오류:', error);
                    }
                }
                else if (i.customId === 'force_end') {
                    try {
                        // 먼저 버튼 비활성화
                        const disabledRow = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('join_midgame')
                                    .setLabel('중도참가')
                                    .setStyle(ButtonStyle.Success)
                                    .setDisabled(true),
                                new ButtonBuilder()
                                    .setCustomId('force_end')
                                    .setLabel('강제종료')
                                    .setStyle(ButtonStyle.Danger)
                                    .setDisabled(true)
                            );

                        // 메시지 수정
                        const endEmbed = EmbedBuilder.from(startemb)
                            .setColor('#ff0000')
                            .setFooter({ text: '게임이 강제 종료되었습니다.' });

                        await this.startMessage.edit({
                            embeds: [endEmbed],
                            components: [disabledRow]
                        });

                        // 게임 종료 처리
                        this.gameStarted = false;
                        await thread.send("게임이 강제 종료되었습니다.");
                        await thread.setArchived(true);

                        // 상호작용 응답
                        await i.reply({ 
                            content: '게임을 강제 종료했습니다.', 
                            ephemeral: true 
                        });

                    } catch (error) {
                        console.error('강제종료 처리 중 오류:', error);
                        try {
                            await i.reply({ 
                                content: '게임 종료 중 오류가 발생했습니다.', 
                                ephemeral: true 
                            });
                        } catch (replyError) {
                            console.error('오류 응답 중 추가 오류:', replyError);
                        }
                    }
                }
            });

            collector.on('end', () => {
                // 컬렉터 종료 시 버튼 비활성화
                try {
                    const disabledRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('join_midgame')
                                .setLabel('중도참가')
                                .setStyle(ButtonStyle.Success)
                                .setDisabled(true),
                            new ButtonBuilder()
                                .setCustomId('force_end')
                                .setLabel('강제종료')
                                .setStyle(ButtonStyle.Danger)
                                .setDisabled(true)
                        );

                    this.startMessage.edit({ components: [disabledRow] }).catch(console.error);
                } catch (error) {
                    console.error('컬렉터 종료 처리 중 오류:', error);
                }
            });

            await thread.send("게임을 시작할게요~");

            // 서버 멤버 목록 생성
            const memberList = interaction.guild.members.cache
                .filter(member => !member.user.bot)  // 봇 제외
                .map(member => `${member.displayName} - ${member.user.tag}`)  // nickname - tag 형식
                .join('\n');
            
            const guideEmbed = new EmbedBuilder()
                .setTitle('서버 멤버 목록')
                .setDescription('정답을 입력할 때는 태그를 입력해주세요!\n대소문자는 구분하지 않으며, 특수문자는 무시됩니다.\n예시: `hyunjun___`를 `hyUnJ!un`로 입력해도 정답')
                .addFields({ 
                    name: '닉네임 - 태그 목록', 
                    value: `\`\`\`\n${memberList}\n\`\`\``,
                    inline: false 
                })
                .setColor('#00ff00')
                .setFooter({ text: '게임이 곧 시작됩니다!' });

            await thread.send({ embeds: [guideEmbed] });

            const resultEmbed = await this.startRounds(thread, interaction);
            await interaction.channel.send({ embeds: [resultEmbed] });
            await thread.send("히히 이 스레드는 저장완료되었어요~");
            await thread.setArchived(true);

        } catch (error) {
            console.error(error);
            await interaction.channel.send("게임 진행 중 오류가 발생했습니다.");
        }
    }

    async getPlayers(botMsg, time) {
        const filter = (reaction, user) => {
            return reaction.emoji.name === '✅' && !user.bot;
        };

        try {
            const collected = await botMsg.awaitReactions({ 
                filter, 
                time: time * 1000 
            });
            
            const players = [...collected.first()?.users.cache.values() || []]
                .filter(user => !user.bot);

            // await botMsg.delete();
            return players;
        } catch (error) {
            console.error(error);
            await botMsg.channel.send("시간이 종료되었습니다. 다음에 다시 시도해주십시오");
            return [];
        }
    }

    async startRounds(thread, interaction) {        
        
        // 채널 필터링 수정
        const channels = [...interaction.guild.channels.cache
            .filter(channel => 
                channel.type === ChannelType.GuildText && // 텍스트 채널인지 확인
                channel.viewable && // 봇이 볼 수 있는 채널인지 확인
                channel.permissionsFor(interaction.guild.members.me).has('ViewChannel', 'ReadMessageHistory') // 필요한 권한 확인
            ).values()];

        if (channels.length === 0) {
            await thread.send("접근 가능한 채널이 없습니다.");
            this.gameStarted = false;
            return;
        }

        this.roundNum = 1;

        while (this.gameStarted) {
            const tmpChannel = channels[Math.floor(Math.random() * channels.length)];
            await thread.send({
                embeds: [new EmbedBuilder()
                    .setTitle(`Round ${this.roundNum}`)
                    .setDescription(`Chose Channel : ${tmpChannel.name}`)
                    .setColor('#00ff00')]
            });

            let messages = [];

            // 메시지 가져오기
            try {
                // 현재 시간부터 2주 전까지의 랜덤한 시간 생성
                const now = Date.now();
                const twoWeeksAgo = now - (14 * 24 * 60 * 60 * 1000);
                const randomTimestamp = Math.floor(Math.random() * (now - twoWeeksAgo) + twoWeeksAgo);
                
                // 랜덤 시간 기준으로 메시지 fetch
                const fetchedMessages = await tmpChannel.messages.fetch({ 
                    limit: 100,
                    around: randomTimestamp.toString()
                });
                
                messages = [...fetchedMessages.values()];
                
                // 메시지가 너무 적으면 다시 시도
                if (messages.length < 10) {
                    await thread.send(`채널 ${tmpChannel.name}에서 충분한 메시지를 찾지 못했습니다. 다시 시도합니다.`);
                    continue;
                }
                
            } catch (error) {
                console.log(`메시지 fetch 실패 (채널: ${tmpChannel.name}):`, error);
                await thread.send("이 채널에서는 메시지를 가져올 수 없네요. 다른 채널을 시도합니다.");
                continue;
            }

            // 너무 길면 안되니까 필터링
            messages = messages
                .filter(msg => !msg.author.bot && !msg.content.startsWith("&") 
                    && msg.content.length < 2000 && msg.content.length > 2);
            
            if (!messages.length) continue;

            const randomMsg = messages[Math.floor(Math.random() * messages.length)];
            const answer = randomMsg.author.username;

            // 문제 임베드 생성
            const messageDate = randomMsg.createdAt;
            const formattedDate = `${messageDate.getFullYear()}년 ${messageDate.getMonth() + 1}월 ${messageDate.getDate()}일 ${messageDate.getHours()}시 ${messageDate.getMinutes()}분`;
            const questionEmbed = new EmbedBuilder()
                .setTitle(`문제${this.roundNum}`)
                .setDescription(randomMsg.content)
                .setColor('#0099ff')
                .setFooter({ text: `작성일시: ${formattedDate}` });
            
            // 문제 전송
            await thread.send({ embeds: [questionEmbed] });
            await thread.send("10초 안에 누가 썼는지 맞춰주세요!");

            // 강제종료 기능에 의한 종료 flow
            if (!this.gameStarted) {
                return new EmbedBuilder()
                    .setTitle('게임 종료')
                    .setDescription('게임이 종료되었습니다.')
                    .setColor('#ff0000');
            }

            const correctPlayers = await this.getCorrectPlayers(thread, 10, answer);
            await thread.send(`정답은 "${answer}" 였습니다!`);
            
            // 점수 업데이트
            let gameEnded = false;
            let resultEmbed = null;

            // 정답자들의 점수 업데이트
            correctPlayers.forEach(player => {
                this.scores[player.id] = (this.scores[player.id] || 0) + 10;
            });

            // 승리 조건 체크는 한 번만 실행
            const winningPlayer = correctPlayers.find(player => 
                this.scores[player.id] >= this.scoreCutline
            );

            if (winningPlayer) {
                this.gameStarted = false;
                // 모든 참가자의 점수 테이블 생성
                const scoreTable = Array.from(this.players)
                    .map(player => ({
                        id: typeof player === 'object' ? player.id : player,
                        username: typeof player === 'object' ? player.username : interaction.guild.members.cache.get(player)?.user.username || 'Unknown Player',
                        score: this.scores[typeof player === 'object' ? player.id : player] || 0
                    }))
                    .sort((a, b) => b.score - a.score)
                    .map((entry, index) => 
                        `${index === 0 ? '👑 ' : ''}${entry.username} : ${entry.score}`)
                    .join('\n');

                resultEmbed = new EmbedBuilder()
                    .setTitle('결과발표')
                    .setDescription(`${winningPlayer.username}님이 ${this.scores[winningPlayer.id]}점으로 이번 게임을 우승하셨습니다!`)
                    .setColor('#ffff00')
                    .addFields({ 
                        name: '점수표', 
                        value: `\`\`\`\n${scoreTable}\n\`\`\``, 
                        inline: false 
                    });

                await thread.send({ embeds: [resultEmbed] });

                // 버튼 비활성화
                try {
                    const disabledRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('join_midgame')
                                .setLabel('중도참가')
                                .setStyle(ButtonStyle.Success)
                                .setDisabled(true),
                            new ButtonBuilder()
                                .setCustomId('force_end')
                                .setLabel('강제종료')
                                .setStyle(ButtonStyle.Danger)
                                .setDisabled(true)
                        );

                    await this.startMessage.edit({ 
                        embeds: [
                            new EmbedBuilder()
                            .setTitle('게임종료!')
                            .setDescription("축하드립니다!")
                            .addFields({ 
                                name: '참가링크', 
                                value: `아카이브 : ${thread.toString()}`, 
                                inline: false 
                            })
                            .setColor('#ffff00')
                            .setFooter({ text: '게임이 종료되었습니다.' })],
                        components: [disabledRow] 
                    });
                } catch (error) {
                    console.error('게임 종료 시 버튼 비활성화 실패:', error);
                }

                return resultEmbed;
            } else {
                // 현재 점수 상황 표시 - 모든 참가자 포함
                
                let currentScoreTable = Array.from(this.players)
                    .map(player => ({
                        id: typeof player === 'object' ? player.id : player,
                        username: typeof player === 'object' ? player.username : interaction.guild.members.cache.get(player)?.user.username || 'Unknown Player',
                        score: this.scores[typeof player === 'object' ? player.id : player] || 0
                    }))
                    .sort((a, b) => b.score - a.score)
                    .map(entry => `${entry.username} : ${entry.score}`)
                    .join('\n');

                if (!currentScoreTable) {
                    currentScoreTable = "참가자가 없습니다.";
                }

                const scoreUpdateEmbed = new EmbedBuilder()
                    .setTitle('현재 점수')
                    .setDescription('각 참가자의 현재 점수입니다.')
                    .setColor('#00ff00')
                    .addFields({ 
                        name: '점수표', 
                        value: `\`\`\`\n${currentScoreTable}\n\`\`\``, 
                        inline: false 
                    })
                    .setFooter({ text: `목표 점수: ${this.scoreCutline}점` });

                await thread.send({ embeds: [scoreUpdateEmbed] });
            }

            if (this.gameStarted) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                await thread.send("다음 라운드로 가시죠!");
                await new Promise(resolve => setTimeout(resolve, 2000));
                this.roundNum++;
            }
        }
    }

    // 문자열 정규화 함수 추가
    normalizeString(str) {
        return str
            .toLowerCase() // 소문자로 변환
            .replace(/[^a-z0-9가-힣]/g, ''); // 알파벳, 숫자, 한글만 남기고 제거
    }

    async getCorrectPlayers(channel, time, answer) {
        try {
            const correctPlayers = new Set();
            let attemptCount = 0;
            const maxAttempts = 5;
            const normalizedAnswer = this.normalizeString(answer);

            return new Promise((resolve) => {
                const filter = m => {
                    /* console.log('Message received:', {
                        content: m.content,
                        author: m.author.username,
                        isPlayer: this.players.has(m.author.id),
                        isCommand: m.content.startsWith("&"),
                        alreadyCorrect: correctPlayers.has(m.author)
                    }); */
                    
                    return !m.author.bot && // 봇이 아닌 경우
                           !m.content.startsWith("&") && // 명령어가 아닌 경우
                           !correctPlayers.has(m.author); // 아직 맞추지 않은 경우
                };

                const collector = channel.createMessageCollector({
                    filter,
                    time: time * 1000  // 여기서 전달받은 time 사용
                });

                collector.on('collect', async (message) => {
                    /*
                    console.log('Collected message:', {
                        content: message.content,
                        author: message.author.username,
                        normalized: this.normalizeString(message.content)
                    });
                    */

                    const normalizedGuess = this.normalizeString(message.content);
                    
                    if (normalizedGuess === normalizedAnswer) {
                        correctPlayers.add(message.author);
                        await channel.send(`${message.author.username}님이 정답을 맞췄습니다!`);
                        collector.stop('correct');
                    } else {
                        if (attemptCount >= maxAttempts - 1) {
                            await channel.send(`정답은 "${answer}"님의 메시지였습니다! 아쉽군요...`);
                            collector.stop('maxAttempts');
                        } else {
                            await message.reply(`땡!, 남은 횟수 : ${maxAttempts - 1 - attemptCount}`);
                            attemptCount++;
                        }
                    }
                });

                collector.on('end', (collected, reason) => {
                    if (reason === 'time') {
                        channel.send("시간 초과!");
                    }
                    resolve(Array.from(correctPlayers));
                });
            });

        } catch (error) {
            console.log('정답자 수집 중 오류 발생:', error);
            return [];
        }
    }
}

module.exports = new TextGame(); 