const handler = require("../../.server/api-handler.js");

module.exports = (req, res) => handler(req, res, "auth/login");
