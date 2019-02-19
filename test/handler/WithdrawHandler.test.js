const ERC20 = artifacts.require("./mock/ERC20Mock.sol");
const ERC721 = artifacts.require("./mock/ERC721Mock.sol");
const WithdrawHandler = artifacts.require("./handler/WithdrawHandler.sol");

const { BN, constants, ether, shouldFail, expectEvent } = require("openzeppelin-test-helpers");
const { ZERO_ADDRESS } = constants;

const { signMessageHash } = require("../utils/sign");

const {
  balanceDifferenceWithoutGas
} = require("../helpers/balanceDifference");

contract("WithdrawHandler", async function ([admin, owner, oracle, user1, user2]) {
  let handler;
  let erc20;
  let erc721;
  const ethValue = ether("20");
  const erc20Value = new BN("100");
  const erc721TokenId = new BN("1");

  async function initializeHandler(owner, oracle) {
    const signature = "initialize(address,address)";
    const args = [owner, oracle];
    await handler.methods[signature](...args, { from: admin });
  }

  beforeEach(async function () {
    handler = await WithdrawHandler.new({ from: admin });
    await initializeHandler(owner, oracle);
    erc20 = await ERC20.new();
    erc721 = await ERC721.new();
  });

  describe("withdraw", async function () {
    context("withdrawETH", async function () {
      it("should withdraw eth", async function () {
        await handler.depositETH({ from: user1, value: ethValue });

        let nonce = 1;
        let msg = web3.utils.soliditySha3(
          { type: "uint", value: nonce },
          { type: "address", value: ZERO_ADDRESS },
          { type: "address", value: user1 },
          { type: "uint", value: ethValue }
        );

        let signature = await signMessageHash(msg, oracle);

        let result;
        let diff = await balanceDifferenceWithoutGas(user1, async function () {
          result = await handler.withdrawETH(nonce, ethValue, signature, {
            from: user1
          });
          return result;
        });

        ethValue.should.be.bignumber.equal(diff.abs());

        expectEvent.inLogs(result.logs, "ETHWithdrawn", {
          owner: user1,
          amount: ethValue
        });
      });
      it("should not withdraw when signature is not valid", async function () {
        await handler.depositETH({ from: user1, value: ethValue });

        let nonce = 1;
        let msg1 = web3.utils.soliditySha3(
          { type: "uint", value: nonce },
          { type: "address", value: ZERO_ADDRESS },
          { type: "address", value: user1 },
          { type: "uint", value: ethValue }
        );

        let msg2 = web3.utils.soliditySha3(
          { type: "uint", value: nonce + 1 },
          { type: "address", value: ZERO_ADDRESS },
          { type: "address", value: user1 },
          { type: "uint", value: ethValue }
        );

        let msg3 = web3.utils.soliditySha3(
          { type: "uint", value: nonce },
          { type: "address", value: ZERO_ADDRESS },
          { type: "address", value: user1 },
          { type: "uint", value: ethValue + ethValue }
        );

        let signature1 = await signMessageHash(msg1, user1);
        let signature2 = await signMessageHash(msg2, oracle);
        let signature3 = await signMessageHash(msg3, oracle);

        // signed with wrong key
        await shouldFail.reverting(
          handler.withdrawETH(nonce, ethValue, signature1, { from: user1 })
        );

        // signed with wrong nonce
        await shouldFail.reverting(
          handler.withdrawETH(nonce, ethValue, signature2, { from: user1 })
        );

        // signed with wrong amount
        await shouldFail.reverting(
          handler.withdrawETH(nonce, ethValue, signature3, { from: user1 })
        );
      });

      it("should not withdraw when amount is higher than remaining balance", async function () {
        await handler.depositETH({ from: user1, value: ethValue });

        let nonce = 1;
        let msg = web3.utils.soliditySha3(
          { type: "uint", value: nonce },
          { type: "address", value: ZERO_ADDRESS },
          { type: "address", value: user1 },
          { type: "uint", value: ethValue.add(ethValue) }
        );

        let signature = await signMessageHash(msg, oracle);

        // signed with wrong key
        await shouldFail.reverting(
          handler.withdrawETH(nonce, ethValue.add(ethValue), signature, {
            from: user1
          })
        );
      });
    });

    context("ERC20", async function () {

      it("should withdraw erc20", async function () {
        await erc20.mint(handler.address, erc20Value, { from: admin });

        let nonce = 1;
        let msg = web3.utils.soliditySha3(
          { type: "uint", value: nonce },
          { type: "address", value: erc20.address },
          { type: "address", value: user1 },
          { type: "uint", value: erc20Value }
        );

        // let hash = toEthSignedMessageHash(msg);
        let signature = await signMessageHash(msg, oracle);

        let result = await handler.withdrawERC20(
          nonce,
          erc20.address,
          erc20Value,
          signature,
          { from: user1 }
        );

        (await erc20.balanceOf(user1)).should.be.bignumber.equal(erc20Value);

        expectEvent.inLogs(result.logs, "ERC20Withdrawn", {
          owner: user1,
          token: erc20.address,
          amount: erc20Value
        });
      });
      it("should not withdraw when signature is not valid", async function () {
        await erc20.mint(handler.address, erc20Value, { from: admin });

        let nonce = 1;
        let msg1 = web3.utils.soliditySha3(
          { type: "uint", value: nonce },
          { type: "address", value: erc20.address },
          { type: "address", value: user1 },
          { type: "uint", value: erc20Value }
        );

        let msg2 = web3.utils.soliditySha3(
          { type: "uint", value: nonce },
          { type: "address", value: erc721.address },
          { type: "address", value: user1 },
          { type: "uint", value: erc20Value }
        );

        let msg3 = web3.utils.soliditySha3(
          { type: "uint", value: nonce + 1 },
          { type: "address", value: erc20.address },
          { type: "address", value: user1 },
          { type: "uint", value: ethValue }
        );

        let msg4 = web3.utils.soliditySha3(
          { type: "uint", value: nonce },
          { type: "address", value: erc20.address },
          { type: "address", value: user1 },
          { type: "uint", value: ethValue + ethValue }
        );

        let signature1 = await signMessageHash(msg1, user1);
        let signature2 = await signMessageHash(msg2, oracle);
        let signature3 = await signMessageHash(msg3, oracle);
        let signature4 = await signMessageHash(msg4, oracle);

        // signed with wrong key
        await shouldFail.reverting(
          handler.withdrawERC20(nonce, erc20.address, erc20Value, signature1, {
            from: user1
          })
        );

        // signed with wrong address
        await shouldFail.reverting(
          handler.withdrawERC20(nonce, erc20.address, erc20Value, signature2, {
            from: user1
          })
        );

        // signed with wrong nonce
        await shouldFail.reverting(
          handler.withdrawERC20(nonce, erc20.address, erc20Value, signature3, {
            from: user1
          })
        );

        // signed with wrong amount
        await shouldFail.reverting(
          handler.withdrawERC20(nonce, erc20.address, erc20Value, signature4, {
            from: user1
          })
        );
      });

      it("should not withdraw when amount is higher than remaining balance", async function () {
        await erc20.mint(handler.address, erc20Value, { from: admin });

        let nonce = 1;
        let msg = web3.utils.soliditySha3(
          { type: "uint", value: nonce },
          { type: "address", value: ZERO_ADDRESS },
          { type: "address", value: user1 },
          { type: "uint", value: erc20Value + erc20Value }
        );

        let signature = await signMessageHash(msg, oracle);

        // signed with wrong key
        await shouldFail.reverting(
          handler.withdrawERC20(
            nonce,
            erc20.address,
            erc20Value + erc20Value,
            signature,
            { from: user1 }
          )
        );
      });
    });

    context("ERC721", async function () {
      it("should withdraw erc721", async function () {
        await erc721.mint(handler.address, erc721TokenId, { from: admin });

        let nonce = 1;
        let msg = web3.utils.soliditySha3(
          { type: "uint", value: nonce },
          { type: "address", value: erc721.address },
          { type: "address", value: user1 },
          { type: "uint", value: erc721TokenId }
        );

        let signature = await signMessageHash(msg, oracle);

        let result = await handler.withdrawERC721(
          nonce,
          erc721.address,
          erc721TokenId,
          signature,
          { from: user1 }
        );

        (await erc721.ownerOf(erc721TokenId)).should.be.equal(user1);

        expectEvent.inLogs(result.logs, "ERC721Withdrawn", {
          owner: user1,
          token: erc721.address,
          tokenId: erc721TokenId
        });
      });

      it("should not withdraw when signature is not valid", async function () {
        await erc721.mint(handler.address, erc721TokenId, { from: admin });

        let nonce = 1;
        let msg1 = web3.utils.soliditySha3(
          { type: "uint", value: nonce },
          { type: "address", value: erc721.address },
          { type: "address", value: user1 },
          { type: "uint", value: erc721TokenId }
        );

        let msg2 = web3.utils.soliditySha3(
          { type: "uint", value: nonce },
          { type: "address", value: erc20.address },
          { type: "address", value: user1 },
          { type: "uint", value: erc721TokenId }
        );

        let msg3 = web3.utils.soliditySha3(
          { type: "uint", value: nonce + 1 },
          { type: "address", value: erc721.address },
          { type: "address", value: user1 },
          { type: "uint", value: erc721TokenId }
        );

        let msg4 = web3.utils.soliditySha3(
          { type: "uint", value: nonce },
          { type: "address", value: erc721.address },
          { type: "address", value: user1 },
          { type: "uint", value: erc721TokenId + erc721TokenId }
        );

        let signature1 = await signMessageHash(msg1, user1);
        let signature2 = await signMessageHash(msg2, oracle);
        let signature3 = await signMessageHash(msg3, oracle);
        let signature4 = await signMessageHash(msg4, oracle);

        // signed with wrong key
        await shouldFail.reverting(
          handler.withdrawERC721(
            nonce,
            erc721.address,
            erc721TokenId,
            signature1,
            { from: user1 }
          )
        );

        // signed with wrong address
        await shouldFail.reverting(
          handler.withdrawERC721(
            nonce,
            erc721.address,
            erc721TokenId,
            signature2,
            { from: user1 }
          )
        );

        // signed with wrong nonce
        await shouldFail.reverting(
          handler.withdrawERC721(
            nonce,
            erc721.address,
            erc721TokenId,
            signature3,
            { from: user1 }
          )
        );

        // signed with wrong tokenId
        await shouldFail.reverting(
          handler.withdrawERC721(
            nonce,
            erc721.address,
            erc721TokenId,
            signature4,
            { from: user1 }
          )
        );
      });

      it("should not withdraw when tokenId is not valid", async function () {
        await erc721.mint(handler.address, erc721TokenId, { from: admin });

        let nonce = 1;
        let msg = web3.utils.soliditySha3(
          { type: "address", value: user1 },
          { type: "address", value: erc721.address },
          { type: "uint", value: nonce },
          { type: "uint", value: erc721TokenId + erc721TokenId }
        );

        let signature = await signMessageHash(msg, oracle);

        // signed with wrong key
        await shouldFail.reverting(
          handler.withdrawERC721(
            nonce,
            erc721.address,
            erc721TokenId + erc721TokenId,
            signature,
            { from: user1 }
          )
        );
      });
    });


  });
});
