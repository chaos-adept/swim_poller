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

    test('Create and Close Poll', async () => {
        const createPollEvent = {
            cmdKey: 'createPoll',
            args: {
                pollTitle: 'Ваш любимый цвет? ' + (new Date()).toLocaleDateString()
            }
        };

        const closePollEvent = {
            cmdKey: 'closeLastPoll'
        };

        // Создаем голосование
        console.log('Creating poll...');
        await handler(createPollEvent);
        
        // Закрываем голосование через 5 секунд
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('Closing poll...');
        await handler(closePollEvent);

        // Проверка завершена успешно, если код дошел до этой точки без ошибок
        console.log('Test completed successfully.');
    });
});
