//const { createLogger, format, transports } = require('winston');

/*
const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp(),
        format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] ${message}`)
    ),
    transports: [
        new transports.Console()
    ],
});
*/

/*
const logger = createLogger({
    level: 'info',
    format: format.json(),
    transports: [
        new transports.Console({
            format: format.simple(),
        }),
    ],
});

module.exports.log = (level, message, stream_name) => {
    //logger.log(level.toLowerCase(), {level, message, stream_name});
    console.log(level, message);
};
*/

//module.exports.log = console.log;


const { createLogger, format, transports } = require('winston');

// Определяем форматирование JSON
const jsonFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(({ timestamp, level, message, ...metadata }) => {
    const logEntry = {
      timestamp,
      level,
      message,
      ...metadata
    };
    return JSON.stringify(logEntry);
  })
);

// Создаем логгер с консольным транспортом
const logger = createLogger({
  level: 'info',
  format: jsonFormat,
  transports: [
    new transports.Console()
  ]
});


module.exports.log = (level, message, stream) => {
    logger.log({
        timestamp: new Date(),
        level: level.toLowerCase(),
        message,
        stream
    });
}