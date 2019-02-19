pragma solidity ^0.5.0;

import "../ownership/OracleManageable.sol";


contract OracleManageableMock is OracleManageable {
    function restricted() public view onlyOracle returns (bool) {
        return true;
    }
}
