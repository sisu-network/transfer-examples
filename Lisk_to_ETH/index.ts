import { apiClient, cryptography, } from "@liskhq/lisk-client";

import protobuf from "protobufjs";
import * as dotenv from "dotenv";
dotenv.config();
import axios from 'axios';

// const RPC_ENDPOINT = "wss://testnet-service.lisk.com/rpc-v2";
const RPC_ENDPOINT = "wss://service.lisk.com/rpc-v2";
const HTTP_ENDPOINT = "https://testnet-service.lisk.com/api/v2/";

const networkIdTestnet = '15f0dacc1060e91818224a94286b13aa04279c640bd5d6f193182031d133df7c';
const networkIdentifier = Buffer.from(networkIdTestnet, 'hex');

const mpcAddress = process.env.MPC_ADDRESS!;
const passphrase = process.env.MNEMONIC!;

const instance = axios.create({
  baseURL: HTTP_ENDPOINT,
  timeout: 2000,
});

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

message AssetMessage {
  required uint64 amount = 1;
  required bytes recipientAddress = 2;
  required string data = 3;
}

message TransactionMessage {
  required uint32 moduleID = 1;
  required uint32 assetID = 2;
  required uint64 nonce = 3;
  required uint64 fee = 4;
  required bytes senderPublicKey = 5;
  required bytes asset = 6;
  repeated bytes signatures = 7;
}
`;

const getPayloadBuffer = (chainId: Number, amount: Number, recipient: String): Buffer =>  {
  var payload = {
    chainId: chainId,
    recipient: Uint8Array.from(
      Buffer.from(recipient.substring(2, recipient.length), "hex")
    ),
    amount: amount,
  };

  var root = protobuf.parse(proto, { keepCase: true }).root;
  var TransferData = root.lookupType("lisk.TransferData");
  var payloadMessage = TransferData.encode(TransferData.create(payload)).finish();

  return Buffer.from(payloadMessage);
}

const getAsset = (amount: Number, recipientAddress: Buffer, payload: Buffer): Buffer => {

  const transferAsset = {
    amount: amount,
    recipientAddress,
    data: payload.toString('base64'),
  };

  var root = protobuf.parse(proto, { keepCase: true }).root;
  var AssetMessage = root.lookupType("lisk.AssetMessage");
  var assetMessage = AssetMessage.encode(AssetMessage.create(transferAsset)).finish();

  return Buffer.from(assetMessage);
}

const transferLisk = async (chainId: Number, amount: Number, recipient: String) => {
  const address  = cryptography.getBase32AddressFromPassphrase(passphrase);
  const {  publicKey } = cryptography.getAddressAndPublicKeyFromPassphrase(passphrase);

  console.log(address);
  const info = await instance.get(`/accounts?address=${address}`)
  const { data :  [ { sequence: { nonce } } ] } = info.data;
  console.log("nonce = ", nonce);

  const recipientAddress = cryptography.getAddressFromBase32Address(mpcAddress);
  const payload = getPayloadBuffer(chainId, amount, recipient);

  // Transaction
  var unsignedTransaction = {
    moduleID: Number(2),
    assetID: Number(0), // aka Token Transfer transaction
    fee: Number(500000),
    nonce: Number(nonce),
    senderPublicKey: publicKey,
    asset: getAsset(amount, recipientAddress, payload),
    signatures: Array(),
  };


  var root = protobuf.parse(proto, { keepCase: true }).root;
  var TransactionMessage = root.lookupType("lisk.TransactionMessage");
  var transactionMessage = TransactionMessage.encode(TransactionMessage.create(unsignedTransaction)).finish();
  var transactionBuffer = Buffer.from(transactionMessage);

  const transactionWithNetworkIdentifierBytes = Buffer.concat([
    networkIdentifier,
    transactionBuffer,
  ]);

  var signature = cryptography.signData(transactionWithNetworkIdentifierBytes, passphrase);
  unsignedTransaction.signatures.push(signature);
  var transactionMessage = TransactionMessage.encode(TransactionMessage.create(unsignedTransaction)).finish();
  var transactionBuffer = Buffer.from(transactionMessage);

  try {
    var response = await instance.post('/transactions', {
      transaction: transactionBuffer.toString('hex'),
    })
    console.log("response = ", response.data);
  } catch (error) {
    console.log("error = ", error);
  }
}

const main = async () => {
  // 43113 is avax testnet
  await transferLisk(43113, Number(100000000), "0xbac265B9e5758F325703bcc6C43F98C84e2F5aD9");
};

(async () => {
  try {
    await main();
  } catch (e) {
    console.log("Error = ", e);
  }
})();
