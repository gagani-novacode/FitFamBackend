import winston from "winston";
import Transport from "winston-transport";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";

const { combine, timestamp, colorize, printf, errors } = winston.format;

const logDir = "logs";
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "cyan",
};
winston.addColors(colors);

// The exact format: [TIMESTAMP] [LEVEL] default - [Controller] :: [Function]() : [Status]
const customFormat = (isConsole) => printf(({ level, message, timestamp }) => {
  const levelUpper = level.toUpperCase().replace(/\u001b\[\d+m/g, ""); // strip colors for calculation if needed, but colorize does it
  const coloredLevel = isConsole ? level : `[${level.toUpperCase()}]`;
  
  // If console, we want colors. If file, we want raw text.
  // Winston's colorize format adds the escape codes.
  
  return `[${timestamp}] ${isConsole ? level : `[${level.toUpperCase()}]`} default - ${message}`;
});

const consoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: "YYYY-MM-DDTHH:mm:ss.SSS" }),
  errors({ stack: true }),
  printf(({ level, message, timestamp }) => {
    return `[${timestamp}] ${level} default - ${message}`;
  })
);

const fileFormat = combine(
  timestamp({ format: "YYYY-MM-DDTHH:mm:ss.SSS" }),
  printf(({ level, message, timestamp }) => {
    return `[${timestamp}] [${level.toUpperCase()}] default - ${message}`;
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "debug",
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    new winston.transports.File({ 
      filename: path.join(logDir, "app.log"), 
      format: fileFormat,
      level: "info"
    }),
  ],
});

export default logger;
