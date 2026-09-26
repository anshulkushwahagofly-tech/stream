module.exports = async function handler(req, res) {
  res.status(200).send(`URL: ${req.url}\nOriginalUrl: ${req.originalUrl || 'none'}`);
}
