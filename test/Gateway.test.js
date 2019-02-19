const ERC20 = artifacts.require("./mock/ERC20Mock.sol");
const ERC721 = artifacts.require("./mock/ERC721Mock.sol");
const Gateway = artifacts.require("./Gateway.sol");

contract("Gateway", async function([_, admin, oracle, user1, user2]) {
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  let gateway;
  let erc20;
  let erc721;
  const ethValue = web3.utils.toBN(web3.utils.toWei("20", "ether"));
  const erc20Value = 100;
  const erc721TokenId = 1;

  async function initializeGateway(owner, oracle) {
    const signature = "initialize(address,address)"
    const args = [owner, oracle]
    await gateway.methods[signature](...args, { from: admin })
  }

  beforeEach(async function() {
    gateway = await Gateway.new({ from: admin });
    initializeGateway(owner, oracle);
    erc20 = await ERC20.new({ from: admin });
    erc721 = await ERC721.new({ from: admin });
  });
});
