(async () => {
  const Web3 = require("web3");
  const { abi } = require("./abi/vaultABI");
  require("dotenv").config();
  const web3 = new Web3("https://rpc.ankr.com/polygon_mumbai");

  const privateKey = process.env.PRIVATE_KEY;
  const vaultContract = "0x303711CFe2C9bD11fc620C2BEE71Db26AC866130";
  const srcToken = "0x4B7785c2a265D6DF777c1635C1B1B09a6b9fba9d";
  const dstReceiverToken = "lskw6errschsfdrou4q8cdcoz7q79f82mzuso8wqw";
  const liskTestnetId = "9872347238347";
  const account = web3.eth.accounts.privateKeyToAccount("0x" + privateKey);
  let contract = new web3.eth.Contract(abi, vaultContract, {
    from: account.address, // default from address
    gas: "1000000",
  });
  web3.eth.accounts.wallet.add(account);
  web3.eth.defaultAccount = account.address;

  contract.methods
    .transferOutNonEvm(
      srcToken,
      liskTestnetId,
      dstReceiverToken,
      BigInt(100000000000000000000)
    )
    .send({ from: account.address }, function (err, res) {
      if (err) {
        console.log("An error occurred", err);
        return;
      }
      console.log("Hash of the transaction: " + res);
    });
})();
