const Gateway = artifacts.require("Gateway");
const readline = require("readline-sync");
const {BigNumber} = require("bignumber.js");

module.exports = async function (callback) {
    try {
        let gatewayAddr = readline.question("Gateway address: ");
        let tokenAddr = readline.question("Token address: ");
        let nonce = new BigNumber(readline.question("Nonce: "));
        let amount = new BigNumber(readline.question("Amount: "));
        let signature = readline.question("Signature: ");

        const gateway = await Gateway.at(gatewayAddr);
        console.log(await gateway.withdrawERC20(nonce, tokenAddr, amount, signature));
        callback();
    } catch (e) {
        callback(e);
    }
};
