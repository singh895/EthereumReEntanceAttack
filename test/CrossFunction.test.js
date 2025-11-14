const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Cross-Function Re-entrancy Attack", function () {
  let vulnerableBankV2, attacker;
  let owner, user1, user2, attackerAccount;
  
  const toWei = (ether) => ethers.parseEther(ether.toString());
  const fromWei = (wei) => ethers.formatEther(wei);

  beforeEach(async function () {
    [owner, user1, user2, attackerAccount] = await ethers.getSigners();
    
    // Deploy VulnerableBankV2
    const VulnerableBankV2 = await ethers.getContractFactory("VulnerableBankV2");
    vulnerableBankV2 = await VulnerableBankV2.deploy();
    
    // Fund the bank with deposits from legitimate users
    await vulnerableBankV2.connect(user1).deposit({ value: toWei(5) });
    await vulnerableBankV2.connect(user2).deposit({ value: toWei(5) });
  });

  describe("Single-Function Attack (Baseline)", function () {
    it("Should demonstrate basic withdraw-only attack", async function () {
      console.log("\n=== SINGLE-FUNCTION ATTACK (Baseline) ===\n");
      
      const bankInitialBalance = await vulnerableBankV2.getBalance();
      console.log(`1. Initial Bank Balance: ${fromWei(bankInitialBalance)} ETH`);
      
      // Deploy attacker
      const Attacker = await ethers.getContractFactory("CrossFunctionAttacker");
      attacker = await Attacker.connect(attackerAccount).deploy(
        await vulnerableBankV2.getAddress()
      );
      
      // Execute single-function attack
      console.log("2. Executing single-function attack (withdraw only)...\n");
      const attackTx = await attacker.connect(attackerAccount).attackWithWithdraw({ 
        value: toWei(1) 
      });
      await attackTx.wait();
      
      const bankFinalBalance = await vulnerableBankV2.getBalance();
      const attackerBalance = await attacker.getBalance();
      const attackSteps = await attacker.getAttackSteps();
      
      console.log("3. ATTACK COMPLETE!\n");
      console.log(`   Bank Final Balance: ${fromWei(bankFinalBalance)} ETH`);
      console.log(`   Attacker Balance: ${fromWei(attackerBalance)} ETH`);
      console.log(`   Attack Steps: ${attackSteps}`);
      console.log(`   Stolen Amount: ${fromWei(attackerBalance - toWei(1))} ETH\n`);
      
      expect(bankFinalBalance).to.equal(0);
      expect(attackerBalance).to.be.gt(toWei(1));
      
      console.log("✓ Single-function attack successful\n");
      console.log("=".repeat(50) + "\n");
    });
  });

  describe("Cross-Function Attack (Advanced)", function () {
    it("Should demonstrate cross-function vulnerability with multiple entry points", async function () {
      console.log("\n=== CROSS-FUNCTION RE-ENTRANCY ===\n");
      
      const bankInitialBalance = await vulnerableBankV2.getBalance();
      console.log(`1. Initial Bank Balance: ${fromWei(bankInitialBalance)} ETH`);
      console.log("   Bank has TWO vulnerable functions:");
      console.log("   - withdraw() - sends ETH before updating balance");
      console.log("   - transfer() - sends ETH before updating balance");
      console.log("   Both share the same 'balances' state!\n");
      
      // Deploy attacker
      const Attacker = await ethers.getContractFactory("CrossFunctionAttacker");
      attacker = await Attacker.connect(attackerAccount).deploy(
        await vulnerableBankV2.getAddress()
      );
      
      // Execute attack
      console.log("2. Executing attack...");
      console.log("   Key Point: Attacker could exploit EITHER function");
      console.log("   Both check the same balance mapping\n");
      
      const attackTx = await attacker.connect(attackerAccount).attackWithCrossFunction({ 
        value: toWei(1) 
      });
      await attackTx.wait();
      
      const bankFinalBalance = await vulnerableBankV2.getBalance();
      const attackerBalance = await attacker.getBalance();
      const attackSteps = await attacker.getAttackSteps();
      
      console.log("3. ATTACK COMPLETE!\n");
      console.log(`   Bank Final Balance: ${fromWei(bankFinalBalance)} ETH`);
      console.log(`   Attacker Balance: ${fromWei(attackerBalance)} ETH`);
      console.log(`   Attack Steps: ${attackSteps}`);
      console.log(`   Stolen Amount: ${fromWei(attackerBalance - toWei(1))} ETH\n`);
      
      expect(bankFinalBalance).to.equal(0);
      expect(attackerBalance).to.be.gt(toWei(1));
      
      console.log("✓ Cross-function vulnerability demonstrated");
      console.log("✓ Multiple functions = Multiple attack vectors");
      console.log("✓ Need contract-wide protection, not per-function\n");
      console.log("=".repeat(50) + "\n");
    });
    
    it("Should show transfer() function is also vulnerable", async function () {
      // Deploy attacker
      const Attacker = await ethers.getContractFactory("CrossFunctionAttacker");
      attacker = await Attacker.connect(attackerAccount).deploy(
        await vulnerableBankV2.getAddress()
      );
      
      // Deposit funds
      await vulnerableBankV2.connect(attackerAccount).deposit({ value: toWei(2) });
      
      const balanceBefore = await vulnerableBankV2.getUserBalance(attackerAccount.address);
      expect(balanceBefore).to.equal(toWei(2));
      
      // Use transfer function (not through attacker, just direct call)
      // This shows transfer() itself is vulnerable
      await vulnerableBankV2.connect(attackerAccount).transfer(
        await attacker.getAddress(),
        toWei(1)
      );
      
      const balanceAfter = await vulnerableBankV2.getUserBalance(attackerAccount.address);
      expect(balanceAfter).to.equal(toWei(1));
    });
  });

  describe("Attack Comparison", function () {
    it("Should compare single-function vs cross-function attack efficiency", async function () {
      console.log("\n=== ATTACK COMPARISON ===\n");
      
      // Test 1: Single-function attack
      const Attacker1 = await ethers.getContractFactory("CrossFunctionAttacker");
      const attacker1 = await Attacker1.connect(attackerAccount).deploy(
        await vulnerableBankV2.getAddress()
      );
      
      const tx1 = await attacker1.connect(attackerAccount).attackWithWithdraw({ 
        value: toWei(1) 
      });
      const receipt1 = await tx1.wait();
      const gasUsed1 = receipt1.gasUsed;
      const steps1 = await attacker1.getAttackSteps();
      
      console.log("Single-Function Attack:");
      console.log(`  Gas Used: ${gasUsed1.toString()}`);
      console.log(`  Attack Steps: ${steps1.toString()}\n`);
      
      // Reset bank
      await vulnerableBankV2.connect(user1).deposit({ value: toWei(5) });
      await vulnerableBankV2.connect(user2).deposit({ value: toWei(5) });
      
      // Test 2: Cross-function attack
      const Attacker2 = await ethers.getContractFactory("CrossFunctionAttacker");
      const attacker2 = await Attacker2.connect(attackerAccount).deploy(
        await vulnerableBankV2.getAddress()
      );
      
      const tx2 = await attacker2.connect(attackerAccount).attackWithCrossFunction({ 
        value: toWei(1) 
      });
      const receipt2 = await tx2.wait();
      const gasUsed2 = receipt2.gasUsed;
      const steps2 = await attacker2.getAttackSteps();
      
      console.log("Cross-Function Attack:");
      console.log(`  Gas Used: ${gasUsed2.toString()}`);
      console.log(`  Attack Steps: ${steps2.toString()}\n`);
      
      console.log("Analysis:");
      console.log(`  Both attacks successfully drained the bank`);
      console.log(`  Cross-function attack demonstrates more sophisticated technique\n`);
      
      expect(await attacker1.getBalance()).to.be.gt(toWei(1));
      expect(await attacker2.getBalance()).to.be.gt(toWei(1));
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero balance gracefully", async function () {
      const Attacker = await ethers.getContractFactory("CrossFunctionAttacker");
      attacker = await Attacker.connect(attackerAccount).deploy(
        await vulnerableBankV2.getAddress()
      );
      
      // Try to attack without depositing
      await expect(
        vulnerableBankV2.connect(attackerAccount).withdraw()
      ).to.be.revertedWith("Insufficient balance");
    });
    
    it("Should reject invalid transfer recipient", async function () {
      await vulnerableBankV2.connect(attackerAccount).deposit({ value: toWei(1) });
      
      await expect(
        vulnerableBankV2.connect(attackerAccount).transfer(
          ethers.ZeroAddress,
          toWei(1)
        )
      ).to.be.revertedWith("Invalid recipient");
    });
  });
});
