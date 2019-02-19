const Gateway = artifacts.require("Gateway");
const ERC20 = artifacts.require("ERC20");
const readline = require("readline-sync");
const {BigNumber} = require("bignumber.js");

module.exports = async function (callback) {
    try {
        let gatewayAddr = readline.question("Gateway address: ");
        let tokenAddr = readline.question("Token address: ");
        let amount = new BigNumber(readline.question("Amount: "));

        const gateway = await Gateway.at(gatewayAddr);
        const erc20 = await ERC20.at(tokenAddr);
        console.log(await erc20.approve(gateway.address, amount));
        console.log(await gateway.depositERC20(erc20.address, amount));
        callback();
    } catch (e) {
        callback(e);
    }
};
