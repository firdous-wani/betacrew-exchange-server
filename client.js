const net = require("net"); // For creating TCP clients and servers
const fs = require("fs"); // For file system operations

// Define the server host and port to connect to
const HOST = "localhost";
const PORT = 3000;

// Variables to hold raw data, packets, missing sequences, and retry count
let rawData = Buffer.alloc(0); // Initialize an empty buffer for raw data
let packets = []; // Array to store the parsed packets
let missingSequences = []; // Array to track which packets are missing
let retryCount = 0; // Counter for connection attempts
const MAX_RETRIES = 3; // Maximum number of retry attempts

// Function to connect to the server and request all packets
function connectAndStreamAllPackets() {
  console.log(`Attempting to connect to server (Attempt ${retryCount + 1})...`);
  const client = new net.Socket(); // Create a new TCP socket client

  // Connect to the server
  client.connect(PORT, HOST, () => {
    console.log("Connected to server");
    const buffer = Buffer.alloc(1); // Create a buffer for the request
    buffer.writeUInt8(1, 0); // Set the request type to 1 (request all packets)
    client.write(buffer); // Send the request to the server
    console.log("Sent request for all packets");
  });

  // Handle incoming data from the server
  client.on("data", (data) => {
    console.log(`Received ${data.length} bytes of data`);
    rawData = Buffer.concat([rawData, data]); // Concatenate new data to the rawData buffer
  });

  // Handle connection closure
  client.on("close", () => {
    console.log("Connection closed");
    console.log(`Received ${rawData.length} bytes in total`);

    // If no data was received, attempt to retry
    if (rawData.length === 0 && retryCount < MAX_RETRIES) {
      retryCount++;
      console.log(`No data received. Retrying (Attempt ${retryCount + 1})...`);
      setTimeout(connectAndStreamAllPackets, 2000); // Wait 2 seconds before retrying
    } else if (rawData.length === 0) {
      console.log(
        "Failed to receive data after multiple attempts. Please check the server."
      );
    } else {
      // Process the raw data if received
      processRawData();
      requestMissingPackets(); // Check for and request any missing packets
    }
  });

  // Handle errors during the connection
  client.on("error", (error) => {
    console.error("Connection error:", error);
    if (retryCount < MAX_RETRIES) {
      retryCount++;
      console.log(`Error occurred. Retrying (Attempt ${retryCount + 1})...`);
      setTimeout(connectAndStreamAllPackets, 2000); // Wait 2 seconds before retrying
    } else {
      console.log(
        "Failed to connect after multiple attempts. Please check the server."
      );
    }
  });

  // Set a timeout for the connection
  client.setTimeout(10000); // 10 seconds
  client.on("timeout", () => {
    console.log("Connection timed out");
    client.destroy(); // Close the connection on timeout
  });
}

// Function to process the raw data received from the server
function processRawData() {
  console.log("Processing raw data...");
  // Loop through the raw data in chunks of 17 bytes
  for (let i = 0; i < rawData.length; i += 17) {
    if (i + 17 <= rawData.length) {
      // Ensure we have a full packet
      try {
        const packet = parsePacket(rawData.slice(i, i + 17)); // Parse the packet
        packets.push(packet); // Add the parsed packet to the packets array
      } catch (error) {
        console.error("Error parsing packet:", error); // Handle parsing errors
      }
    }
  }

  // Sort packets by their sequence number
  packets.sort((a, b) => a.packetSequence - b.packetSequence);
  console.log(`Parsed ${packets.length} packets.`); // Log how many packets were parsed
  findMissingSequences(); // Check for any missing packet sequences
}

// Function to parse a single packet of data
function parsePacket(data) {
  return {
    symbol: data.slice(0, 4).toString("ascii"), // Extract the symbol from the first 4 bytes
    buysellindicator: data.slice(4, 5).toString("ascii"), // Extract the buy/sell indicator
    quantity: data.readInt32BE(5), // Read the quantity as a 32-bit integer (big-endian)
    price: data.readInt32BE(9), // Read the price as a 32-bit integer (big-endian)
    packetSequence: data.readInt32BE(13), // Read the packet sequence number
  };
}

// Function to find and log any missing packet sequences
function findMissingSequences() {
  const maxSeq = Math.max(...packets.map((p) => p.packetSequence)); // Find the highest sequence number
  for (let i = 1; i <= maxSeq; i++) {
    // Check for each sequence number from 1 to maxSeq
    if (!packets.find((p) => p.packetSequence === i)) {
      // If the packet is missing
      missingSequences.push(i); // Add it to the missingSequences array
    }
  }
  console.log(`Missing sequences: ${missingSequences.join(", ")}`); // Log the missing sequences
}

// Function to request any missing packets from the server
function requestMissingPackets() {
  if (missingSequences.length === 0) {
    // If there are no missing sequences, finish
    writeOutputJSON();
    return;
  }

  console.log(`Requesting missing packet: ${missingSequences[0]}`); // Log the missing packet being requested
  const client = new net.Socket(); // Create a new TCP socket client

  // Connect to the server to request a missing packet
  client.connect(PORT, HOST, () => {
    const buffer = Buffer.alloc(2); // Create a buffer for the request
    buffer.writeUInt8(2, 0); // Set the request type to 2 (request a missing packet)
    buffer.writeUInt8(missingSequences[0], 1); // Set the sequence number of the missing packet
    client.write(buffer); // Send the request to the server
  });

  // Handle incoming data for the missing packet
  client.on("data", (data) => {
    console.log(`Received missing packet of ${data.length} bytes`);
    const packet = parsePacket(data); // Parse the received packet
    packets.push(packet); // Add the packet to the packets array
    client.destroy(); // Close the connection after receiving the packet

    missingSequences.shift(); // Remove the requested sequence from the list
    // If there are still missing sequences, request the next one
    if (missingSequences.length > 0) {
      requestMissingPackets();
    } else {
      writeOutputJSON(); // All packets received, write to output
    }
  });

  // Handle errors while requesting missing packets
  client.on("error", (error) => {
    console.error("Error requesting missing packet:", error); // Log the error
    missingSequences.shift(); // Remove the requested sequence from the list
    // If there are still missing sequences, request the next one
    if (missingSequences.length > 0) {
      requestMissingPackets();
    } else {
      writeOutputJSON(); // All packets received, write to output
    }
  });
}

// Function to write all received packets to a JSON file
function writeOutputJSON() {
  packets.sort((a, b) => a.packetSequence - b.packetSequence); // Sort packets by their sequence number
  fs.writeFileSync("output.json", JSON.stringify(packets, null, 2)); // Write packets to output.json
  console.log("All packets received and written to output.json"); // Log completion message
}

// Start the process by connecting and streaming all packets
connectAndStreamAllPackets();
