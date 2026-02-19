import { expect } from "chai";
import { ethers } from "hardhat";
import { LearningLedger } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("LearningLedger", function () {
  let ledger: LearningLedger;
  let owner: HardhatEthersSigner;
  let agent: HardhatEthersSigner;
  let otherAgent: HardhatEthersSigner;
  const paperId = "bitdance-2602";
  const enrollPayment = ethers.parseEther("0.001");
  const stagePayment = ethers.parseEther("0.001");

  beforeEach(async function () {
    [owner, agent, otherAgent] = await ethers.getSigners();
    const LearningLedgerFactory =
      await ethers.getContractFactory("LearningLedger");
    ledger = await LearningLedgerFactory.deploy();
    await ledger.waitForDeployment();
  });

  describe("enrollCourse", function () {
    it("should enroll with payment successfully", async function () {
      const tx = await ledger
        .connect(agent)
        .enrollCourse(paperId, { value: enrollPayment });
      const receipt = await tx.wait();

      const [isEnrolled, currentStage, totalPaid, enrolledAt] =
        await ledger.getProgress(agent.address, paperId);

      expect(isEnrolled).to.be.true;
      expect(currentStage).to.equal(0);
      expect(totalPaid).to.equal(enrollPayment);
      expect(enrolledAt).to.be.greaterThan(0);

      // Check events
      await expect(tx)
        .to.emit(ledger, "CourseEnrolled")
        .withArgs(agent.address, paperId, enrolledAt);
      await expect(tx)
        .to.emit(ledger, "PaymentReceived")
        .withArgs(agent.address, paperId, enrollPayment);
    });

    it("should revert on duplicate enrollment", async function () {
      await ledger
        .connect(agent)
        .enrollCourse(paperId, { value: enrollPayment });

      await expect(
        ledger.connect(agent).enrollCourse(paperId, { value: enrollPayment })
      ).to.be.revertedWith("Already enrolled");
    });

    it("should revert on zero payment", async function () {
      await expect(
        ledger.connect(agent).enrollCourse(paperId, { value: 0 })
      ).to.be.revertedWith("Payment required");
    });
  });

  describe("completeStage", function () {
    beforeEach(async function () {
      await ledger
        .connect(agent)
        .enrollCourse(paperId, { value: enrollPayment });
    });

    it("should complete stage for enrolled agent", async function () {
      const stageNum = 1;
      const score = 85;

      const tx = await ledger
        .connect(agent)
        .completeStage(paperId, stageNum, score, { value: stagePayment });

      const [completedAt, returnedScore, attestationHash] =
        await ledger.getStageCompletion(agent.address, paperId, stageNum);

      expect(completedAt).to.be.greaterThan(0);
      expect(returnedScore).to.equal(score);
      expect(attestationHash).to.not.equal(ethers.ZeroHash);

      // Check enrollment updated
      const [isEnrolled, currentStage, totalPaid] = await ledger.getProgress(
        agent.address,
        paperId
      );
      expect(currentStage).to.equal(stageNum);
      expect(totalPaid).to.equal(enrollPayment + stagePayment);

      // Check events
      await expect(tx)
        .to.emit(ledger, "StageCompleted")
        .withArgs(agent.address, paperId, stageNum, score);
      await expect(tx)
        .to.emit(ledger, "PaymentReceived")
        .withArgs(agent.address, paperId, stagePayment);
    });

    it("should revert for non-enrolled agent", async function () {
      await expect(
        ledger
          .connect(otherAgent)
          .completeStage(paperId, 1, 85, { value: stagePayment })
      ).to.be.revertedWith("Not enrolled");
    });

    it("should revert on duplicate stage completion", async function () {
      await ledger
        .connect(agent)
        .completeStage(paperId, 1, 85, { value: stagePayment });

      await expect(
        ledger
          .connect(agent)
          .completeStage(paperId, 1, 90, { value: stagePayment })
      ).to.be.revertedWith("Stage already completed");
    });

    it("should revert on score > 100", async function () {
      await expect(
        ledger
          .connect(agent)
          .completeStage(paperId, 1, 101, { value: stagePayment })
      ).to.be.revertedWith("Invalid score");
    });

    it("should allow stage completion without payment", async function () {
      const tx = await ledger
        .connect(agent)
        .completeStage(paperId, 1, 75, { value: 0 });

      const [completedAt, score] = await ledger.getStageCompletion(
        agent.address,
        paperId,
        1
      );

      expect(completedAt).to.be.greaterThan(0);
      expect(score).to.equal(75);

      // PaymentReceived should NOT be emitted when value is 0
      await expect(tx).to.not.emit(ledger, "PaymentReceived");
    });
  });

  describe("getProgress", function () {
    it("should return correct values for enrolled agent", async function () {
      await ledger
        .connect(agent)
        .enrollCourse(paperId, { value: enrollPayment });
      await ledger
        .connect(agent)
        .completeStage(paperId, 1, 90, { value: stagePayment });
      await ledger
        .connect(agent)
        .completeStage(paperId, 2, 75, { value: stagePayment });

      const [isEnrolled, currentStage, totalPaid, enrolledAt] =
        await ledger.getProgress(agent.address, paperId);

      expect(isEnrolled).to.be.true;
      expect(currentStage).to.equal(2);
      expect(totalPaid).to.equal(enrollPayment + stagePayment * 2n);
      expect(enrolledAt).to.be.greaterThan(0);
    });

    it("should return default values for non-enrolled agent", async function () {
      const [isEnrolled, currentStage, totalPaid, enrolledAt] =
        await ledger.getProgress(agent.address, paperId);

      expect(isEnrolled).to.be.false;
      expect(currentStage).to.equal(0);
      expect(totalPaid).to.equal(0);
      expect(enrolledAt).to.equal(0);
    });
  });

  describe("getStageCompletion", function () {
    it("should verify attestationHash", async function () {
      await ledger
        .connect(agent)
        .enrollCourse(paperId, { value: enrollPayment });

      const stageNum = 1;
      const score = 95;

      const tx = await ledger
        .connect(agent)
        .completeStage(paperId, stageNum, score, { value: stagePayment });
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);

      const [completedAt, returnedScore, attestationHash] =
        await ledger.getStageCompletion(agent.address, paperId, stageNum);

      // Reconstruct the expected attestation hash
      const expectedHash = ethers.solidityPackedKeccak256(
        ["address", "string", "uint256", "uint256", "uint256"],
        [agent.address, paperId, stageNum, score, block!.timestamp]
      );

      expect(attestationHash).to.equal(expectedHash);
      expect(returnedScore).to.equal(score);
      expect(completedAt).to.equal(block!.timestamp);
    });

    it("should return zero values for incomplete stage", async function () {
      const [completedAt, score, attestationHash] =
        await ledger.getStageCompletion(agent.address, paperId, 1);

      expect(completedAt).to.equal(0);
      expect(score).to.equal(0);
      expect(attestationHash).to.equal(ethers.ZeroHash);
    });
  });
});
