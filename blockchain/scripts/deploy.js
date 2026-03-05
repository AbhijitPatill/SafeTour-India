const hre = require("hardhat");

async function main() {
  console.log("Deploying TouristID contract...");

  const TouristID = await hre.ethers.getContractFactory("TouristID");
  const touristID = await TouristID.deploy();

  await touristID.waitForDeployment();

  const address = await touristID.getAddress();
  console.log("✅ TouristID deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});