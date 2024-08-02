# TCP Packet Streaming Application

This project consists of a TCP client and server that stream and handle packet data. The client connects to the server, requests packets, and handles missing packets gracefully.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Functionality Overview](#functionality-overview)
- [File Descriptions](#file-descriptions)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before running the application, ensure you have the following installed on your local computer:

- [Node.js](https://nodejs.org/) (version 14 or higher)
- [npm](https://www.npmjs.com/) (comes bundled with Node.js)

## Installation

Clone the repository to your local machine:

```bash
git clone repo_url
cd repo
```

## Running the Application

1. Open a terminal window and navigate to the directory where you cloned the repository.
2. Run the server:

```bash
   node main.js
   ```
3. Run the client:

```bash
   node client.js
 ```
The client will connect to the server, request packet data, and handle any missing packets.

Once the client has received all packets, it will write the output to `output.json` in the same directory.

## Functionality Overview

- **Server**: Listens for incoming connections on port 3000, processes requests for packets, and responds with the requested packet data.
- **Client**: Connects to the server, requests all packets, and handles retries and missing packets. It processes the received data and outputs it to a JSON file.

## File Descriptions

- `client.js`: The client implementation that connects to the server, requests packets, processes received data, and handles missing packets.
- `main.js`: The server implementation that listens for client connections, sends packets, and handles requests for missing packets.
- `output.json`: The file where the client writes the received packet data once processing is complete.

## Troubleshooting

If you encounter any issues:

- Ensure the server is running before starting the client.
- Check for any errors in the terminal output for both the server and client.
- Ensure that no other application is using port 3000.

