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
        } else {
            logger.log('ERROR', 'Unknown command', 'main');
            throw new Error('Unknown command');
        }
    } catch (error) {
        logger.log('ERROR', `Handler error: ${error.message}`, 'main');
        throw error;  // Пробрасываем ошибку дальше
    }
};

async function sendPollAnimation() {
    const work_arround_send_attempts_count = 3;


        if (predefine_animations_ids) {
            let lastError;
            let attemptNum = 0;

            while (attemptNum < work_arround_send_attempts_count) {
                let animationId;
                try {
                    attemptNum++;
                    animationId = predefine_animations_ids[Math.floor(Math.random() * predefine_animations_ids.length)];
                    await bot.sendAnimation(channelId, animationId);
                    return;
                } catch (error) {
                    logger.log('ERROR', `animationId=${animationId}, attemptNum=${attemptNum}. cant sent animation because of ${error.message}`, 'main');
                    lastError = error;
                }
            }

            if (lastError) {
                logger.log('ERROR', `No animation was sent. Attempts reached.`, 'main');
            }
        }
}

async function createPoll(pollTitle) {
    try {

        await sendPollAnimation();

        const pollOptions = ['Да', 'Нет', 'Посмотреть результаты'];
        const pollMessage = await bot.sendPoll(channelId, pollTitle, pollOptions, {
            is_anonymous: false
        });

        lastPollMessageId = pollMessage.message_id;

        logger.log('INFO', `Poll created with title: ${pollTitle} id: ${lastPollMessageId}`, 'main');
    } catch (error) {
        logger.log('ERROR', `Error creating poll: ${error.message}`, 'main');
        throw error;  // Пробрасываем ошибку дальше
    }
}