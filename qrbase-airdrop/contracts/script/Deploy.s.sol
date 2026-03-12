// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {QRbaseAirdrop} from "../src/QRbaseAirdrop.sol";

contract DeployScript is Script {
    // Base Mainnet USDC
    address constant USDC_BASE = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    // Base Sepolia testnet USDC
    address constant USDC_BASE_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address signerAddress = vm.envAddress("SIGNER_ADDRESS");

        // Determine which USDC to use based on chain ID
        address usdc;
        if (block.chainid == 8453) {
            usdc = USDC_BASE;
            console2.log("Deploying to Base Mainnet");
        } else if (block.chainid == 84532) {
            usdc = USDC_BASE_SEPOLIA;
            console2.log("Deploying to Base Sepolia");
        } else {
            revert("Unsupported chain");
        }

        vm.startBroadcast(deployerPrivateKey);

        QRbaseAirdrop airdrop = new QRbaseAirdrop(usdc, signerAddress);

        console2.log("QRbaseAirdrop deployed at:", address(airdrop));
        console2.log("USDC address:", usdc);
        console2.log("Signer address:", signerAddress);

        vm.stopBroadcast();
    }
}
