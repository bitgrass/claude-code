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

    struct RewardTier {
        uint256 amount; // USDC amount for this position (6 decimals)
    }

    struct Campaign {
        address creator;
        uint256 totalDeposited;
        uint256 remainingAmount;
        uint256 maxRecipients;
        uint256 claimedCount;
        bool isActive;
        uint256 createdAt;
    }

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => RewardTier[]) public campaignTiers;
    mapping(uint256 => mapping(address => bool)) public hasClaimed;
    mapping(uint256 => mapping(string => bool)) public twitterClaimed;

    uint256 public campaignCount;
    address public immutable USDC;
    uint256 public constant MAX_RECIPIENTS = 500;
    address public signer;

    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed creator,
        uint256 totalAmount,
        uint256 maxRecipients
    );

    event RewardClaimed(
        uint256 indexed campaignId,
        address indexed recipient,
        string twitterId,
        uint256 amount,
        uint256 slotNumber
    );

    event CampaignClosed(
        uint256 indexed campaignId,
        uint256 remainingAmount
    );

    event SignerUpdated(address oldSigner, address newSigner);

    constructor(address _usdc, address _signer) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_signer != address(0), "Invalid signer address");
        USDC = _usdc;
        signer = _signer;
    }

    function createCampaign(
        uint256 totalAmount,
        uint256 maxRecipients,
        uint256[] calldata tierAmounts
    ) external returns (uint256) {
        require(totalAmount > 0, "Amount must be greater than 0");
        require(maxRecipients > 0, "Must have at least 1 recipient");
        require(maxRecipients <= MAX_RECIPIENTS, "Exceeds max recipients");

        // Validate tiers
        if (tierAmounts.length == 1) {
            // Equal split: single tier amount applied to all slots
            require(tierAmounts[0] * maxRecipients <= totalAmount, "Tier amounts exceed total");
        } else {
            require(tierAmounts.length == maxRecipients, "Tier count must match recipients");
            uint256 tierSum = 0;
            for (uint256 i = 0; i < tierAmounts.length; i++) {
                require(tierAmounts[i] > 0, "Tier amount must be > 0");
                tierSum += tierAmounts[i];
            }
            require(tierSum <= totalAmount, "Tier amounts exceed total");
        }

        IERC20(USDC).safeTransferFrom(msg.sender, address(this), totalAmount);

        uint256 campaignId = campaignCount;
        campaignCount++;

        campaigns[campaignId] = Campaign({
            creator: msg.sender,
            totalDeposited: totalAmount,
            remainingAmount: totalAmount,
            maxRecipients: maxRecipients,
            claimedCount: 0,
            isActive: true,
            createdAt: block.timestamp
        });

        // Store tiers
        for (uint256 i = 0; i < tierAmounts.length; i++) {
            campaignTiers[campaignId].push(RewardTier({amount: tierAmounts[i]}));
        }

        emit CampaignCreated(campaignId, msg.sender, totalAmount, maxRecipients);

        return campaignId;
    }

    function claimReward(
        uint256 campaignId,
        string calldata twitterId,
        bytes calldata signature
    ) external nonReentrant {
        Campaign storage campaign = campaigns[campaignId];

        require(campaign.isActive, "Campaign is not active");
        require(!hasClaimed[campaignId][msg.sender], "Already claimed (wallet)");
        require(!twitterClaimed[campaignId][twitterId], "Already claimed (twitter)");
        require(campaign.claimedCount < campaign.maxRecipients, "All rewards claimed");

        // Determine reward amount based on current slot
        uint256 slotNumber = campaign.claimedCount; // 0-indexed
        uint256 claimAmount = getRewardForSlot(campaignId, slotNumber);

        // Verify backend signature: (campaignId, recipient, twitterId, amount)
        bytes32 messageHash = keccak256(
            abi.encodePacked(campaignId, msg.sender, twitterId, claimAmount)
        );
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedHash.recover(signature);
        require(recoveredSigner == signer, "Invalid signature");

        require(claimAmount <= campaign.remainingAmount, "Insufficient remaining");

        hasClaimed[campaignId][msg.sender] = true;
        twitterClaimed[campaignId][twitterId] = true;
        campaign.claimedCount++;
        campaign.remainingAmount -= claimAmount;

        IERC20(USDC).safeTransfer(msg.sender, claimAmount);

        emit RewardClaimed(campaignId, msg.sender, twitterId, claimAmount, slotNumber + 1);

        // Auto-close when all slots filled
        if (campaign.claimedCount == campaign.maxRecipients) {
            campaign.isActive = false;
        }
    }

    function distributeReward(
        uint256 campaignId,
        address recipient,
        string calldata userId,
        bytes calldata signature
    ) external nonReentrant {
        Campaign storage campaign = campaigns[campaignId];

        require(campaign.isActive, "Campaign is not active");
        require(!hasClaimed[campaignId][recipient], "Already claimed (wallet)");
        require(!twitterClaimed[campaignId][userId], "Already claimed (userId)");
        require(campaign.claimedCount < campaign.maxRecipients, "All rewards claimed");

        uint256 slotNumber = campaign.claimedCount;
        uint256 claimAmount = getRewardForSlot(campaignId, slotNumber);

        // Verify signature: (campaignId, recipient, userId, amount) — same format as claimReward
        bytes32 messageHash = keccak256(
            abi.encodePacked(campaignId, recipient, userId, claimAmount)
        );
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedHash.recover(signature);
        require(recoveredSigner == signer, "Invalid signature");

        require(claimAmount <= campaign.remainingAmount, "Insufficient remaining");

        hasClaimed[campaignId][recipient] = true;
        twitterClaimed[campaignId][userId] = true;
        campaign.claimedCount++;
        campaign.remainingAmount -= claimAmount;

        IERC20(USDC).safeTransfer(recipient, claimAmount);

        emit RewardClaimed(campaignId, recipient, userId, claimAmount, slotNumber + 1);

        if (campaign.claimedCount == campaign.maxRecipients) {
            campaign.isActive = false;
        }
    }

    function closeCampaign(uint256 campaignId) external nonReentrant {
        Campaign storage campaign = campaigns[campaignId];

        require(campaign.creator == msg.sender, "Only creator can close");
        require(campaign.isActive, "Campaign already closed");

        campaign.isActive = false;

        uint256 remaining = campaign.remainingAmount;
        campaign.remainingAmount = 0;

        if (remaining > 0) {
            IERC20(USDC).safeTransfer(campaign.creator, remaining);
        }

        emit CampaignClosed(campaignId, remaining);
    }

    function getRewardForSlot(uint256 campaignId, uint256 slotIndex) public view returns (uint256) {
        RewardTier[] storage tiers = campaignTiers[campaignId];
        if (tiers.length == 1) {
            // Equal split
            return tiers[0].amount;
        }
        require(slotIndex < tiers.length, "Invalid slot index");
        return tiers[slotIndex].amount;
    }

    function getCampaignStatus(uint256 campaignId) external view returns (
        uint256 slotsRemaining,
        uint256 nextRewardAmount,
        bool isActive
    ) {
        Campaign storage campaign = campaigns[campaignId];
        slotsRemaining = campaign.maxRecipients - campaign.claimedCount;
        isActive = campaign.isActive;
        if (isActive && slotsRemaining > 0) {
            nextRewardAmount = getRewardForSlot(campaignId, campaign.claimedCount);
        }
    }

    function getCampaign(uint256 campaignId) external view returns (Campaign memory) {
        return campaigns[campaignId];
    }

    function getTierCount(uint256 campaignId) external view returns (uint256) {
        return campaignTiers[campaignId].length;
    }

    function getClaimStatus(uint256 campaignId, address wallet) external view returns (bool) {
        return hasClaimed[campaignId][wallet];
    }

    function setSigner(address _signer) external onlyOwner {
        require(_signer != address(0), "Invalid signer address");
        emit SignerUpdated(signer, _signer);
        signer = _signer;
    }
}
