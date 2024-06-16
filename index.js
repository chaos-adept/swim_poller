require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const logger = require('./logger');

const botToken = process.env.BOT_TOKEN;
const channelId = process.env.CHANNEL_ID;

const predefine_animations_ids = (process.env.POLL_START_ANIMATIONS_IDS
        && JSON.parse(process.env.POLL_START_ANIMATIONS_IDS));

if (!botToken) {
    throw new Error('BOT_TOKEN env var should be defined.');
}

if (!channelId) {
    throw new Error('CHANNEL_ID env var should be defined.');
}


logger.log('INFO', "started");

const bot = new TelegramBot(botToken, { polling: false });

let lastPollMessageId = null;

module.exports.handler = async function (event, context) {

    try {
        logger.log('INFO', `Received event.typeof=${typeof event} data=${JSON.stringify(event)}`, 'main');
        logger.log('INFO', `Received context.typeof=${typeof context} data=${JSON.stringify(context)}`, 'main');

        if (event.event_metadata && event.event_metadata.event_type === 'yandex.cloud.events.serverless.triggers.TimerMessage') {
            event = JSON.parse(event.details.payload);
            logger.log('INFO', `trigger event converted to json event.typeof=${typeof event} data=${JSON.stringify(event)}`, 'main');
        }

        if (event.cmdKey === 'createPoll') {
            await createPoll(event.args.pollTitle);
        } else if (event.cmdKey === 'closeLastPoll') {
            await closeLastPoll();
        } else {
            logger.log('ERROR', 'Unknown command', 'main');
            throw new Error('Unknown command');
        }
    } catch (error) {
        logger.log('ERROR', `Handler error: ${error.message}`, 'main');
        throw error;  // Пробрасываем ошибку дальше
    }
};

async function createPoll(pollTitle) {
    try {

        const animationId = predefine_animations_ids[Math.floor(Math.random()*predefine_animations_ids.length)];
        await bot.sendAnimation(channelId, animationId);

        const pollOptions = ['Да', 'Нет', 'Посмотреть результаты'];
        const pollMessage = await bot.sendPoll(channelId, pollTitle, pollOptions, {
            is_anonymous: false
        });

        lastPollMessageId = pollMessage.message_id;

        logger.log('INFO', `Poll created with title: ${pollTitle} id: ${lastPollMessageId}`, 'main');

        await bot.pinChatMessage(channelId, lastPollMessageId, { disable_notification: true });
        logger.log('INFO', `Poll pinned: ${lastPollMessageId}`, 'main');

    } catch (error) {
        logger.log('ERROR', `Error creating poll: ${error.message}`, 'main');
        throw error;  // Пробрасываем ошибку дальше
    }
}


// Функция для получения последнего голосования, созданного ботом
async function getLastPollMessageId() {
    logger.log('INFO', 'Получение последнего голосования, созданного ботом.');
    try {
        let updates = await bot.getUpdates({ limit: 50 });
        let pollMessage;
        let attempsCount = 0;
        //todo collect voters from updates
        while (attempsCount < 10 && updates.length > 0) {
            attempsCount++;
            const messages = updates
                .filter(update => update.message && update.message.reply_to_message)
                .map(update => {
                    return update.message.reply_to_message
                })
                .sort((a, b) => b.date - a.date);

            const pollMessages = messages.filter(message => message.poll && !message.poll.is_closed && message.chat.id === +channelId && message.from.is_bot)

            logger.log('INFO', `получено ${messages.length} отфильтрованно до ${pollMessages.length}`);
            pollMessage = pollMessages[0];

            if (!pollMessage) {
                logger.log('INFO', 'Последнее голосование не найдено. Получение следующих обновлений...');
            } else {
                break;
            }

            updates = await bot.getUpdates({ limit: 50, offset: (updates[updates.length-1].update_id + 1)});
        }

        if (pollMessage) {
            logger.log('INFO', `Найдено последнее голосование с ID: ${pollMessage.message_id}`);
        } else {
            logger.log('INFO', 'Последнее голосование не найдено.');
            throw new Error('Последнее голосование не найдено.');
        }

        return pollMessage ? pollMessage.message_id : null;
    } catch (error) {
        logger.log('ERROR', `Ошибка при получении последнего голосования: ${error.message}`);
        throw error;
    }
}

async function closeLastPoll() {
    try {
        lastPollMessageId = await getLastPollMessageId();
        logger.log('INFO', `Poll id=${lastPollMessageId} is going to closed`, 'main');
        if (lastPollMessageId) {
            const poll = await bot.stopPoll(channelId, lastPollMessageId);

            const results = poll.options
                                .filter(o => o.text !== 'Посмотреть результаты')
                                .map(o => `${o.text}: ${o.voter_count}`).join('\n');

            const resultsMessage = `Результаты голосования - "${poll.question}":\n${results}`;

            const pollResultMessage = await bot.sendMessage(channelId, resultsMessage);

            await bot.pinChatMessage(channelId, pollResultMessage.message_id, { disable_notification: true });

            logger.log('INFO', `Poll closed. Results: ${resultsMessage}`, 'main');
        } else {
            logger.log('WARN', 'No poll to close', 'main');
        }
    } catch (error) {
        logger.log('ERROR', `Error closing poll: ${error.message}`, 'main');
        throw error;  // Пробрасываем ошибку дальше
    }
}
