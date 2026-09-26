module.exports = async function handler(req, res) {
  res.status(200).send(`Req URL: ${req.url}\nReq Original URL: ${req.originalUrl}\nReq Headers: ${JSON.stringify(req.headers)}`);
}
