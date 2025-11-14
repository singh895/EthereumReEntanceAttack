const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Re-entrancy Attack Demonstration", function () {
  let vulnerableBank, secureBank, attacker;
  let owner, user1, user2, attackerAccount;
  
  // Helper function to convert Ether to Wei
  const toWei = (ether) => ethers.parseEther(ether.toString());
  
  // Helper function to convert Wei to Ether for display
  const fromWei = (wei) => ethers.formatEther(wei);

  beforeEach(async function () {
    // Get test accounts
    [owner, user1, user2, attackerAccount] = await ethers.getSigners();
    
    // Deploy the vulnerable bank
    const VulnerableBank = await ethers.getContractFactory("VulnerableBank");
    vulnerableBank = await VulnerableBank.deploy();
    
    // Deploy the secure bank
    const SecureBank = await ethers.getContractFactory("SecureBank");
    secureBank = await SecureBank.deploy();
    
    // Fund the vulnerable bank with deposits from legitimate users
    await vulnerableBank.connect(user1).deposit({ value: toWei(5) });
    await vulnerableBank.connect(user2).deposit({ value: toWei(5) });
  });

  describe("Vulnerable Bank - Successful Attack", function () {
    it("Should demonstrate successful re-entrancy attack", async function () {
      console.log("\n=== RE-ENTRANCY ATTACK DEMONSTRATION ===\n");
      
      // Initial state
      const bankInitialBalance = await vulnerableBank.getBalance();
      console.log(`1. Initial Bank Balance: ${fromWei(bankInitialBalance)} ETH`);
      console.log(`   (10 ETH from two legitimate users: 5 ETH each)\n`);
      
      // Deploy attacker contract
      const Attacker = await ethers.getContractFactory("Attacker");
      attacker = await Attacker.connect(attackerAccount).deploy(
        await vulnerableBank.getAddress()
      );
      
      const attackerInitialBalance = await ethers.provider.getBalance(
        attackerAccount.address
      );
      console.log(`2. Attacker's Initial Balance: ${fromWei(attackerInitialBalance)} ETH\n`);
      
      // Execute the attack with 1 ETH
      console.log("3. Executing attack with 1 ETH deposit...\n");
      const attackTx = await attacker.connect(attackerAccount).attack({ 
        value: toWei(1) 
      });
      await attackTx.wait();
      
      // Post-attack state
      const bankFinalBalance = await vulnerableBank.getBalance();
      const attackerContractBalance = await attacker.getBalance();
      
      console.log("4. ATTACK COMPLETE!\n");
      console.log(`   Bank Final Balance: ${fromWei(bankFinalBalance)} ETH`);
      console.log(`   Attacker Contract Balance: ${fromWei(attackerContractBalance)} ETH`);
      console.log(`   Stolen Amount: ${fromWei(attackerContractBalance - toWei(1))} ETH\n`);
      
      // Verify the attack was successful
      expect(bankFinalBalance).to.equal(0);
      expect(attackerContractBalance).to.be.gt(toWei(1));
      
      console.log("✓ Attack successful: Bank drained completely\n");
      console.log("=".repeat(45) + "\n");
    });
    
    it("Should show attacker can collect stolen funds", async function () {
      // Deploy and execute attack
      const Attacker = await ethers.getContractFactory("Attacker");
      attacker = await Attacker.connect(attackerAccount).deploy(
        await vulnerableBank.getAddress()
      );
      await attacker.connect(attackerAccount).attack({ value: toWei(1) });
      
      // Collect stolen funds
      const attackerBalanceBefore = await ethers.provider.getBalance(
        attackerAccount.address
      );
      await attacker.connect(attackerAccount).collectStolenFunds();
      const attackerBalanceAfter = await ethers.provider.getBalance(
        attackerAccount.address
      );
      
      // Verify funds were collected
      expect(attackerBalanceAfter).to.be.gt(attackerBalanceBefore);
    });
  });

  describe("Secure Bank - Attack Prevention", function () {
    it("Should prevent re-entrancy attack on secure bank", async function () {
      console.log("\n=== SECURE BANK - ATTACK PREVENTION ===\n");
      
      // Deploy a fresh secure bank for this test
      const SecureBank = await ethers.getContractFactory("SecureBank");
      const freshSecureBank = await SecureBank.deploy();
      
      // Fund the secure bank
      await freshSecureBank.connect(user1).deposit({ value: toWei(5) });
      await freshSecureBank.connect(user2).deposit({ value: toWei(5) });
      
      const bankInitialBalance = await freshSecureBank.getBalance();
      console.log(`1. Secure Bank Initial Balance: ${fromWei(bankInitialBalance)} ETH\n`);
      
      // Deploy attacker targeting secure bank
      const Attacker = await ethers.getContractFactory("Attacker");
      const attackerSecure = await Attacker.connect(attackerAccount).deploy(
        await freshSecureBank.getAddress()
      );
      
      console.log("2. Attempting attack on secure bank...\n");
      
      // Attack should fail or only withdraw once
      await attackerSecure.connect(attackerAccount).attack({ value: toWei(1) });
      
      const bankFinalBalance = await freshSecureBank.getBalance();
      const attackerBalance = await attackerSecure.getBalance();
      
      console.log(`3. Secure Bank Final Balance: ${fromWei(bankFinalBalance)} ETH`);
      console.log(`   Attacker Contract Balance: ${fromWei(attackerBalance)} ETH\n`);
      
      // Verify the bank kept all funds (attack completely prevented)
      // The attacker deposited 1 ETH but couldn't withdraw it due to re-entrancy protection
      expect(bankFinalBalance).to.equal(toWei(10)); // Still has all 10 ETH
      expect(attackerBalance).to.equal(toWei(1)); // Only got their initial deposit back
      
      console.log("✓ Attack prevented: Bank funds remain secure\n");
      console.log("=".repeat(45) + "\n");
    });
  });

  describe("Contract Functionality Tests", function () {
    it("Should allow legitimate deposits and withdrawals", async function () {
      // Deploy a fresh bank for this test
      const VulnerableBank = await ethers.getContractFactory("VulnerableBank");
      const freshBank = await VulnerableBank.deploy();
      
      const depositAmount = toWei(3);
      
      // Deposit
      await freshBank.connect(user1).deposit({ value: depositAmount });
      expect(await freshBank.balances(user1.address)).to.equal(depositAmount);
      
      // Withdraw
      await freshBank.connect(user1).withdraw();
      expect(await freshBank.balances(user1.address)).to.equal(0);
    });
    
    it("Should reject withdrawal with insufficient balance", async function () {
      await expect(
        vulnerableBank.connect(attackerAccount).withdraw()
      ).to.be.revertedWith("Insufficient balance");
    });
  });
});
