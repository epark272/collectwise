# CollectWise FDE Take Home
Authored: Eddie Park @epark272


## 1. CSV Ingestion Script
The CSV ingestion script can be run using

```
npm install
npm run ingest [filename]
```
which will ingest and parse into the database a file with the given filename, or `atlas_inventory.csv`  if no filename is provided.

The logic for ingestion is stored in [`ingest.js`](ingest.js). The database file is saved as [`debtors.db`](debtors.db) and is currently populated with notional data. 

Assumptions made:
- `account_number` is the primary key
- `status` only has 2 valid values, which are "Active" and "Closed"
- Each row in the database must have a non-null value for each of the 6 required columns
- `phone_number` is cleaned to contain only numeric digits, but it is kept as a text field because these numbers are not intended to be manipulated arithmetically
- Any error within a sheet (including duplicate `account_number` rows, missing required fields, or invalid values e.g. non-numeric `balance`) will abort the transaction and display an error message to the user
- Subsequent uploads of a CSV with different data tied to the account number will overwrite the data. For example, upload #1 has account number A with a balance of 100, whereas upload #2 has account number A with a balance of 200. It is assumed that this change is intentional and acts as a "state-of-the-world snapshot" to update the database.

## 2. Account Lookup API Endpoint
You can interact with the database using an HTTP API endpoint to retrieve data from the database.

```
GET /accounts/<account_number>
```

This method will return a JSON containing relevant information if provided a valid `account_number`. If the provided `account_number` is invalid, the response will be a 404.

The API can be run or deployed using
```
npm run start
```
which deploys locally on `localhost:3000`. If using the provided notional data, then you are able to view an example by visiting 
```
http://localhost:3000/accounts/ACC100001
```
in your browser, or executing 
```
curl http://localhost:3000/accounts/ACC100001
```
in your terminal.

When deploying into production, you may use your favorite hosting service with the same start command:
```
npm run start
```

For a live example, I have used Render. The base URL for any API calls is:
```
https://collectwise-85vy.onrender.com/
```
For an example account, you may visit
```
https://collectwise-85vy.onrender.com/accounts/ACC100001
```
in your browser, or execute
```
curl https://collectwise-85vy.onrender.com/accounts/ACC100001
```
in your terminal.

## 3. Email to Atlas Recovery COO
You can find this email in [`COO_email.txt`](COO_email.txt).

## 4. AI Agent Prompt Engineering in Retell AI
You can find the agent JSON in [`Atlas_Recovery_Agent.json`](Atlas_Recovery_Agent.json).