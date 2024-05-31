require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const logger = require('./logger');

const botToken = process.env.BOT_TOKEN;
const channelId = process.env.CHANNEL_ID;

const predefine_animations_ids = [
    'CgACAgQAAyEFAASAT1HzAAMaZljdtLWc6BUTRa5iNhTXHqI8aOEAAiADAAIopQxTpW3ziw_WnTc1BA',
    "CgACAgQAAyEFAASAT1HzAAMbZljdvXMqmDwEOGpW7-aljI0_FysAAtQCAALq7BRTpSr-iv-iyAI1BA",
    "CgACAgQAAyEFAASAT1HzAAMcZljdyyxl4nailthHkQ5I8UUD8Q4AAsYCAAKzaBRTiCo_yroUIh01BA",
    "CgACAgQAAyEFAASAT1HzAAMdZljd0mAzkrAlUgtWVpVZ7vL-9LkAAkIDAALBghxQvXz7_iOebJU1BA",
    "CgACAgQAAyEFAASAT1HzAAMdZljd0mAzkrAlUgtWVpVZ7vL-9LkAAkIDAALBghxQvXz7_iOebJU1BA",
    "CgACAgQAAyEFAASAT1HzAAMeZljd2rKvfFQppoCgdKygH-WOd1gAAg0DAAKG0mxTMceLrTFG2mA1BA",
    "CgACAgQAAyEFAASAT1HzAAMfZljd3mie_qGEWvhrGVuVXwTlOGIAAjIDAAJxNtRTAZtdk0oPYFM1BA",
    "CgACAgQAAyEFAASAT1HzAAMgZljd46zEt3-7h54pH7AAASRWPREOAALKAgACXA4cU25h0CEo7yJuNQQ",
    "CgACAgQAAyEFAASAT1HzAAMhZljd89Vf3w6Jxvp1BJhwIzlA848AAukCAAJp3BRTEFJtKwxDjEs1BA",
    "CgACAgQAAyEFAASAT1HzAAMiZljd_s5D3RzgHf0IrvT4C4me7kgAAh8DAAL3PbRTCx2x1717gFo1BA",
];

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
        const pollOptions = ['Да', 'Нет'];
        const animationId = predefine_animations_ids[Math.floor(Math.random()*predefine_animations_ids.length)];
        await bot.sendAnimation(channelId, animationId);
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
        const updates = await bot.getUpdates({ limit: 50 });

        const pollMessages = updates
            .map(update => {
                return update.message && update.message.reply_to_message
            })
            .filter(message => message && message.poll && message.chat.id === +channelId)
            .sort((a, b) => b.date - a.date);
        logger.log('INFO', `получено ${updates.length} отфильтрованно до ${pollMessages.length}`);
        const pollMessage = pollMessages[0];

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
};

async function closeLastPoll() {
    try {
        lastPollMessageId = await getLastPollMessageId();
        logger.log('INFO', `Poll id=${lastPollMessageId} is going to closed`, 'main');
        if (lastPollMessageId) {
            const poll = await bot.stopPoll(channelId, lastPollMessageId);

            const results = poll.options.map(option => `${option.text}: ${option.voter_count}`).join('\n');
            const resultsMessage = `Результаты голосования - "${poll.question}" :\n${results} \n.\n.`;

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
