import { ethers } from "hardhat";

async function main() {
  const LearningLedger = await ethers.getContractFactory("LearningLedger");
  const ledger = await LearningLedger.deploy();
  await ledger.waitForDeployment();

  const address = await ledger.getAddress();
  console.log(`LearningLedger deployed to: ${address}`);
  console.log(
    `Verify on KiteScan: https://testnet.kitescan.ai/address/${address}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
