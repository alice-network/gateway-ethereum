pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721Mintable.sol";
import "openzeppelin-solidity/contracts/token/ERC721/ERC721Metadata.sol";


contract ERC721Mock is ERC721Mintable, ERC721Metadata("Mock 721 Token", "Mock721T") {}
