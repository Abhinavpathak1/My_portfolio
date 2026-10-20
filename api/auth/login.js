const handler = require("../../lib/api-handler.js");

module.exports = (req, res) => handler(req, res, "auth/login");
