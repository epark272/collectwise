const Database = require("better-sqlite3");

const db = new Database("debtors.db");

db.exec(`CREATE TABLE IF NOT EXISTS debtors (
  account_number TEXT PRIMARY KEY,
  debtor_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  balance REAL NOT NULL,
  status TEXT NOT NULL,
  client_name TEXT NOT NULL
)`);

module.exports = db;


