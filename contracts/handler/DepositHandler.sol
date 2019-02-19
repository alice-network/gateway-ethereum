pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC721/IERC721.sol";
import "openzeppelin-solidity/contracts/token/ERC721/IERC721Receiver.sol";
import "openzeppelin-eth/contracts/utils/ReentrancyGuard.sol";

import "../ownership/OracleManageable.sol";


/**
 * @title DepositHandler
 */
contract DepositHandler is OracleManageable, ReentrancyGuard, IERC721Receiver {
    using SafeMath for uint;

    // Equals to `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`
    // which can be also obtained as `IERC721Receiver(0).onERC721Received.selector`
    bytes4 private constant ERC721_RECEIVED = 0x150b7a02;
    // Equals to `bytes4(keccak256("onERC721Received(address,address,uint256)"))`
    // This is old ERC721 spec. We added this for compatibility
    bytes4 private constant ERC721_RECEIVED_OLD = 0xf0b9e5ba;

    enum TokenType {
        unknown,
        eth,
        erc20,
        erc721
    }

    enum DepositStatus {
        invalid,
        deposited,
        failed
    }

    struct Deposit {
        uint id;
        DepositStatus status;
        TokenType tokenType;
        address owner;
        address token;
        uint value;
    }

    Deposit[] public deposits;

    event ERC20Deposited(uint indexed depositId, address indexed owner, address indexed token, uint amount);
    event ERC721Deposited(uint indexed depositId, address indexed owner, address indexed token, uint tokenId);
    event ETHDeposited(uint indexed depositId, address indexed owner, uint amount);
    event ERC20DepositCancelled(uint indexed depositId, address indexed owner, address indexed token, uint amount);
    event ERC721DepositCancelled(uint indexed depositId, address indexed owner, address indexed token, uint tokenId);
    event ETHDepositCancelled(uint indexed depositId, address indexed owner, uint amount);

    /**
     * @notice deposit ERC20 token
     * @param tokenAddress The address of ERC20 token contract
     * @param amount The amount of tokens to be deposited
     */
    function depositERC20(address tokenAddress, uint amount) external {
        require(amount > 0, "invalid amount");
        require(amount <= IERC20(tokenAddress).balanceOf(msg.sender), "not enough balance");
        require(amount <= IERC20(tokenAddress).allowance(msg.sender, address(this)), "not enough allowed");

        uint balanceBefore = IERC20(tokenAddress).balanceOf(address(this));

        IERC20(tokenAddress).transferFrom(msg.sender, address(this), amount);

        uint balanceAfter = IERC20(tokenAddress).balanceOf(address(this));

        require(amount == balanceAfter.sub(balanceBefore));

        uint depositId = deposits.length;
        deposits.length += 1;
        _recordDeposit(depositId, DepositStatus.deposited, TokenType.erc20, msg.sender, tokenAddress, amount);

        emit ERC20Deposited(depositId, msg.sender, tokenAddress, amount);
    }

    /**
     * @notice deposit ERC721 token
     * @param tokenAddress The address of ERC721 token contract
     * @param tokenId The ID of token to be deposited
     */
    function depositERC721(address tokenAddress, uint tokenId) external {
        _depositERC721(tokenAddress, msg.sender, tokenId);
    }

    /**
     * @notice deposit Ethereum
     */
    function depositETH() external payable {
        require(msg.value > 0);

        uint depositId = deposits.length;
        deposits.length += 1;
        _recordDeposit(depositId, DepositStatus.deposited, TokenType.eth, msg.sender, address(0), msg.value);

        emit ETHDeposited(depositId, msg.sender, msg.value);
    }

    /**
     * @notice cancel deposit when oracle fails relay deposit to side chain.
     * Reverts when given deposit is invalid or setted already failed.
     * @param depositId The ID of deposit
     */
    function cancelFailedDeposit(uint depositId) external onlyOracle nonReentrant {
        require(depositId < deposits.length, "Invalid deposit ID");

        Deposit storage deposit = deposits[depositId];

        require(deposit.status == DepositStatus.deposited, "Invalid Deposit");

        deposit.status = DepositStatus.failed;

        if (deposit.tokenType == TokenType.eth) {
            address payable ethReceiver = address(uint160(deposit.owner)); /* solhint not recognize payable address */ // solhint-disable-line
            ethReceiver.transfer(deposit.value);
            emit ETHDepositCancelled(depositId, deposit.owner, deposit.value);
        } else if (deposit.tokenType == TokenType.erc20) {
            IERC20(deposit.token).transfer(deposit.owner, deposit.value);
            emit ERC20DepositCancelled(depositId, deposit.owner, deposit.token, deposit.value);
        } else if (deposit.tokenType == TokenType.erc721) {
            IERC721(deposit.token).safeTransferFrom(address(this), deposit.owner, deposit.value);
            emit ERC721DepositCancelled(depositId, deposit.owner, deposit.token, deposit.value);
        } else {
            assert(false);
        }
    }

    function initialize(address owner, address oracle) public initializer {
        OracleManageable.initialize(owner, oracle);
        ReentrancyGuard.initialize();
    }

    /**
     * @notice Handle the receipt of an NFT
     * @param from The address which previously owned the token
     * @param tokenId The NFT identifier which is being transferred
     * @return bytes4 `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`
     */
    function onERC721Received(
        address, /* operator */
        address from,
        uint256 tokenId,
        bytes memory /* data */
    ) public returns (bytes4) {
        _handleOnERC721Received(msg.sender, from, tokenId);

        return ERC721_RECEIVED;
    }

    /**
     * @notice Handle the receipt of an NFT
     * @param from The address which previously owned the token
     * @param tokenId The NFT identifier which is being transferred
     * @return bytes4 `bytes4(keccak256("onERC721Received(address,uint256,bytes)"))`
     */
    function onERC721Received(address from, uint256 tokenId, bytes memory /* data */)
    public returns (bytes4) {
        _handleOnERC721Received(msg.sender, from, tokenId);

        return ERC721_RECEIVED_OLD;
    }

    /**
     * @notice get Deposit info by deposit ID
     * @param depositId The ID of deposit
     * @return DepositStatus The status of deposit
     * @return TokenType The type of deposited token
     * @return address The address of sender
     * @return address The address of deposited token
     * @return uint The value of deposited token.
     */
    function getDeposit(uint depositId) public view returns (DepositStatus, TokenType, address, address, uint) {
        Deposit storage deposit = deposits[depositId];

        return (
            deposit.status,
            deposit.tokenType,
            deposit.owner,
            deposit.token,
            deposit.value
        );
    }

    /**
     * @notice handle onERC721Received
     * @param tokenAddress The address of ERC721 token contract
     * @param from The address of token holder
     * @param tokenId The ID of token to be deposited
     */
    function _handleOnERC721Received(address tokenAddress, address from, uint tokenId) private {
        uint depositId = deposits.length;
        deposits.length += 1;
        _recordDeposit(depositId, DepositStatus.deposited, TokenType.erc721, from, tokenAddress, tokenId);

        emit ERC721Deposited(depositId, from, tokenAddress, tokenId);
    }

    /**
     * @notice deposit ERC721 token
     * @param tokenAddress The address of ERC721 token contract
     * @param from The address of token holder
     * @param tokenId The ID of token to be deposited
     */
    function _depositERC721(address tokenAddress, address from, uint tokenId) internal {
        require(IERC721(tokenAddress).ownerOf(tokenId) == from, "not token owner");
        require(address(this) == IERC721(tokenAddress).getApproved(tokenId), "not allowed token");

        IERC721(tokenAddress).transferFrom(from, address(this), tokenId);

        require(IERC721(tokenAddress).ownerOf(tokenId) == address(this));

        uint depositId = deposits.length;
        deposits.length += 1;
        _recordDeposit(depositId, DepositStatus.deposited, TokenType.erc721, from, tokenAddress, tokenId);

        emit ERC721Deposited(depositId, from, tokenAddress, tokenId);
    }

    /**
     * @notice record deposit to `deposits` list
     * @param depositId The ID of deposit
     * @param depositStatus The status of deposit
     * @param tokenType The type of deposited token
     * @param from The address of sender
     * @param tokenAddress The address of deposited token
     * @param value The vlaue of token. It is Amount when ETH or ERC20, tokenID when ERC721.
     */
    function _recordDeposit(
        uint depositId,
        DepositStatus depositStatus,
        TokenType tokenType,
        address from,
        address tokenAddress,
        uint value
    ) internal {
        deposits[depositId].status = depositStatus;
        deposits[depositId].tokenType = tokenType;
        deposits[depositId].owner = from;
        deposits[depositId].token = tokenAddress;
        deposits[depositId].value = value;
    }

    // Reserved storage space to allow for layout changes in the future.
    uint256[50] private ______gap;
}
