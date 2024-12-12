const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const capitals = {
    "South Korea": "Seoul",
    "Japan": "Tokyo",
    "France": "Paris",
    "USA": "Washington, D.C.",
    "Germany": "Berlin",
    "China": "Beijing",
    "India": "New Delhi",
    "Brazil": "Brasília",
    "Australia": "Canberra",
    "Canada": "Ottawa",
    "Russia": "Moscow",
    "Italy": "Rome",
    "Spain": "Madrid",
    "Mexico": "Mexico City",
    "United Kingdom": "London",
    "Argentina": "Buenos Aires",
    "Egypt": "Cairo",
    "South Africa": "Pretoria",
    "Saudi Arabia": "Riyadh",
    "Turkey": "Ankara",
    "Indonesia": "Jakarta",
    "Netherlands": "Amsterdam",
    "Sweden": "Stockholm",
    "Norway": "Oslo",
    "Switzerland": "Bern",
    "Greece": "Athens",
    "Thailand": "Bangkok",
    "Vietnam": "Hanoi",
    "Philippines": "Manila",
    "Malaysia": "Kuala Lumpur",
    "Portugal": "Lisbon",
    "Ireland": "Dublin",
    "Poland": "Warsaw",
    "Ukraine": "Kyiv",
    "Denmark": "Copenhagen",
    "Finland": "Helsinki",
    "Austria": "Vienna",
    "Belgium": "Brussels",
    "Czech Republic": "Prague",
    "Hungary": "Budapest",
    "Romania": "Bucharest",
    "Bulgaria": "Sofia",
    "Croatia": "Zagreb",
    "Serbia": "Belgrade",
    "Morocco": "Rabat",
    "Kenya": "Nairobi",
    "Nigeria": "Abuja",
    "New Zealand": "Wellington",
    "Singapore": "Singapore",
    "Cambodia": "Phnom Penh",
    "Myanmar": "Naypyidaw",
    "Bangladesh": "Dhaka",
    "Pakistan": "Islamabad",
    "Iran": "Tehran",
    "Iraq": "Baghdad",
    "Israel": "Jerusalem",
    "United Arab Emirates": "Abu Dhabi",
    "Qatar": "Doha",
    "Kuwait": "Kuwait City",
    "Kazakhstan": "Astana"
};

class CapitalQuiz {
    constructor() {
        this.capitals = capitals;
        this.quizzes = new Map();
    }

    getRandomCountry() {
        const countries = Object.keys(this.capitals);
        return countries[Math.floor(Math.random() * countries.length)];
    }

    createQuizEmbed(country) {
        const correctAnswer = this.capitals[country];
        const choices = this.getChoices(correctAnswer);
        
        const embed = new EmbedBuilder()
            .setTitle('Capital City Quiz')
            .setDescription(`What is the capital of ${country}?`)
            .setColor('#0099ff');

        const row = new ActionRowBuilder()
            .addComponents(
                choices.map(choice => 
                    new ButtonBuilder()
                        .setCustomId(choice)
                        .setLabel(choice)
                        .setStyle(ButtonStyle.Primary)
                )
            );

        return { embed, row, correctAnswer };
    }

    getChoices(correctAnswer) {
        const allCapitals = Object.values(this.capitals);
        const choices = [correctAnswer];
        
        while (choices.length < 4) {
            const randomCapital = allCapitals[Math.floor(Math.random() * allCapitals.length)];
            if (!choices.includes(randomCapital)) {
                choices.push(randomCapital);
            }
        }
        
        return choices.sort(() => Math.random() - 0.5);
    }

    checkAnswer(answer, correctAnswer) {
        return answer === correctAnswer;
    }

