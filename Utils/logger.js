const fs = require('fs');
const path = require('path');
const morgan = require('morgan');

const logDirectory = path.join(__dirname, '../logs');
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory);
}

const errorLogPath = path.join(logDirectory, 'error.log');
const accessLogPath = path.join(logDirectory, 'access.log');

const accesslogStream = fs.createWriteStream(accessLogPath, { flags: 'a' });

const morganFormat = ':date[iso] :method :url :status :response-time ms - :res[content-length]';

const requestLogger = morgan(morganFormat, { stream: accesslogStream });

const consoleLogger = morgan('dev');

const writeErrorLog = (message) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    fs.appendFile(errorLogPath, logEntry, (err) => {
        if (err) {
            console.error("Failed to write to error log:", err);
        }
    });
}

const logger = {
    // log d'erreur
    error: (message, error) => {
        const errorMessage = error 
        ? `ERROR: ${message} - ${error.message}\nStack: ${error.stack}`
        : `ERROR: ${message}`;
        
        console.error(`❌ ${errorMessage}`);
        writeErrorLog(errorMessage);
    },

    info : (message) => {
        console.log(`ℹ️  INFO: ${message}`);
        const timestamp = new Date().toISOString();
        fs.appendFile(accessLogPath, `[${timestamp}] INFO: ${message}\n`, (err) => {
            if (err) {
                console.error("Failed to write to access log:", err);
            }
        });
    }
}

module.exports = {
    logger,
    requestLogger,
    consoleLogger
};