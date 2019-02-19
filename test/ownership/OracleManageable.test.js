const OracleManageable = artifacts.require("./mock/OracleManageableMock.sol");

const { constants, shouldFail } = require('openzeppelin-test-helpers');
const { ZERO_ADDRESS } = constants;

contract("OracleManageable", async function ([admin, owner, oracle, user, newOracle]) {
  let managed;

  async function initialize(owner, oracle) {
    const signature = 'initialize(address,address)';
    const args = [owner, oracle];
    await managed.methods[signature](...args, { from: admin });
  }

  beforeEach(async function () {
    managed = await OracleManageable.new({ from: admin });
  });

  context("initialize", function () {
    it("should fail if oracle is ZERO_ADDRESS", async function () {
      await shouldFail.reverting(
        initialize(owner, ZERO_ADDRESS)
      );
    });
  });

  context("with oracle", function () {
    beforeEach(async function () {
      await initialize(owner, oracle);
    });

    it("should change oracle", async function () {
      await managed.changeOracle(newOracle, { from: owner });

      assert.equal(newOracle, await managed.oracle());
    });

    it("should not change oracle if not called by owner", async function () {
      await shouldFail.reverting(managed.changeOracle(newOracle, { from: user }));
    });

    it("should not change oracle if newOracle is ZERO_ADDRESS", async function () {
      await shouldFail.reverting(managed.changeOracle(ZERO_ADDRESS, { from: owner }));
    });

    it("should ok onlyOracle if called by oracle", async function () {
      assert.equal(true, await managed.restricted({ from: oracle }));
    });

    it("should revert onlyOracle if not called by oracle", async function () {
      await shouldFail.reverting(managed.restricted({ from: user }));
    });
  });
});
