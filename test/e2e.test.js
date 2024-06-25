require('dotenv').config();
const { handler } = require('../index');
//const logger = require('../logger');

// Переключаем на тестовые данные

process.env.BOT_TOKEN = process.env.BOT_TOKEN_TEST;
process.env.CHANNEL_ID = process.env.CHANNEL_ID_TEST;

/*
logger.log = (level, message, stream_name) => {
    // Переопределяем логгер для тестов, чтобы не засорять вывод
    console.log(`[${level}] ${message} (${stream_name})`);
};*/

describe('Telegram Bot E2E Tests', () => {
    jest.setTimeout(30000); // Увеличиваем таймаут для асинхронных операций

    test('Create Poll', async () => {
        const createPollEvent = {
            cmdKey: 'createPoll',
            args: {
                pollTitle: 'Ваш любимый цвет? ' + (new Date()).toLocaleTimeString()
            }
        };

        const closePollEvent = {
            cmdKey: 'closeLastPoll'
        };

        // Создаем голосование
        console.log('Creating poll...');
        await handler(createPollEvent);

        // Проверка завершена успешно, если код дошел до этой точки без ошибок
        console.log('Test completed successfully.');
    });
});
