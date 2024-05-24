# Use Neo4j with React + TypeScript
## How to execute
### Run server first.
If you don't have any type of server, you can run mockup with json-server.
The mockup database is json-formatted now.
`` npx json-server --watch -p 3005 apiResults.json ``
### Run client then.
`` yarn start ``

## Introduction
1. Read
It reads data from apiResults.json and transfers to React app.
2. Display
React app receives that and draws graphs according to rules by the data structure.
Draws on SVG.