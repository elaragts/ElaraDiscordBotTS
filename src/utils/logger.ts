import Pino from 'pino';

const logger = Pino.pino({
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            ignore: 'pid,hostname'
        }
    }
});

export default logger;
