pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";


contract ERC20Mock is ERC20Mintable, ERC20Detailed("Mock Token", "MockT", 18) {}
