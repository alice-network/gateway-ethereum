const { BN } = require('openzeppelin-test-helpers');

async function balanceDifferenceWithoutGas(account, promiseFunc) {
    const balanceBefore = new BN(await web3.eth.getBalance(account));
    const result = await promiseFunc();
    const balanceAfter = new BN(await web3.eth.getBalance(account));

    let gasAmount;
    if ('gasUsed' in result) {
        const gasUsed = new BN(result.gasUsed);
        const tx = await web3.eth.getTransaction(result.transactionHash);
        const gasPrice = new BN(tx.gasPrice);
        gasAmount = gasUsed.mul(gasPrice)
    }

    else if ('receipt' in result) {
        const gasUsed = new BN(result.receipt.gasUsed);
        const tx = await web3.eth.getTransaction(result.tx);
        const gasPrice = new BN(tx.gasPrice);
        gasAmount = gasUsed.mul(gasPrice)
    }

    return balanceAfter.sub(balanceBefore).add(gasAmount);
}

module.exports = {
    balanceDifferenceWithoutGas,
};
