// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {QRbaseAirdrop} from "../src/QRbaseAirdrop.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract QRbaseAirdropTest is Test {
    QRbaseAirdrop public airdrop;
    MockUSDC public usdc;

    address public owner = address(this);
    uint256 public signerPrivateKey = 0xA11CE;
    address public signerAddr;
    address public creator = address(0x1);
    address public claimer1 = address(0x2);
    address public claimer2 = address(0x3);
    address public claimer3 = address(0x4);

    function setUp() public {
        signerAddr = vm.addr(signerPrivateKey);
        usdc = new MockUSDC();
        airdrop = new QRbaseAirdrop(address(usdc), signerAddr);

        usdc.mint(creator, 10000 * 1e6);

        vm.prank(creator);
        usdc.approve(address(airdrop), type(uint256).max);
    }

    function _signClaim(
        uint256 campaignId,
        address recipient,
        string memory twitterId,
        uint256 amount
    ) internal view returns (bytes memory) {
        bytes32 messageHash = keccak256(
            abi.encodePacked(campaignId, recipient, twitterId, amount)
        );
        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, ethSignedHash);
        return abi.encodePacked(r, s, v);
    }

    // === Campaign Creation ===

    function test_CreateCampaignEqualSplit() public {
        uint256[] memory tierAmounts = new uint256[](1);
        tierAmounts[0] = 10 * 1e6; // $10 per slot

        vm.prank(creator);
        uint256 campaignId = airdrop.createCampaign(100 * 1e6, 10, tierAmounts);

        assertEq(campaignId, 0);
        assertEq(airdrop.campaignCount(), 1);

        QRbaseAirdrop.Campaign memory c = airdrop.getCampaign(0);
        assertEq(c.creator, creator);
        assertEq(c.totalDeposited, 100 * 1e6);
        assertEq(c.remainingAmount, 100 * 1e6);
        assertEq(c.maxRecipients, 10);
        assertEq(c.claimedCount, 0);
        assertTrue(c.isActive);

        assertEq(airdrop.getRewardForSlot(0, 0), 10 * 1e6);
        assertEq(airdrop.getRewardForSlot(0, 5), 10 * 1e6);
        assertEq(airdrop.getTierCount(0), 1);
    }

    function test_CreateCampaignTiered() public {
        uint256[] memory tierAmounts = new uint256[](3);
        tierAmounts[0] = 500 * 1e6; // $500 for 1st
        tierAmounts[1] = 300 * 1e6; // $300 for 2nd
        tierAmounts[2] = 200 * 1e6; // $200 for 3rd

        vm.prank(creator);
        uint256 campaignId = airdrop.createCampaign(1000 * 1e6, 3, tierAmounts);

        assertEq(airdrop.getRewardForSlot(campaignId, 0), 500 * 1e6);
        assertEq(airdrop.getRewardForSlot(campaignId, 1), 300 * 1e6);
        assertEq(airdrop.getRewardForSlot(campaignId, 2), 200 * 1e6);
        assertEq(airdrop.getTierCount(campaignId), 3);
    }

    function test_RevertTierCountMismatch() public {
        uint256[] memory tierAmounts = new uint256[](2);
        tierAmounts[0] = 500 * 1e6;
        tierAmounts[1] = 300 * 1e6;

        vm.prank(creator);
        vm.expectRevert("Tier count must match recipients");
        airdrop.createCampaign(1000 * 1e6, 3, tierAmounts);
    }

    function test_RevertTierAmountsExceedTotal() public {
        uint256[] memory tierAmounts = new uint256[](2);
        tierAmounts[0] = 600 * 1e6;
        tierAmounts[1] = 500 * 1e6;

        vm.prank(creator);
        vm.expectRevert("Tier amounts exceed total");
        airdrop.createCampaign(1000 * 1e6, 2, tierAmounts);
    }

    function test_RevertExceedMaxRecipients() public {
        uint256[] memory tierAmounts = new uint256[](1);
        tierAmounts[0] = 1 * 1e6;

        vm.prank(creator);
        vm.expectRevert("Exceeds max recipients");
        airdrop.createCampaign(501 * 1e6, 501, tierAmounts);
    }

    // === Claiming ===

    function test_ClaimEqualSplit() public {
        uint256[] memory tierAmounts = new uint256[](1);
        tierAmounts[0] = 10 * 1e6;

        vm.prank(creator);
        airdrop.createCampaign(100 * 1e6, 10, tierAmounts);

        uint256 claimAmount = 10 * 1e6;
        bytes memory sig = _signClaim(0, claimer1, "twitter123", claimAmount);

        vm.prank(claimer1);
        airdrop.claimReward(0, "twitter123", sig);

        assertEq(usdc.balanceOf(claimer1), 10 * 1e6);
        assertTrue(airdrop.getClaimStatus(0, claimer1));

        QRbaseAirdrop.Campaign memory c = airdrop.getCampaign(0);
        assertEq(c.claimedCount, 1);
        assertEq(c.remainingAmount, 90 * 1e6);
    }

    function test_ClaimTieredRewards() public {
        uint256[] memory tierAmounts = new uint256[](3);
        tierAmounts[0] = 500 * 1e6;
        tierAmounts[1] = 300 * 1e6;
        tierAmounts[2] = 200 * 1e6;

        vm.prank(creator);
        airdrop.createCampaign(1000 * 1e6, 3, tierAmounts);

        // 1st claimer gets $500
        bytes memory sig1 = _signClaim(0, claimer1, "twitter_a", 500 * 1e6);
        vm.prank(claimer1);
        airdrop.claimReward(0, "twitter_a", sig1);
        assertEq(usdc.balanceOf(claimer1), 500 * 1e6);

        // 2nd claimer gets $300
        bytes memory sig2 = _signClaim(0, claimer2, "twitter_b", 300 * 1e6);
        vm.prank(claimer2);
        airdrop.claimReward(0, "twitter_b", sig2);
        assertEq(usdc.balanceOf(claimer2), 300 * 1e6);

        // 3rd claimer gets $200
        bytes memory sig3 = _signClaim(0, claimer3, "twitter_c", 200 * 1e6);
        vm.prank(claimer3);
        airdrop.claimReward(0, "twitter_c", sig3);
        assertEq(usdc.balanceOf(claimer3), 200 * 1e6);

        // Campaign should auto-close
        QRbaseAirdrop.Campaign memory c = airdrop.getCampaign(0);
        assertEq(c.claimedCount, 3);
        assertFalse(c.isActive);
        assertEq(c.remainingAmount, 0);
    }

    function test_RevertDoubleClaim() public {
        uint256[] memory tierAmounts = new uint256[](1);
        tierAmounts[0] = 10 * 1e6;

        vm.prank(creator);
        airdrop.createCampaign(100 * 1e6, 10, tierAmounts);

        uint256 amount = 10 * 1e6;
        bytes memory sig = _signClaim(0, claimer1, "twitter123", amount);
        vm.prank(claimer1);
        airdrop.claimReward(0, "twitter123", sig);

        // Same wallet, different twitter
        bytes memory sig2 = _signClaim(0, claimer1, "twitter456", amount);
        vm.prank(claimer1);
        vm.expectRevert("Already claimed (wallet)");
        airdrop.claimReward(0, "twitter456", sig2);
    }

    function test_RevertDoubleTwitterClaim() public {
        uint256[] memory tierAmounts = new uint256[](1);
        tierAmounts[0] = 10 * 1e6;

        vm.prank(creator);
        airdrop.createCampaign(100 * 1e6, 10, tierAmounts);

        uint256 amount = 10 * 1e6;
        bytes memory sig1 = _signClaim(0, claimer1, "twitter123", amount);
        vm.prank(claimer1);
        airdrop.claimReward(0, "twitter123", sig1);

        // Different wallet, same twitter
        bytes memory sig2 = _signClaim(0, claimer2, "twitter123", amount);
        vm.prank(claimer2);
        vm.expectRevert("Already claimed (twitter)");
        airdrop.claimReward(0, "twitter123", sig2);
    }

    function test_RevertInvalidSignature() public {
        uint256[] memory tierAmounts = new uint256[](1);
        tierAmounts[0] = 10 * 1e6;

        vm.prank(creator);
        airdrop.createCampaign(100 * 1e6, 10, tierAmounts);

        // Sign with wrong private key
        uint256 wrongKey = 0xB0B;
        bytes32 messageHash = keccak256(
            abi.encodePacked(uint256(0), claimer1, "twitter123", uint256(10 * 1e6))
        );
        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongKey, ethSignedHash);
        bytes memory badSig = abi.encodePacked(r, s, v);

        vm.prank(claimer1);
        vm.expectRevert("Invalid signature");
        airdrop.claimReward(0, "twitter123", badSig);
    }

    function test_RevertClaimAllSlotsFilled() public {
        uint256[] memory tierAmounts = new uint256[](1);
        tierAmounts[0] = 50 * 1e6;

        vm.prank(creator);
        airdrop.createCampaign(100 * 1e6, 2, tierAmounts);

        // Fill both slots
        bytes memory sig1 = _signClaim(0, claimer1, "tw1", 50 * 1e6);
        vm.prank(claimer1);
        airdrop.claimReward(0, "tw1", sig1);

        bytes memory sig2 = _signClaim(0, claimer2, "tw2", 50 * 1e6);
        vm.prank(claimer2);
        airdrop.claimReward(0, "tw2", sig2);

        // 3rd claimer should fail - campaign auto-closed
        bytes memory sig3 = _signClaim(0, claimer3, "tw3", 50 * 1e6);
        vm.prank(claimer3);
        vm.expectRevert("Campaign is not active");
        airdrop.claimReward(0, "tw3", sig3);
    }

    // === Campaign Status ===

    function test_GetCampaignStatus() public {
        uint256[] memory tierAmounts = new uint256[](3);
        tierAmounts[0] = 500 * 1e6;
        tierAmounts[1] = 300 * 1e6;
        tierAmounts[2] = 200 * 1e6;

        vm.prank(creator);
        airdrop.createCampaign(1000 * 1e6, 3, tierAmounts);

        (uint256 remaining, uint256 nextReward, bool isActive) =
            airdrop.getCampaignStatus(0);

        assertEq(remaining, 3);
        assertEq(nextReward, 500 * 1e6);
        assertTrue(isActive);

        // After first claim
        bytes memory sig = _signClaim(0, claimer1, "tw1", 500 * 1e6);
        vm.prank(claimer1);
        airdrop.claimReward(0, "tw1", sig);

        (remaining, nextReward, isActive) = airdrop.getCampaignStatus(0);
        assertEq(remaining, 2);
        assertEq(nextReward, 300 * 1e6);
        assertTrue(isActive);
    }

    // === Close Campaign ===

    function test_CloseCampaign() public {
        uint256[] memory tierAmounts = new uint256[](1);
        tierAmounts[0] = 10 * 1e6;

        vm.prank(creator);
        airdrop.createCampaign(100 * 1e6, 10, tierAmounts);

        uint256 creatorBalanceBefore = usdc.balanceOf(creator);

        vm.prank(creator);
        airdrop.closeCampaign(0);

        QRbaseAirdrop.Campaign memory c = airdrop.getCampaign(0);
        assertFalse(c.isActive);
        assertEq(c.remainingAmount, 0);
        assertEq(usdc.balanceOf(creator), creatorBalanceBefore + 100 * 1e6);
    }

    function test_RevertCloseNotCreator() public {
        uint256[] memory tierAmounts = new uint256[](1);
        tierAmounts[0] = 10 * 1e6;

        vm.prank(creator);
        airdrop.createCampaign(100 * 1e6, 10, tierAmounts);

        vm.prank(claimer1);
        vm.expectRevert("Only creator can close");
        airdrop.closeCampaign(0);
    }

    function test_RevertClaimAfterClose() public {
        uint256[] memory tierAmounts = new uint256[](1);
        tierAmounts[0] = 10 * 1e6;

        vm.prank(creator);
        airdrop.createCampaign(100 * 1e6, 10, tierAmounts);

        vm.prank(creator);
        airdrop.closeCampaign(0);

        bytes memory sig = _signClaim(0, claimer1, "twitter123", 10 * 1e6);
        vm.prank(claimer1);
        vm.expectRevert("Campaign is not active");
        airdrop.claimReward(0, "twitter123", sig);
    }

    function test_CloseAfterPartialClaims() public {
        uint256[] memory tierAmounts = new uint256[](1);
        tierAmounts[0] = 10 * 1e6;

        vm.prank(creator);
        airdrop.createCampaign(100 * 1e6, 10, tierAmounts);

        bytes memory sig = _signClaim(0, claimer1, "twitter_a", 10 * 1e6);
        vm.prank(claimer1);
        airdrop.claimReward(0, "twitter_a", sig);

        uint256 creatorBalanceBefore = usdc.balanceOf(creator);

        vm.prank(creator);
        airdrop.closeCampaign(0);

        // Should return 90 USDC (100 - 10 claimed)
        assertEq(usdc.balanceOf(creator), creatorBalanceBefore + 90 * 1e6);
    }

    // === Admin ===

    function test_SetSigner() public {
        address newSigner = address(0x999);
        airdrop.setSigner(newSigner);

        // Old signer signature should fail
        uint256[] memory tierAmounts = new uint256[](1);
        tierAmounts[0] = 10 * 1e6;

        vm.prank(creator);
        airdrop.createCampaign(100 * 1e6, 10, tierAmounts);

        bytes memory sig = _signClaim(0, claimer1, "tw1", 10 * 1e6);
        vm.prank(claimer1);
        vm.expectRevert("Invalid signature");
        airdrop.claimReward(0, "tw1", sig);
    }

    function test_RevertSetSignerNotOwner() public {
        vm.prank(claimer1);
        vm.expectRevert();
        airdrop.setSigner(address(0x999));
    }

    function test_AutoCloseOnLastSlot() public {
        uint256[] memory tierAmounts = new uint256[](1);
        tierAmounts[0] = 100 * 1e6;

        vm.prank(creator);
        airdrop.createCampaign(100 * 1e6, 1, tierAmounts);

        bytes memory sig = _signClaim(0, claimer1, "tw1", 100 * 1e6);
        vm.prank(claimer1);
        airdrop.claimReward(0, "tw1", sig);

        QRbaseAirdrop.Campaign memory c = airdrop.getCampaign(0);
        assertFalse(c.isActive);
    }
}
