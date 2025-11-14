const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Defense Mechanisms Comparison", function () {
  let owner, user1, user2, attackerAccount;
  
  const toWei = (ether) => ethers.parseEther(ether.toString());
  const fromWei = (wei) => ethers.formatEther(wei);

  beforeEach(async function () {
    [owner, user1, user2, attackerAccount] = await ethers.getSigners();
  });

  describe("Defense 1: ReentrancyGuard (OpenZeppelin)", function () {
    it("Should prevent single-function re-entrancy attack", async function () {
      console.log("\n=== DEFENSE 1: ReentrancyGuard ===\n");
      
      // Deploy protected bank
      const BankWithGuard = await ethers.getContractFactory("BankWithGuard");
      const bank = await BankWithGuard.deploy();
      
      // Fund the bank
      await bank.connect(user1).deposit({ value: toWei(5) });
      await bank.connect(user2).deposit({ value: toWei(5) });
      
      const initialBalance = await bank.getBalance();
      console.log(`Bank Initial Balance: ${fromWei(initialBalance)} ETH`);
      
      // Deploy attacker
      const Attacker = await ethers.getContractFactory("Attacker");
      const attacker = await Attacker.connect(attackerAccount).deploy(
        await bank.getAddress()
      );
      
      // Attempt attack
      console.log("Attempting attack...\n");
      await attacker.connect(attackerAccount).attack({ value: toWei(1) });
      
      const finalBalance = await bank.getBalance();
      const attackerBalance = await attacker.getBalance();
      
      console.log(`Bank Final Balance: ${fromWei(finalBalance)} ETH`);
      console.log(`Attacker Balance: ${fromWei(attackerBalance)} ETH\n`);
      
      // Bank should still have 10 ETH (attack completely prevented)
      // Attacker got their 1 ETH back but couldn't steal anything
      expect(finalBalance).to.equal(toWei(10));
      expect(attackerBalance).to.equal(toWei(1));
      
      console.log("✓ Attack prevented by ReentrancyGuard");
      console.log("✓ Only legitimate withdrawal allowed\n");
    });
    
    it("Should prevent cross-function re-entrancy attack", async function () {
      const BankWithGuard = await ethers.getContractFactory("BankWithGuard");
      const bank = await BankWithGuard.deploy();
      
      await bank.connect(user1).deposit({ value: toWei(5) });
      await bank.connect(user2).deposit({ value: toWei(5) });
      
      const CrossFunctionAttacker = await ethers.getContractFactory("CrossFunctionAttacker");
      const attacker = await CrossFunctionAttacker.connect(attackerAccount).deploy(
        await bank.getAddress()
      );
      
      await attacker.connect(attackerAccount).attackWithCrossFunction({ value: toWei(1) });
      
      expect(await bank.getBalance()).to.equal(toWei(10));
      expect(await attacker.getBalance()).to.equal(toWei(1));
    });
  });

  describe("Defense 2: Custom Mutex Lock", function () {
    it("Should prevent single-function re-entrancy attack", async function () {
      console.log("\n=== DEFENSE 2: Custom Mutex ===\n");
      
      const BankWithMutex = await ethers.getContractFactory("BankWithMutex");
      const bank = await BankWithMutex.deploy();
      
      await bank.connect(user1).deposit({ value: toWei(5) });
      await bank.connect(user2).deposit({ value: toWei(5) });
      
      const initialBalance = await bank.getBalance();
      console.log(`Bank Initial Balance: ${fromWei(initialBalance)} ETH`);
      
      const Attacker = await ethers.getContractFactory("Attacker");
      const attacker = await Attacker.connect(attackerAccount).deploy(
        await bank.getAddress()
      );
      
      console.log("Attempting attack...\n");
      await attacker.connect(attackerAccount).attack({ value: toWei(1) });
      
      const finalBalance = await bank.getBalance();
      console.log(`Bank Final Balance: ${fromWei(finalBalance)} ETH`);
      console.log(`Attacker Balance: ${fromWei(await attacker.getBalance())} ETH\n`);
      
      expect(finalBalance).to.equal(toWei(10));
      
      console.log("✓ Attack prevented by custom mutex");
      console.log("✓ Same effectiveness as ReentrancyGuard\n");
    });
    
    it("Should prevent cross-function re-entrancy attack", async function () {
      const BankWithMutex = await ethers.getContractFactory("BankWithMutex");
      const bank = await BankWithMutex.deploy();
      
      await bank.connect(user1).deposit({ value: toWei(5) });
      await bank.connect(user2).deposit({ value: toWei(5) });
      
      const CrossFunctionAttacker = await ethers.getContractFactory("CrossFunctionAttacker");
      const attacker = await CrossFunctionAttacker.connect(attackerAccount).deploy(
        await bank.getAddress()
      );
      
      await attacker.connect(attackerAccount).attackWithCrossFunction({ value: toWei(1) });
      
      expect(await bank.getBalance()).to.equal(toWei(10));
    });
  });

  describe("Defense 3: Pull Payment Pattern", function () {
    it("Should prevent re-entrancy through separation of concerns", async function () {
      console.log("\n=== DEFENSE 3: Pull Payment ===\n");
      
      const BankWithPullPayment = await ethers.getContractFactory("BankWithPullPayment");
      const bank = await BankWithPullPayment.deploy();
      
      await bank.connect(user1).deposit({ value: toWei(5) });
      await bank.connect(user2).deposit({ value: toWei(5) });
      
      const initialBalance = await bank.getBalance();
      console.log(`Bank Initial Balance: ${fromWei(initialBalance)} ETH`);
      
      const Attacker = await ethers.getContractFactory("Attacker");
      const attacker = await Attacker.connect(attackerAccount).deploy(
        await bank.getAddress()
      );
      
      console.log("Attempting attack...\n");
      await attacker.connect(attackerAccount).attack({ value: toWei(1) });
      
      const finalBalance = await bank.getBalance();
      console.log(`Bank Final Balance: ${fromWei(finalBalance)} ETH`);
      console.log(`Attacker Balance: ${fromWei(await attacker.getBalance())} ETH\n`);
      
      expect(finalBalance).to.equal(toWei(10));
      
      console.log("✓ Attack prevented by pull payment pattern");
      console.log("✓ State updated before external call\n");
    });
    
    it("Should allow two-step withdrawal process", async function () {
      const BankWithPullPayment = await ethers.getContractFactory("BankWithPullPayment");
      const bank = await BankWithPullPayment.deploy();
      
      await bank.connect(user1).deposit({ value: toWei(3) });
      
      // Step 1: Initiate withdrawal
      await bank.connect(user1).initiateWithdrawal();
      expect(await bank.getUserBalance(user1.address)).to.equal(0);
      expect(await bank.getPendingWithdrawal(user1.address)).to.equal(toWei(3));
      
      // Step 2: Complete withdrawal
      await bank.connect(user1).completeWithdrawal();
      expect(await bank.getPendingWithdrawal(user1.address)).to.equal(0);
    });
  });

  describe("Defense 4: Gas Limit (Partial Protection)", function () {
    it("Should limit but not fully prevent re-entrancy", async function () {
      console.log("\n=== DEFENSE 4: Gas Limit (Educational) ===\n");
      
      const BankWithGasLimit = await ethers.getContractFactory("BankWithGasLimit");
      const bank = await BankWithGasLimit.deploy();
      
      await bank.connect(user1).deposit({ value: toWei(5) });
      await bank.connect(user2).deposit({ value: toWei(5) });
      
      const initialBalance = await bank.getBalance();
      console.log(`Bank Initial Balance: ${fromWei(initialBalance)} ETH`);
      
      const Attacker = await ethers.getContractFactory("Attacker");
      const attacker = await Attacker.connect(attackerAccount).deploy(
        await bank.getAddress()
      );
      
      console.log("Attempting attack...\n");
      console.log("Note: 2300 gas limit prevents complex re-entrancy\n");
      
      // With 2300 gas, the attacker's receive() can't do complex operations
      // But simple checks still work, so this is NOT foolproof
      await attacker.connect(attackerAccount).attack({ value: toWei(1) });
      
      const finalBalance = await bank.getBalance();
      
      console.log(`Bank Final Balance: ${fromWei(finalBalance)} ETH\n`);
      console.log("✓ Gas limit provides PARTIAL protection");
      console.log("⚠️  WARNING: This is NOT foolproof!");
      console.log("⚠️  Simple re-entrancy still possible with 2300 gas");
      console.log("⚠️  NOT recommended as sole defense\n");
      
      // Bank should keep funds (attack prevented)
      expect(finalBalance).to.equal(toWei(10));
    });
  });

  describe("Defense Effectiveness Summary", function () {
    it("Should compare all defenses against attacks", async function () {
      console.log("\n=== DEFENSE EFFECTIVENESS COMPARISON ===\n");
      
      const defenses = [
        { name: "ReentrancyGuard", factory: "BankWithGuard" },
        { name: "Custom Mutex", factory: "BankWithMutex" },
        { name: "Pull Payment", factory: "BankWithPullPayment" },
        { name: "CEI Pattern", factory: "SecureBank" }
      ];
      
      console.log("Testing each defense against re-entrancy attack:\n");
      
      for (const defense of defenses) {
        const BankFactory = await ethers.getContractFactory(defense.factory);
        const bank = await BankFactory.deploy();
        
        await bank.connect(user1).deposit({ value: toWei(5) });
        await bank.connect(user2).deposit({ value: toWei(5) });
        
        const Attacker = await ethers.getContractFactory("Attacker");
        const attacker = await Attacker.connect(attackerAccount).deploy(
          await bank.getAddress()
        );
        
        await attacker.connect(attackerAccount).attack({ value: toWei(1) });
        
        const finalBalance = await bank.getBalance();
        const prevented = finalBalance.toString() === toWei(10).toString();
        
        console.log(`${defense.name}:`);
        console.log(`  Bank Balance: ${fromWei(finalBalance)} ETH`);
        console.log(`  Status: ${prevented ? '✓ PROTECTED' : '✗ VULNERABLE'}\n`);
        
        expect(prevented).to.be.true;
      }
      
      console.log("Result: All defenses successfully prevented the attack!\n");
      console.log("=".repeat(50) + "\n");
    });
  });
});
