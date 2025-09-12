/*const hre = require("hardhat");

async function main() {
  // Deploy the contract
  const C = await hre.ethers.deployContract("EmergencyWallet");

  // Wait for deployment to be mined
  await C.deployed();

  console.log("EmergencyWallet deployed to:", C.target); // or C.address in some versions
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});*/
const hre = require("hardhat");

async function main() {
  console.log("Starting deployment...");

  // Get the contract factory
  const EmergencyWallet = await hre.ethers.getContractFactory("EmergencyWallet");

  // Deploy the contract
  const wallet = await EmergencyWallet.deploy();

  // Wait for deployment to be mined
  await wallet.deployed();

  // Log the deployed contract address
  console.log("EmergencyWallet deployed to:", wallet.address);

  // Optional: log deployment transaction hash
  console.log("Deployment transaction hash:", wallet.deployTransaction.hash);
}

// Run the deployment script
main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exit(1);
});
