const handler = require("../../../lib/api-handler.js");

module.exports = (req, res) => {
  const id = typeof req.query.id === "string" ? req.query.id : "";
  return handler(req, res, `admin/messages/${id}`);
};
