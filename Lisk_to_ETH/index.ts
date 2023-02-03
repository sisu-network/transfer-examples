import { apiClient, cryptography, transactions } from "@liskhq/lisk-client";
import protobuf from "protobufjs";
import * as dotenv from "dotenv";
dotenv.config();

const RPC_ENDPOINT = "ws://localhost:8080/ws";

let clientCache: any;

const getClient = async (): Promise<apiClient.APIClient> => {
  if (!clientCache) {
    clientCache = await apiClient.createWSClient(RPC_ENDPOINT);
  }

  return clientCache;
};

const proto = `
syntax = "proto2";

package lisk;

message TransferData {
  required uint64 chainId = 1;
  required bytes recipient = 2;
  optional string token = 3;
  required uint64 amount = 4;
}
`;
const main = async () => {
  const mnemonic = process.env.MNEMONIC || "";
  var root = protobuf.parse(proto, { keepCase: true }).root;
  const mpcAddress = process.env.MPC_ADDRESS;
  const recipientAddress = "0xbac265B9e5758F325703bcc6C43F98C84e2F5aD9";
  // Obtain a message type
  var TransferDataMessage = root.lookupType("lisk.TransferData");
  // Exemplary payload
  var payload = {
    chainId: 1,
    recipient: Uint8Array.from(
      Buffer.from(recipientAddress.substring(2, recipientAddress.length), "hex")
    ),
    amount: 123124238962348765,
  };

  // Verify the payload if necessary (i.e. when possibly incomplete or invalid)
  var errMsg = TransferDataMessage.verify(payload);
  if (errMsg) throw Error(errMsg);

  // Create a new message
  var message = TransferDataMessage.create(payload);

  // Encode a message to an Uint8Array (browser) or Buffer (node)
  var buffer = TransferDataMessage.encode(message).finish();
  const client = await getClient();
  const address = cryptography.getAddressFromBase32Address(mpcAddress);
  const tx = await client.transaction.create(
    {
      moduleID: 2,
      assetID: 0,
      fee: BigInt(transactions.convertLSKToBeddows("0.05")),
      asset: {
        amount: BigInt(transactions.convertLSKToBeddows("0.1")),
        recipientAddress: address,
        data: (buffer as Buffer).toString("base64"),
      },
    },
    mnemonic
  );

  try {
    const res = await client.transaction.send(tx);
    console.log("rest = ", res);
  } catch (error) {
    console.log("error = ", error);
  }
};

(async () => {
  try {
    await main();
  } catch (e) {
    console.log("Error = ", e);
  }
})();
