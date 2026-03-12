// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract QRbaseAirdrop is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    enum SplitType {
        EQUAL,
        RANDOM
    }

    struct Campaign {
        address creator;
        uint256 totalAmount;
        uint256 remainingAmount;
        uint256 maxRecipients;
        uint256 claimedCount;
        SplitType splitType;
        uint256 equalShare;
        bool isActive;
        uint256 createdAt;
        uint256 closedAt;
    }

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => bool)) public hasClaimed;
    mapping(uint256 => mapping(string => bool)) public twitterClaimed;

    uint256 public campaignCount;
    address public immutable USDC;
    uint256 public constant MAX_RECIPIENTS = 500;
    uint256 public constant MAX_AMOUNT = 2000 * 1e6;
    address public signer;

    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed creator,
        uint256 totalAmount,
        uint256 maxRecipients,
        SplitType splitType
    );

    event RewardClaimed(
        uint256 indexed campaignId,
        address indexed recipient,
        string twitterId,
        uint256 amount
    );

    event CampaignClosed(
        uint256 indexed campaignId,
        uint256 remainingAmount
    );

    constructor(address _usdc, address _signer) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_signer != address(0), "Invalid signer address");
        USDC = _usdc;
        signer = _signer;
    }

    function createCampaign(
        uint256 amount,
        uint256 maxRecipients,
        SplitType splitType
    ) external returns (uint256) {
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= MAX_AMOUNT, "Amount exceeds maximum");
        require(maxRecipients > 0, "Must have at least 1 recipient");
        require(maxRecipients <= MAX_RECIPIENTS, "Exceeds max recipients");

        uint256 equalShare = 0;
        if (splitType == SplitType.EQUAL) {
            equalShare = amount / maxRecipients;
            require(equalShare > 0, "Share too small");
        }

        IERC20(USDC).safeTransferFrom(msg.sender, address(this), amount);

        uint256 campaignId = campaignCount;
        campaignCount++;

        campaigns[campaignId] = Campaign({
            creator: msg.sender,
            totalAmount: amount,
            remainingAmount: amount,
            maxRecipients: maxRecipients,
            claimedCount: 0,
            splitType: splitType,
            equalShare: equalShare,
            isActive: true,
            createdAt: block.timestamp,
            closedAt: 0
        });

        emit CampaignCreated(campaignId, msg.sender, amount, maxRecipients, splitType);

        return campaignId;
    }

    function claimReward(
        uint256 campaignId,
        address recipient,
        string calldata twitterId,
        uint256 amount,
        bytes calldata signature
    ) external nonReentrant {
        Campaign storage campaign = campaigns[campaignId];

        require(campaign.isActive, "Campaign is not active");
        require(!hasClaimed[campaignId][recipient], "Already claimed");
        require(!twitterClaimed[campaignId][twitterId], "Twitter already claimed");
        require(campaign.claimedCount < campaign.maxRecipients, "All rewards claimed");

        bytes32 messageHash = keccak256(
            abi.encodePacked(campaignId, recipient, twitterId, amount)
        );
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedHash.recover(signature);
        require(recoveredSigner == signer, "Invalid signature");

        uint256 claimAmount;
        if (campaign.splitType == SplitType.EQUAL) {
            claimAmount = amount == 0 ? campaign.equalShare : amount;
        } else {
            claimAmount = amount;
        }

        require(claimAmount > 0, "Claim amount must be greater than 0");
        require(claimAmount <= campaign.remainingAmount, "Insufficient remaining amount");

        hasClaimed[campaignId][recipient] = true;
        twitterClaimed[campaignId][twitterId] = true;
        campaign.claimedCount++;
        campaign.remainingAmount -= claimAmount;

        IERC20(USDC).safeTransfer(recipient, claimAmount);

        emit RewardClaimed(campaignId, recipient, twitterId, claimAmount);
    }

    function closeCampaign(uint256 campaignId) external nonReentrant {
        Campaign storage campaign = campaigns[campaignId];

        require(campaign.creator == msg.sender, "Only creator can close");
        require(campaign.isActive, "Campaign already closed");

        campaign.isActive = false;
        campaign.closedAt = block.timestamp;

        uint256 remaining = campaign.remainingAmount;
        campaign.remainingAmount = 0;

        if (remaining > 0) {
            IERC20(USDC).safeTransfer(campaign.creator, remaining);
        }

        emit CampaignClosed(campaignId, remaining);
    }

    function getCampaign(uint256 campaignId) external view returns (Campaign memory) {
        return campaigns[campaignId];
    }

    function getClaimStatus(uint256 campaignId, address wallet) external view returns (bool) {
        return hasClaimed[campaignId][wallet];
    }

    function setSigner(address _signer) external onlyOwner {
        require(_signer != address(0), "Invalid signer address");
        signer = _signer;
    }
}
