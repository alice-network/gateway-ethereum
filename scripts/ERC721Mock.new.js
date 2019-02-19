const ERC721GatewayMintable = artifacts.require("./mock/ERC721Mock.sol");

module.exports = async function (callback) {
  try {
    // let gatewayAddr = readline.question("Gateway address: ");
    // let name = readline.question("Name: ");
    // let symbol = readline.question("Symbol: ");

    ERC721GatewayMintable.new()
      .on("receipt", receipt => {
        console.log(receipt);
        callback();
      })
      .on("error", e => {
        console.error(e);
        callback(e);
      });
  } catch (e) {
    callback(e);
  }
};
