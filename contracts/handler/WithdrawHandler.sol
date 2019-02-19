pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC721/IERC721.sol";
import "openzeppelin-solidity/contracts/cryptography/ECDSA.sol";

import "./DepositHandler.sol";


/**
 * @title WithdrawHandler
 */
contract WithdrawHandler is DepositHandler {
    using ECDSA for bytes32;

    event ERC20Withdrawn(address indexed owner, address indexed token, uint amount);
    event ERC721Withdrawn(address indexed owner, address indexed token, uint tokenId);
    event ETHWithdrawn(address indexed owner, uint amount);

    mapping(uint => bool) public usedNonces;

    function initialize(address owner, address oracle) public initializer {
        DepositHandler.initialize(owner, oracle);
    }

    /**
     * @dev withdraw ERC20 token
     * @param withdrawalNonce The nonce of withdrawal
     * @param tokenAddress The address of token
     * @param amount The amount of token
     * @param signature The signature of withdrawal
     */
    function withdrawERC20(
        uint withdrawalNonce,
        address tokenAddress,
        uint amount,
        bytes memory signature
    ) public nonReentrant {
        require(tokenAddress != address(0));
        require(amount > 0);
        require(_verifyWithdrawalSignature(withdrawalNonce, tokenAddress, amount, signature), "Signature is invalid");
        _setNonceUsed(withdrawalNonce);

        IERC20(tokenAddress).transfer(msg.sender, amount);

        emit ERC20Withdrawn(msg.sender, tokenAddress, amount);
    }

    /**
     * @dev withdraw ERC721 token
     * @param withdrawalNonce The nonce of withdrawal
     * @param tokenAddress The address of token
     * @param tokenId The ID of token
     * @param signature The signature of withdrawal
     */
    function withdrawERC721(
        uint withdrawalNonce,
        address tokenAddress,
        uint tokenId,
        bytes memory signature
    ) public nonReentrant {
        require(tokenAddress != address(0));
        require(_verifyWithdrawalSignature(withdrawalNonce, tokenAddress, tokenId, signature), "Signature is invalid");
        _setNonceUsed(withdrawalNonce);

        IERC721(tokenAddress).safeTransferFrom(address(this), msg.sender, tokenId);

        emit ERC721Withdrawn(msg.sender, tokenAddress, tokenId);
    }

    /**
     * @dev withdraw Ethereum
     * @param withdrawalNonce The nonce of withdrawal
     * @param amount The amount of ethereum
     * @param signature The signature of withdrawal
     */
    function withdrawETH(
        uint withdrawalNonce,
        uint amount,
        bytes memory signature
    ) public nonReentrant {
        require(_verifyWithdrawalSignature(withdrawalNonce, address(0), amount, signature), "Signature is invalid");
        _setNonceUsed(withdrawalNonce);

        msg.sender.transfer(amount);

        emit ETHWithdrawn(msg.sender, amount);
    }

    /**
     * @dev check given nonce is valid
     * @param nonce The nonce to be checked
     * @return true if given nonce is valid
     */
    function _isValidNonce(uint nonce) internal view returns (bool) {
        return !usedNonces[nonce];
    }

    /**
     * @dev set given nonce as used
     * @param nonce The nonce to be setted
     */
    function _setNonceUsed(uint nonce) internal {
        usedNonces[nonce] = true;
    }

    /**
     * @dev verify signature of withdrawal
     * @param withdrawalNonce The nonce of withdrawal
     * @param tokenAddress The address of token contract. Will be `address(0)` if value is Ethereum
     * @param value The value of token.
     * @param signature The signature of withdrawal
     * @return true if signature is valid
     */
    function _verifyWithdrawalSignature(
        uint withdrawalNonce,
        address tokenAddress,
        uint value,
        bytes memory signature
    ) internal view returns (bool) {
        require(_isValidNonce(withdrawalNonce), "invalid nonce");

        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 hash = keccak256(abi.encodePacked(withdrawalNonce, tokenAddress, msg.sender, value));
        hash = keccak256(abi.encodePacked(prefix, hash));

        address signer = hash.recover(signature);

        require(signer == oracle(), "not signed by oracle");

        return true;
    }

    // Reserved storage space to allow for layout changes in the future.
    uint256[50] private ______gap;
}