    async startQuiz(interaction) {
        try {
            // 새로운 퀴즈 생성
            const country = this.getRandomCountry();
            const { embed, row, correctAnswer } = this.createQuizEmbed(country);
            
            // 고유한 퀴즈 ID 생성
            const quizId = Date.now().toString();
            
            // End 버튼 생성 및 quizId 포함
            const endButton = new ButtonBuilder()
                .setCustomId(`end_quiz:${quizId}`)
                .setLabel('End Quiz')
                .setStyle(ButtonStyle.Danger);
            
            // 기존 버튼 배열에 End 버튼 추가
            try {
                row.addComponents(endButton);
            } catch (error) {
                console.error('End 버튼 추가 중 오류 발생:', error);
                throw new Error('퀴즈 버튼 생성 실패');
            }

            // 새로운 퀴즈 데이터 맵 생성
            const quizData = new Map();
            
            // 퀴즈 생성자의 초기 데이터 저장
            quizData.set(interaction.user.id, {
                correctAnswer,
                attempts: 0,
                solved: false,
                solvedTime: null,
                username: interaction.user.username
            });

            // Discord에 퀴즈 메시지 전송
            let quizMessage;
            try {
                quizMessage = await interaction.reply({ 
                    embeds: [embed], 
                    components: [row],
                    fetchReply: true
                });
            } catch (error) {
                console.error('퀴즈 메시지 전송 중 오류 발생:', error);
                throw new Error('퀴즈 메시지 전송 실패');
            }

            // 1분 타이머 설정
            const timeoutId = setTimeout(async () => {
                try {
                    // 시간 종료 시 임베드 수정
                    const finalEmbed = EmbedBuilder.from(embed)
                        .setColor(0x90ee90)
                        .setFooter({ text: '퀴즈가 종료되었습니다!' });
                    
                    await quizMessage.edit({ 
                        embeds: [finalEmbed], 
                        components: [] 
                    });
                } catch (error) {
                    console.error('퀴즈 자동 종료 중 오류 발생:', error);
                    try {
                        // 기본 메시지로 폴백
                        await quizMessage.edit({ 
                            content: '퀴즈가 종료되었습니다.', 
                            components: [] 
                        });
                    } catch (editError) {
                        console.error('오류 메시지 편집 실패:', editError);
                    }
                } finally {
                    // 메모리 정리
                    if (this.quizzes.has(quizId)) {
                        this.quizzes.delete(quizId);
                    }
                }
            }, 60000);

            // 퀴즈 데이터에 타이머 ID와 메시지 ID 저장
            quizData.set('timeoutId', timeoutId);
            quizData.set('messageId', quizMessage.id);
            
            // 전역 퀴즈 맵에 현재 퀴즈 데이터 저장
            this.quizzes.set(quizId, quizData);

            // 모든 버튼에 퀴즈 ID 추가
            try {
                row.components.forEach(button => {
                    if (button.data.custom_id !== `end_quiz:${quizId}`) {
                        button.setCustomId(`${button.data.custom_id}:${quizId}`);
                    }
                });

                // 수정된 버튼으로 메시지 업데이트
                await quizMessage.edit({ components: [row] });
            } catch (error) {
                console.error('버튼 ID 수정 중 오류 발생:', error);
                // 치명적이지 않은 오류이므로 계속 진행
            }

        } catch (error) {
            console.error('퀴즈 시작 중 치명적 오류 발생:', error);
            // 사용자에게 오류 알림
            try {
                await interaction.reply({ 
                    content: '퀴즈 시작 중 오류가 발생했습니다. 나중에 다시 시도해주세요.', 
                    ephemeral: true 
                });
            } catch (replyError) {
                console.error('오류 메시지 전송 실패:', replyError);
            }
            
            // 메모리 정리
            if (quizId && this.quizzes.has(quizId)) {
                const existingTimeout = this.quizzes.get(quizId)?.get('timeoutId');
                if (existingTimeout) {
                    clearTimeout(existingTimeout);
                }
                this.quizzes.delete(quizId);
            }
        }
    }

    async handleButtonInteraction(interaction) {
        if (!interaction.isButton()) return;

        const [actionId, quizId] = interaction.customId.split(':');
        
        if (!quizId || !this.quizzes.has(quizId)) {
            await interaction.reply({ 
                content: '존재하지 않는 퀴즈입니다.', 
                ephemeral: true 
            });
            return;
        }

        const quizData = this.quizzes.get(quizId);

        if (actionId === 'end_quiz') {
            try {
                clearTimeout(quizData.get('timeoutId'));
                
                const finalEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                    .setColor(0x90ee90)
                    .setFooter({ text: '퀴즈가 수동으로 종료되었습니다!' });
                
                await interaction.message.edit({ 
                    embeds: [finalEmbed], 
                    components: [] 
                });
                
                await interaction.reply({ 
                    content: '퀴즈가 종료되었습니다.', 
                    ephemeral: true 
                });
                
                this.quizzes.delete(quizId);
            } catch (error) {
                console.error('퀴즈 종료 중 오류 발생:', error);
                try {
                    await interaction.reply({ 
                        content: '퀴즈 종료 중 오류가 발생했습니다.', 
                        ephemeral: true 
                    });
                } catch (replyError) {
                    console.error('오류 응답 전송 실패:', replyError);
                }
            }
            return;
        }

        const userData = quizData.get(interaction.user.id);
        if (!userData) {
            await interaction.reply({ 
                content: '퀴즈를 먼저 시작해주세요!', 
                ephemeral: true 
            });
            return;
        }

        if (this.checkAnswer(actionId, userData.correctAnswer)) {
            await interaction.reply({ 
                content: '정답입니다!', 
                ephemeral: true 
            });
            
            userData.solved = true;
            userData.solvedTime = Date.now();
            
            const correctUsers = Array.from(quizData.values())
                .filter(data => data.solved && data.username)
                .sort((a, b) => {
                    if (a.attempts !== b.attempts) {
                        return a.attempts - b.attempts;
                    }
                    return a.solvedTime - b.solvedTime;
                });

            const userRankings = correctUsers.map((data, index) => {
                let medal;
                switch (index) {
                    case 0: medal = '🥇'; break;
                    case 1: medal = '🥈'; break;
                    case 2: medal = '🥉'; break;
                    default: medal = '✅';
                }
                return `${medal} ${data.username} (시도: ${data.attempts}회)`;
            });

            const embed = EmbedBuilder.from(interaction.message.embeds[0]);
            const country = embed.data.description.split('?')[0].split('of ')[1];
            const updatedDescription = `What is the capital of ${country}?\n\n🏆 정답자 목록:\n${userRankings.join('\n')}`;
            embed.setDescription(updatedDescription);
            
            await interaction.message.edit({ embeds: [embed] });
        } else {
            userData.attempts += 1;
            await interaction.reply({ 
                content: '틀렸습니다!', 
                ephemeral: true 
            });
        }
    }
}

module.exports = new CapitalQuiz();
