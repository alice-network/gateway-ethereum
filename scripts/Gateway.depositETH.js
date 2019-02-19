const Gateway = artifacts.require("Gateway");
const readline = require("readline-sync");
const {BigNumber} = require("bignumber.js");

module.exports = async function (callback) {
    try {
        let gatewayAddr = readline.question("Gateway address: ");
        let amount = new BigNumber(readline.question("Amount: "));

        const gateway = await Gateway.at(gatewayAddr);
        console.log(await gateway.depositETH({value: amount}));
        callback();
    } catch (e) {
        callback(e);
    }
};
