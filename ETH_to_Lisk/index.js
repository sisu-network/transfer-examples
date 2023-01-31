(async () => {
  const Web3 = require("web3");
  const { abi } = require("./abi/vaultABI");
  require("dotenv").config();
  const web3 = new Web3("https://rpc.ankr.com/polygon_mumbai");

  const privateKey = process.env.PRIVATE_KEY;
  const vaultContract = process.env.VAULT_ADDRESS;
  const srcToken = process.env.ERC20_ADDRESS;
  const dstReceiverToken = "lskw6errschsfdrou4q8cdcoz7q79f82mzuso8wqw";
  const liskTestnetId = "9872347238347"; // Lisk testnet chain id
  const account = web3.eth.accounts.privateKeyToAccount("0x" + privateKey);
  let contract = new web3.eth.Contract(abi, vaultContract, {
    from: account.address, // default from address
    gas: "1000000",
  });
  web3.eth.accounts.wallet.add(account);
  web3.eth.defaultAccount = account.address;

  contract.methods
    .transferOutNonEvm(srcToken, liskTestnetId, dstReceiverToken, BigInt(100000000000000000000))
    .send({ from: account.address }, function (err, res) {
      if (err) {
        console.log("An error occurred", err);
        return;
      }
      console.log("Hash of the transaction: " + res);
    });
})();
