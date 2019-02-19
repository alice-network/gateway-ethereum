pragma solidity ^0.5.0;

import "zos-lib/contracts/Initializable.sol";
import "openzeppelin-eth/contracts/ownership/Ownable.sol";


/**
 * @title OracleManageable
 */
contract OracleManageable is Initializable, Ownable {
    address private _oracle;

    event OracleChanged(address indexed from, address indexed to);

    /**
     * @dev Reverts if not called by oracle.
     */
    modifier onlyOracle() {
        require(isOracle(), "only oracle");
        _;
    }

    function initialize(address owner, address oracle) public initializer {
        Ownable.initialize(owner);

        require(oracle != address(0));
        _oracle = oracle;
    }

    /**
     * @return the address of the oracle.
     */
    function oracle() public view returns (address) {
        return _oracle;
    }

    /**
     * @return true if `msg.sender` is the oracle.
     */
    function isOracle() public view returns (bool) {
        return msg.sender == _oracle;
    }

    /**
     * @dev Allows the current oracle can set a new oracle.
     * @param newOracle address The address of the new oracle
     */
    function changeOracle(address newOracle) public onlyOwner {
        require(newOracle != address(0));

        emit OracleChanged(_oracle, newOracle);

        _oracle = newOracle;
    }

    // Reserved storage space to allow for layout changes in the future.
    uint256[50] private ______gap;
}
