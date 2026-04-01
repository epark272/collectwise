const http = require("node:http");
const { URL } = require("node:url");
const db = require("./index");

const port = Number(process.env.PORT) || 3000;

const getAccountByNumber = db.prepare(`
  SELECT
    account_number,
    debtor_name,
    phone_number,
    balance,
    status,
    client_name
  FROM debtors
  WHERE account_number = ?
`);

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method Not Allowed" });
    return;
  }

  const match = url.pathname.match(/^\/accounts\/([^/]+)$/);

  if (!match) {
    sendJson(res, 404, { error: "Not Found" });
    return;
  }

  const accountNumber = decodeURIComponent(match[1]);
  const account = getAccountByNumber.get(accountNumber);

  if (!account) {
    sendJson(res, 404, { error: "Account not found" });
    return;
  }

  sendJson(res, 200, account);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`API server listening on port ${port}`);
});