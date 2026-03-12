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

    function setUp() public {
        signerAddr = vm.addr(signerPrivateKey);
        usdc = new MockUSDC();
        airdrop = new QRbaseAirdrop(address(usdc), signerAddr);

        // Fund creator
        usdc.mint(creator, 10000 * 1e6);

        // Creator approves contract
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

    function test_CreateCampaignEqual() public {
        vm.prank(creator);
        uint256 campaignId = airdrop.createCampaign(100 * 1e6, 10, QRbaseAirdrop.SplitType.EQUAL);

        assertEq(campaignId, 0);
        assertEq(airdrop.campaignCount(), 1);

        QRbaseAirdrop.Campaign memory c = airdrop.getCampaign(0);
        assertEq(c.creator, creator);
        assertEq(c.totalAmount, 100 * 1e6);
        assertEq(c.remainingAmount, 100 * 1e6);
        assertEq(c.maxRecipients, 10);
        assertEq(c.claimedCount, 0);
        assertEq(c.equalShare, 10 * 1e6);
        assertTrue(c.isActive);
        assertEq(c.closedAt, 0);
    }

    function test_CreateCampaignRandom() public {
        vm.prank(creator);
        uint256 campaignId = airdrop.createCampaign(500 * 1e6, 50, QRbaseAirdrop.SplitType.RANDOM);

        QRbaseAirdrop.Campaign memory c = airdrop.getCampaign(campaignId);
        assertEq(c.equalShare, 0);
        assertEq(uint8(c.splitType), uint8(QRbaseAirdrop.SplitType.RANDOM));
    }

    function test_ClaimRewardEqual() public {
        vm.prank(creator);
        airdrop.createCampaign(100 * 1e6, 10, QRbaseAirdrop.SplitType.EQUAL);

        uint256 claimAmount = 10 * 1e6; // equal share
        bytes memory sig = _signClaim(0, claimer1, "twitter123", claimAmount);

        airdrop.claimReward(0, claimer1, "twitter123", claimAmount, sig);

        assertEq(usdc.balanceOf(claimer1), 10 * 1e6);
        assertTrue(airdrop.getClaimStatus(0, claimer1));

        QRbaseAirdrop.Campaign memory c = airdrop.getCampaign(0);
        assertEq(c.claimedCount, 1);
        assertEq(c.remainingAmount, 90 * 1e6);
    }

    function test_ClaimRewardEqualZeroAmount() public {
        vm.prank(creator);
        airdrop.createCampaign(100 * 1e6, 10, QRbaseAirdrop.SplitType.EQUAL);

        // Pass amount=0, contract should use equalShare
        bytes memory sig = _signClaim(0, claimer1, "twitter123", 0);
        airdrop.claimReward(0, claimer1, "twitter123", 0, sig);

        assertEq(usdc.balanceOf(claimer1), 10 * 1e6);
    }

    function test_RevertDoubleClaim() public {
        vm.prank(creator);
        airdrop.createCampaign(100 * 1e6, 10, QRbaseAirdrop.SplitType.EQUAL);

        uint256 amount = 10 * 1e6;
        bytes memory sig = _signClaim(0, claimer1, "twitter123", amount);
        airdrop.claimReward(0, claimer1, "twitter123", amount, sig);

        // Try claiming again with same wallet
        bytes memory sig2 = _signClaim(0, claimer1, "twitter456", amount);
        vm.expectRevert("Already claimed");
        airdrop.claimReward(0, claimer1, "twitter456", amount, sig2);
    }

    function test_RevertDoubleTwitterClaim() public {
        vm.prank(creator);
        airdrop.createCampaign(100 * 1e6, 10, QRbaseAirdrop.SplitType.EQUAL);

        uint256 amount = 10 * 1e6;
        bytes memory sig1 = _signClaim(0, claimer1, "twitter123", amount);
        airdrop.claimReward(0, claimer1, "twitter123", amount, sig1);

        // Try claiming with different wallet but same twitter
        bytes memory sig2 = _signClaim(0, claimer2, "twitter123", amount);
        vm.expectRevert("Twitter already claimed");
        airdrop.claimReward(0, claimer2, "twitter123", amount, sig2);
    }

    function test_RevertInvalidSignature() public {
        vm.prank(creator);
        airdrop.createCampaign(100 * 1e6, 10, QRbaseAirdrop.SplitType.EQUAL);

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

        vm.expectRevert("Invalid signature");
        airdrop.claimReward(0, claimer1, "twitter123", 10 * 1e6, badSig);
    }

    function test_CloseCampaign() public {
        vm.prank(creator);
        airdrop.createCampaign(100 * 1e6, 10, QRbaseAirdrop.SplitType.EQUAL);

        uint256 creatorBalanceBefore = usdc.balanceOf(creator);

        vm.prank(creator);
        airdrop.closeCampaign(0);

        QRbaseAirdrop.Campaign memory c = airdrop.getCampaign(0);
        assertFalse(c.isActive);
        assertTrue(c.closedAt > 0);
        assertEq(c.remainingAmount, 0);
        assertEq(usdc.balanceOf(creator), creatorBalanceBefore + 100 * 1e6);
    }

    function test_RevertCloseNotCreator() public {
        vm.prank(creator);
        airdrop.createCampaign(100 * 1e6, 10, QRbaseAirdrop.SplitType.EQUAL);

        vm.prank(claimer1);
        vm.expectRevert("Only creator can close");
        airdrop.closeCampaign(0);
    }

    function test_RevertClaimAfterClose() public {
        vm.prank(creator);
        airdrop.createCampaign(100 * 1e6, 10, QRbaseAirdrop.SplitType.EQUAL);

        vm.prank(creator);
        airdrop.closeCampaign(0);

        bytes memory sig = _signClaim(0, claimer1, "twitter123", 10 * 1e6);
        vm.expectRevert("Campaign is not active");
        airdrop.claimReward(0, claimer1, "twitter123", 10 * 1e6, sig);
    }

    function test_RevertExceedMaxAmount() public {
        usdc.mint(creator, 3000 * 1e6);

        vm.prank(creator);
        vm.expectRevert("Amount exceeds maximum");
        airdrop.createCampaign(2001 * 1e6, 10, QRbaseAirdrop.SplitType.EQUAL);
    }

    function test_RevertExceedMaxRecipients() public {
        vm.prank(creator);
        vm.expectRevert("Exceeds max recipients");
        airdrop.createCampaign(100 * 1e6, 501, QRbaseAirdrop.SplitType.EQUAL);
    }

    function test_SetSigner() public {
        address newSigner = address(0x999);
        airdrop.setSigner(newSigner);
        // Verify by attempting a claim - old signer should fail
    }

    function test_RevertSetSignerNotOwner() public {
        vm.prank(claimer1);
        vm.expectRevert();
        airdrop.setSigner(address(0x999));
    }

    function test_MultipleClaims() public {
        vm.prank(creator);
        airdrop.createCampaign(100 * 1e6, 10, QRbaseAirdrop.SplitType.EQUAL);

        uint256 amount = 10 * 1e6;

        // Claimer 1
        bytes memory sig1 = _signClaim(0, claimer1, "twitter_a", amount);
        airdrop.claimReward(0, claimer1, "twitter_a", amount, sig1);

        // Claimer 2
        bytes memory sig2 = _signClaim(0, claimer2, "twitter_b", amount);
        airdrop.claimReward(0, claimer2, "twitter_b", amount, sig2);

        QRbaseAirdrop.Campaign memory c = airdrop.getCampaign(0);
        assertEq(c.claimedCount, 2);
        assertEq(c.remainingAmount, 80 * 1e6);
    }

    function test_CloseAfterPartialClaims() public {
        vm.prank(creator);
        airdrop.createCampaign(100 * 1e6, 10, QRbaseAirdrop.SplitType.EQUAL);

        // Claim once
        bytes memory sig = _signClaim(0, claimer1, "twitter_a", 10 * 1e6);
        airdrop.claimReward(0, claimer1, "twitter_a", 10 * 1e6, sig);

        uint256 creatorBalanceBefore = usdc.balanceOf(creator);

        // Close — should return 90 USDC
        vm.prank(creator);
        airdrop.closeCampaign(0);

        assertEq(usdc.balanceOf(creator), creatorBalanceBefore + 90 * 1e6);
    }
}
