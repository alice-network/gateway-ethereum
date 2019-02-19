const ERC20 = artifacts.require("./mock/ERC20Mock.sol");
const ERC721 = artifacts.require("./mock/ERC721Mock.sol");
const ERC721BasicToken = artifacts.require("./mock/ERC721BasicToken.sol");
const DepositHandler = artifacts.require("./handler/DepositHandler.sol");

const { BN, ether, shouldFail, expectEvent } = require("openzeppelin-test-helpers");

const {
  balanceDifferenceWithoutGas
} = require("../helpers/balanceDifference");

contract("DepositHandler", async function ([admin, owner, oracle, user1, user2]) {
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
    handler = await DepositHandler.new({ from: admin });
    await initializeHandler(owner, oracle);
    erc20 = await ERC20.new();
    erc721 = await ERC721.new();
  });

  describe("deposit", async function () {
    const expectedDepositId = new BN("0");

    context("depositETH", function () {
      it("should deposit eth", async function () {
        let result;

        let diff = await balanceDifferenceWithoutGas(user1, async function () {
          result = await handler.depositETH({
            from: user1,
            value: ethValue
          });
          return result;
        });

        ethValue.should.be.bignumber.equal(diff.abs());

        expectEvent.inLogs(result.logs, "ETHDeposited", {
          depositId: expectedDepositId,
          owner: user1,
          amount: ethValue
        });
      });

      it("should not deposit eth if amount is 0 ", async function () {
        await shouldFail.reverting(
          handler.depositETH({ from: user1, to: handler.address, value: 0 })
        );

        await shouldFail.reverting(
          web3.eth.sendTransaction({
            from: user1,
            to: handler.address,
            value: 0
          })
        );
      });

      it("should not deposit eth if amount is more than balance", async function () {
        let balance = web3.utils.toBN(await web3.eth.getBalance(user1));
        balance = balance.add(ethValue);

        await shouldFail(
          handler.depositETH({
            from: user1,
            to: handler.address,
            value: balance.add(ethValue)
          })
        );

        await shouldFail(
          web3.eth.sendTransaction({
            from: user1,
            to: handler.address,
            value: balance.add(ethValue)
          })
        );
      });
    });

    context("depositERC20", function () {
      it("should deposit erc20 using 2-step approve-transferFrom", async function () {
        await erc20.mint(user1, erc20Value, { from: admin });

        const before = await erc20.balanceOf(user1);
        before.should.be.bignumber.equal(erc20Value);

        await erc20.approve(handler.address, erc20Value, { from: user1 });

        let result = await handler.depositERC20(erc20.address, erc20Value, {
          from: user1
        });

        const after = await erc20.balanceOf(user1);
        after.should.be.bignumber.equal("0");

        expectEvent.inLogs(result.logs, "ERC20Deposited", {
          depositId: expectedDepositId,
          owner: user1,
          token: erc20.address,
          amount: erc20Value
        });
      });

      it("should not deposit erc20 if amount is 0", async function () {
        await erc20.mint(user1, erc20Value, { from: admin });
        await erc20.approve(handler.address, erc20Value, { from: user1 });

        await shouldFail.reverting(
          handler.depositERC20(erc20.address, 0, { from: user1 })
        );
      });

      it("should not deposit erc20 if amount is more than balance", async function () {
        await erc20.mint(user1, erc20Value, { from: admin });
        await erc20.approve(handler.address, erc20Value, { from: user1 });

        await shouldFail.reverting(
          handler.depositERC20(erc20.address, erc20Value + erc20Value, {
            from: user1
          })
        );
      });
    });

    context("depositERC721", function () {
      it("should deposit erc721 using 2-step approve-transferFrom", async function () {
        await erc721.mint(user1, erc721TokenId, { from: admin });

        const beforeOwner = await erc721.ownerOf(erc721TokenId);
        beforeOwner.should.be.equal(user1);

        await erc721.approve(handler.address, erc721TokenId, { from: user1 });

        let result = await handler.depositERC721(
          erc721.address,
          erc721TokenId,
          { from: user1 }
        );

        const afterOwner = await erc721.ownerOf(erc721TokenId);
        afterOwner.should.be.equal(handler.address);

        expectEvent.inLogs(result.logs, "ERC721Deposited", {
          depositId: expectedDepositId,
          owner: user1,
          token: erc721.address,
          tokenId: erc721TokenId
        });
      });

      it("should deposit erc721 using safeTransferFrom", async function() {
        await erc721.mint(user1, erc721TokenId, { from: admin })

        const beforeOwner = await erc721.ownerOf(erc721TokenId)
        beforeOwner.should.be.equal(user1)

        let result = await erc721.safeTransferFrom(
          user1,
          handler.address,
          erc721TokenId,
          { from: user1 }
        )

        const afterOwner = await erc721.ownerOf(erc721TokenId)
        afterOwner.should.be.equal(handler.address)

        await expectEvent.inTransaction(
          result.tx,
          DepositHandler,
          "ERC721Deposited",
          {
            depositId: expectedDepositId,
            owner: user1,
            token: erc721.address,
            tokenId: erc721TokenId
          }
        )
      })

      it("should deposit erc721 using old safeTransferFrom", async function () {
        const erc721Old = await ERC721BasicToken.new({ from: admin })
        await erc721Old.mint(user1, erc721TokenId, { from: admin });

        const beforeOwner = await erc721Old.ownerOf(erc721TokenId);
        beforeOwner.should.be.equal(user1);

        let result = await erc721Old.safeTransferFrom(
          user1,
          handler.address,
          erc721TokenId,
          { from: user1 }
        );

        const afterOwner = await erc721Old.ownerOf(erc721TokenId);
        afterOwner.should.be.equal(handler.address);

        await expectEvent.inTransaction(result.tx, DepositHandler, "ERC721Deposited", {
          depositId: expectedDepositId,
          owner: user1,
          token: erc721Old.address,
          tokenId: erc721TokenId
        });
      });

      it("should not deposit erc721 if tokenId is not valid", async function () {
        await erc721.mint(user1, erc721TokenId, { from: admin });
        await erc721.approve(handler.address, erc721TokenId, { from: user1 });

        await shouldFail.reverting(handler.depositERC721(erc721.address, 0, {
          from: user1
        }));

        await shouldFail.reverting(erc721.safeTransferFrom(
          user1,
          handler.address,
          0,
          { from: user1 }
        ));
      });

      it("should not deposit erc721 if tokenId is not owned", async function () {
        await erc721.mint(user2, erc721TokenId, { from: admin });
        await erc721.approve(handler.address, erc721TokenId, { from: user2 });

        await shouldFail.reverting(handler.depositERC20(
          erc721.address,
          erc721TokenId,
          { from: user1 }
        ));

        await shouldFail.reverting(erc721.safeTransferFrom(
          user1,
          handler.address,
          erc721TokenId,
          {
            from: user1
          }
        ));
      });
    });
  });

  context("cancel deposit", async function () {
    beforeEach(async function () {
      await erc20.mint(user1, erc20Value, { from: admin });
      await erc20.approve(handler.address, erc20Value, { from: user1 });
      await handler.depositERC20(erc20.address, erc20Value, { from: user1 });
      await erc721.mint(user1, erc721TokenId, { from: admin });
      await erc721.safeTransferFrom(user1, handler.address, erc721TokenId, { from: user1 });
      await handler.depositETH({ from: user1, value: ethValue });
    });

    it("should cancel deposit", async function () {
      (await handler.getDeposit(0))[0].should.be.bignumber.equal("1");

      let result1 = await handler.cancelFailedDeposit(0, { from: oracle });

      (await handler.getDeposit(0))[0].should.be.bignumber.equal("2");

      expectEvent.inLogs(result1.logs, "ERC20DepositCancelled", {
        depositId: new BN("0"),
        owner: user1,
        token: erc20.address,
        amount: erc20Value
      });

      (await handler.getDeposit(1))[0].should.be.bignumber.equal("1");

      let result2 = await handler.cancelFailedDeposit(1, { from: oracle });

      (await handler.getDeposit(1))[0].should.be.bignumber.equal("2");

      expectEvent.inLogs(result2.logs, "ERC721DepositCancelled", {
        depositId: new BN("1"),
        owner: user1,
        token: erc721.address,
        tokenId: erc721TokenId
      });

      (await handler.getDeposit(2))[0].should.be.bignumber.equal("1");

      let result3 = await handler.cancelFailedDeposit(2, { from: oracle });

      (await handler.getDeposit(2))[0].should.be.bignumber.equal("2");

      expectEvent.inLogs(result3.logs, "ETHDepositCancelled", {
        depositId: new BN("2"),
        owner: user1,
        amount: ethValue
      });
    });

    it("should revert when depositId is invalid", async function() {
      await shouldFail.reverting(
        handler.cancelFailedDeposit(4, { from: oracle })
      );
    });

    it("should revert when deposit is already canceled", async function () {
      (await handler.getDeposit(0))[0].should.be.bignumber.equal("1");

      await handler.cancelFailedDeposit(0, { from: oracle });

      (await handler.getDeposit(0))[0].should.be.bignumber.equal("2");

      await shouldFail.reverting(
        handler.cancelFailedDeposit(0, { from: oracle })
      );
    });
  });
});
