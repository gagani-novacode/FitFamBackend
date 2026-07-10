const path = require('path');
const fs = require('fs');
const i18n = require("i18n");
const logger = require('../utils/log4jsutil');
const AppError = require('../utils/app.error');
const asyncHandler = require('express-async-handler')

const getServerVersion = asyncHandler(async (req, res) => {
    logger.trace("[serverdetailsMiddleware] :: getServerVersion() : Start");

    const packageJsonPath = path.join('package.json');
    try {
        const data = fs.readFileSync(packageJsonPath, 'utf8');
        const packageJson = JSON.parse(data);
        const serverVersion = packageJson.version;

        res.json({ version: serverVersion });
    } catch (err) {
        throw new AppError(500, i18n.__("SERVER_ERROR"))
    }
    logger.trace("[serverdetailsMiddleware] :: getServerVersion() : End");
});


module.exports = {
     getServerVersion
};