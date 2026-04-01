const fs = require("node:fs");
const path = require("node:path");
const db = require("./index");

const csvPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(__dirname, "atlas_inventory.csv");

const expectedHeaders = [
  "account_number",
  "debtor_name",
  "phone_number",
  "balance",
  "status",
  "client_name",
];

const allowedStatuses = new Set(["Active", "Closed"]);


// Helper functions for data normalization and error formatting

function normalizePhoneNumber(value) {
  return String(value || "").replaceAll(/\D/g, "");
}

function formatLineError(lineNumber, message) {
  return `Line ${lineNumber}: ${message}`;
}

function parseCsvLine(line) {
  return line.split(",").map((value) => value.trim());
}



if (!fs.existsSync(csvPath)) {
  console.error(`CSV file not found: ${csvPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(csvPath, "utf8").trim();

if (!raw) {
  console.error("CSV file is empty.");
  process.exit(1);
}

const lines = raw.split(/\r?\n/);
const headers = parseCsvLine(lines.shift());
const errors = [];
const records = [];
const seenAccountNumbers = new Map();
const headerIndex = new Map(headers.map((header, index) => [header, index]));


// Validate that all expected headers are present in the CSV file
const missingHeaders = expectedHeaders.filter((header) => !headerIndex.has(header));

if (missingHeaders.length > 0) {
  errors.push(
    `Schema invalid in header row: missing required column(s) ${missingHeaders.join(", ")}. Found headers: ${headers.join(", ") || "<none>"}.`
  );
}

// Process each row of the CSV
for (const [index, line] of lines.entries()) {
  const lineNumber = index + 2;

  const fields = parseCsvLine(line);

  if (fields.length < headers.length) {
    errors.push(
      formatLineError(
        lineNumber,
        `Schema invalid: expected at least ${headers.length} columns to match the header row, but found ${fields.length}.`
      )
    );
    continue;
  }

  const account_number = fields[headerIndex.get("account_number")];
  const debtor_name = fields[headerIndex.get("debtor_name")];
  const phone_number_raw = fields[headerIndex.get("phone_number")];
  const balance_raw = fields[headerIndex.get("balance")];
  const status = fields[headerIndex.get("status")];
  const client_name = fields[headerIndex.get("client_name")];
  const phone_number = normalizePhoneNumber(phone_number_raw);
  const balance = Number(balance_raw);

  // Schema validation
  if (!account_number) {
    errors.push(formatLineError(lineNumber, "Schema invalid: account_number is missing."));
  }

  if (!debtor_name) {
    errors.push(formatLineError(lineNumber, "Schema invalid: debtor_name is missing."));
  }

  if (!phone_number_raw) {
    errors.push(formatLineError(lineNumber, "Schema invalid: phone_number is missing."));
  } else if (!phone_number) {
    errors.push(formatLineError(lineNumber, "Schema invalid: phone_number contains no numeric characters after cleaning."));
  }

  if (balance_raw === "" || Number.isNaN(balance)) {
    errors.push(formatLineError(lineNumber, "Schema invalid: balance must be a numeric value."));
  }

  if (!status) {
    errors.push(formatLineError(lineNumber, "Schema invalid: status is missing."));
  } else if (!allowedStatuses.has(status)) {
    errors.push(
      formatLineError(
        lineNumber,
        `Schema invalid: status must be one of ${Array.from(allowedStatuses).join(", ")}, but found ${status}.`
      )
    );
  }

  if (!client_name) {
    errors.push(formatLineError(lineNumber, "Schema invalid: client_name is missing."));
  }

  if (!account_number || !debtor_name || !phone_number || Number.isNaN(balance) || !status || !client_name) {
    continue;
  }

  const firstSeenLine = seenAccountNumbers.get(account_number);

  if (firstSeenLine) {
    errors.push(
      formatLineError(
        lineNumber,
        `Duplicate account_number detected: ${account_number} was already used on line ${firstSeenLine}.`
      )
    );
    continue;
  }

  seenAccountNumbers.set(account_number, lineNumber);
  records.push({
    account_number,
    debtor_name,
    phone_number,
    balance,
    status,
    client_name,
  });
}

if (errors.length > 0) {
  console.error("CSV import aborted due to the following error(s):");

  for (const error of errors) {
    console.error(`- ${error}`);
  }

  process.exit(1);
}

const insert = db.prepare(`
  INSERT INTO debtors (
    account_number,
    debtor_name,
    phone_number,
    balance,
    status,
    client_name
  ) VALUES (
    @account_number,
    @debtor_name,
    @phone_number,
    @balance,
    @status,
    @client_name
  )
  ON CONFLICT(account_number) DO UPDATE SET
    debtor_name = excluded.debtor_name,
    phone_number = excluded.phone_number,
    balance = excluded.balance,
    status = excluded.status,
    client_name = excluded.client_name
`);

const transaction = db.transaction((rows) => {
  for (const row of rows) {
    insert.run(row);
  }
});

transaction(records);

console.log(`Imported ${records.length} record(s) from ${path.basename(csvPath)}.`);