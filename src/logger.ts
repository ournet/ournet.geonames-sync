const logger = require("ournet.logger");

if (process.env.NODE_ENV === "production") {
  logger.loggly({
    tags: ["geonames-sync", "app"],
    json: true
  });
  logger.removeConsole();
}

export default logger;
