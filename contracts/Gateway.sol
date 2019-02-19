pragma solidity ^0.5.0;

import "zos-lib/contracts/Initializable.sol";

import "./handler/WithdrawHandler.sol";


contract Gateway is Initializable, WithdrawHandler {
    function initialize(address sender, address oracle) public initializer {
        WithdrawHandler.initialize(sender, oracle);
    }

    // Reserved storage space to allow for layout changes in the future.
    uint256[50] private ______gap;
}
