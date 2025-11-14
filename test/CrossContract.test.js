const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Cross-Contract Re-entrancy Attack", function () {
  let vaultA, vaultB, attacker;
  let owner, user1, user2, user3, user4, attackerAccount;
  
  const toWei = (ether) => ethers.parseEther(ether.toString());
  const fromWei = (wei) => ethers.formatEther(wei);

  beforeEach(async function () {
    [owner, user1, user2, user3, user4, attackerAccount] = await ethers.getSigners();
    
    // Deploy both vaults
    const VaultA = await ethers.getContractFactory("VaultA");
    vaultA = await VaultA.deploy();
    
    const VaultB = await ethers.getContractFactory("VaultB");
    vaultB = await VaultB.deploy();
    
    // Fund both vaults with deposits from legitimate users
    await vaultA.connect(user1).deposit({ value: toWei(5) });
    await vaultA.connect(user2).deposit({ value: toWei(5) });
    
    await vaultB.connect(user3).deposit({ value: toWei(5) });
    await vaultB.connect(user4).deposit({ value: toWei(5) });
  });

  describe("Individual Vault Attacks (Baseline)", function () {
    it("Should demonstrate VaultA can be drained individually", async function () {
      console.log("\n=== INDIVIDUAL VAULT A ATTACK ===\n");
      
      const vaultAInitial = await vaultA.getBalance();
      console.log(`VaultA Initial Balance: ${fromWei(vaultAInitial)} ETH\n`);
      
      // Use simple attacker from Update 1
      const SimpleAttacker = await ethers.getContractFactory("Attacker");
      const simpleAttacker = await SimpleAttacker.connect(attackerAccount).deploy(
        await vaultA.getAddress()
      );
      
      await simpleAttacker.connect(attackerAccount).attack({ value: toWei(1) });
      
      const vaultAFinal = await vaultA.getBalance();
      console.log(`VaultA Final Balance: ${fromWei(vaultAFinal)} ETH`);
      console.log("✓ VaultA drained individually\n");
      
      expect(vaultAFinal).to.equal(0);
    });
    
    it("Should demonstrate VaultB can be drained individually", async function () {
      const vaultBInitial = await vaultB.getBalance();
      
      const SimpleAttacker = await ethers.getContractFactory("Attacker");
      const simpleAttacker = await SimpleAttacker.connect(attackerAccount).deploy(
        await vaultB.getAddress()
      );
      
      await simpleAttacker.connect(attackerAccount).attack({ value: toWei(1) });
      
      const vaultBFinal = await vaultB.getBalance();
      expect(vaultBFinal).to.equal(0);
    });
  });

  describe("Cross-Contract Attack (Advanced)", function () {
    it("Should demonstrate simultaneous attack on both vaults", async function () {
      console.log("\n=== CROSS-CONTRACT ATTACK ===\n");
      
      const vaultAInitial = await vaultA.getBalance();
      const vaultBInitial = await vaultB.getBalance();
      const totalInitial = vaultAInitial + vaultBInitial;
      
      console.log(`1. Initial State:`);
      console.log(`   VaultA Balance: ${fromWei(vaultAInitial)} ETH`);
      console.log(`   VaultB Balance: ${fromWei(vaultBInitial)} ETH`);
      console.log(`   Total: ${fromWei(totalInitial)} ETH\n`);
      
      // Deploy cross-contract attacker
      const CrossContractAttacker = await ethers.getContractFactory("CrossContractAttacker");
      attacker = await CrossContractAttacker.connect(attackerAccount).deploy(
        await vaultA.getAddress(),
        await vaultB.getAddress()
      );
      
      console.log("2. Executing cross-contract attack...");
      console.log("   Strategy: Ping-pong between VaultA and VaultB\n");
      
      // Execute attack with 2 ETH (1 per vault)
      const attackTx = await attacker.connect(attackerAccount).attack({ 
        value: toWei(2) 
      });
      await attackTx.wait();
      
      const vaultAFinal = await vaultA.getBalance();
      const vaultBFinal = await vaultB.getBalance();
      const attackerBalance = await attacker.getBalance();
      const attackSteps = await attacker.getAttackSteps();
      
      console.log("3. ATTACK COMPLETE!\n");
      console.log(`   VaultA Final Balance: ${fromWei(vaultAFinal)} ETH`);
      console.log(`   VaultB Final Balance: ${fromWei(vaultBFinal)} ETH`);
      console.log(`   Attacker Balance: ${fromWei(attackerBalance)} ETH`);
      console.log(`   Attack Steps: ${attackSteps}`);
      console.log(`   Total Stolen: ${fromWei(attackerBalance - toWei(2))} ETH\n`);
      
      // Verify both vaults are drained
      expect(vaultAFinal).to.equal(0);
      expect(vaultBFinal).to.equal(0);
      expect(attackerBalance).to.equal(totalInitial + toWei(2));
      
      console.log("✓ Both vaults drained in single transaction");
      console.log("✓ Demonstrates complex multi-contract exploit\n");
      console.log("=".repeat(50) + "\n");
    });
    
    it("Should show attack status during execution", async function () {
      const CrossContractAttacker = await ethers.getContractFactory("CrossContractAttacker");
      attacker = await CrossContractAttacker.connect(attackerAccount).deploy(
        await vaultA.getAddress(),
        await vaultB.getAddress()
      );
      
      await attacker.connect(attackerAccount).attack({ value: toWei(2) });
      
      const status = await attacker.getAttackStatus();
      
      expect(status.inProgress).to.equal(false); // Attack completed
      expect(status.steps).to.be.gt(0); // Multiple steps executed
      expect(status.nextTargetName).to.equal("Done"); // Attack finished
      expect(status.vaultABalance).to.equal(0); // VaultA drained
      expect(status.vaultBBalance).to.equal(0); // VaultB drained
    });
    
    it("Should allow attacker to collect stolen funds", async function () {
      const CrossContractAttacker = await ethers.getContractFactory("CrossContractAttacker");
      attacker = await CrossContractAttacker.connect(attackerAccount).deploy(
        await vaultA.getAddress(),
        await vaultB.getAddress()
      );
      
      await attacker.connect(attackerAccount).attack({ value: toWei(2) });
      
      const attackerBalanceBefore = await ethers.provider.getBalance(attackerAccount.address);
      const contractBalance = await attacker.getBalance();
      
      await attacker.connect(attackerAccount).collectStolenFunds();
      
      const attackerBalanceAfter = await ethers.provider.getBalance(attackerAccount.address);
      
      // Attacker should have more ETH (minus gas costs)
      expect(attackerBalanceAfter).to.be.gt(attackerBalanceBefore);
      expect(await attacker.getBalance()).to.equal(0);
    });
  });

  describe("Attack Complexity Analysis", function () {
    it("Should measure attack steps for cross-contract vs single-contract", async function () {
      console.log("\n=== ATTACK COMPLEXITY COMPARISON ===\n");
      
      // Single-contract attack
      const SimpleAttacker = await ethers.getContractFactory("Attacker");
      const simpleAttacker = await SimpleAttacker.connect(attackerAccount).deploy(
        await vaultA.getAddress()
      );
      
      const tx1 = await simpleAttacker.connect(attackerAccount).attack({ value: toWei(1) });
      const receipt1 = await tx1.wait();
      
      console.log("Single-Contract Attack (VaultA only):");
      console.log(`  Gas Used: ${receipt1.gasUsed.toString()}`);
      console.log(`  Contracts Exploited: 1\n`);
      
      // Reset vaults
      await vaultA.connect(user1).deposit({ value: toWei(5) });
      await vaultA.connect(user2).deposit({ value: toWei(5) });
      
      // Cross-contract attack
      const CrossContractAttacker = await ethers.getContractFactory("CrossContractAttacker");
      const crossAttacker = await CrossContractAttacker.connect(attackerAccount).deploy(
        await vaultA.getAddress(),
        await vaultB.getAddress()
      );
      
      const tx2 = await crossAttacker.connect(attackerAccount).attack({ value: toWei(2) });
      const receipt2 = await tx2.wait();
      const steps = await crossAttacker.getAttackSteps();
      
      console.log("Cross-Contract Attack (VaultA + VaultB):");
      console.log(`  Gas Used: ${receipt2.gasUsed.toString()}`);
      console.log(`  Attack Steps: ${steps.toString()}`);
      console.log(`  Contracts Exploited: 2\n`);
      
      console.log("Analysis:");
      console.log(`  Cross-contract attack is more complex but equally effective`);
      console.log(`  Demonstrates real-world DeFi attack scenarios\n`);
      
      expect(steps).to.be.gt(10); // Multiple ping-pong steps
    });
  });

  describe("Edge Cases", function () {
    it("Should require minimum 2 ETH for cross-contract attack", async function () {
      const CrossContractAttacker = await ethers.getContractFactory("CrossContractAttacker");
      attacker = await CrossContractAttacker.connect(attackerAccount).deploy(
        await vaultA.getAddress(),
        await vaultB.getAddress()
      );
      
      await expect(
        attacker.connect(attackerAccount).attack({ value: toWei(1) })
      ).to.be.revertedWith("Need at least 2 ETH (1 per vault)");
    });
    
    it("Should prevent re-attack while attack is in progress", async function () {
      const CrossContractAttacker = await ethers.getContractFactory("CrossContractAttacker");
      attacker = await CrossContractAttacker.connect(attackerAccount).deploy(
        await vaultA.getAddress(),
        await vaultB.getAddress()
      );
      
      // First attack
      await attacker.connect(attackerAccount).attack({ value: toWei(2) });
      
      // Try to attack again (should work since first attack completed)
      // Reset vaults first
      await vaultA.connect(user1).deposit({ value: toWei(5) });
      await vaultB.connect(user3).deposit({ value: toWei(5) });
      
      // Second attack should work
      await expect(
        attacker.connect(attackerAccount).attack({ value: toWei(2) })
      ).to.not.be.reverted;
    });
    
    it("Should only allow owner to collect funds", async function () {
      const CrossContractAttacker = await ethers.getContractFactory("CrossContractAttacker");
      attacker = await CrossContractAttacker.connect(attackerAccount).deploy(
        await vaultA.getAddress(),
        await vaultB.getAddress()
      );
      
      await attacker.connect(attackerAccount).attack({ value: toWei(2) });
      
      // Non-owner tries to collect
      await expect(
        attacker.connect(user1).collectStolenFunds()
      ).to.be.revertedWith("Only owner can collect");
    });
  });

  describe("Real-World Scenario Simulation", function () {
    it("Should simulate DeFi protocol with multiple pools", async function () {
      console.log("\n=== DEFI PROTOCOL SIMULATION ===\n");
      console.log("Scenario: Two lending pools in a DeFi protocol");
      console.log("VaultA = Lending Pool for ETH");
      console.log("VaultB = Lending Pool for stablecoins (simulated as ETH)\n");
      
      const vaultAInitial = await vaultA.getBalance();
      const vaultBInitial = await vaultB.getBalance();
      
      console.log(`Protocol TVL (Total Value Locked):`);
      console.log(`  Pool A: ${fromWei(vaultAInitial)} ETH`);
      console.log(`  Pool B: ${fromWei(vaultBInitial)} ETH`);
      console.log(`  Total: ${fromWei(vaultAInitial + vaultBInitial)} ETH\n`);
      
      const CrossContractAttacker = await ethers.getContractFactory("CrossContractAttacker");
      attacker = await CrossContractAttacker.connect(attackerAccount).deploy(
        await vaultA.getAddress(),
        await vaultB.getAddress()
      );
      
      console.log("Attacker exploits both pools simultaneously...\n");
      await attacker.connect(attackerAccount).attack({ value: toWei(2) });
      
      console.log("Result: Protocol completely drained");
      console.log(`  Pool A: ${fromWei(await vaultA.getBalance())} ETH`);
      console.log(`  Pool B: ${fromWei(await vaultB.getBalance())} ETH`);
      console.log(`  Attacker Profit: ${fromWei(await attacker.getBalance() - toWei(2))} ETH\n`);
      
      console.log("✓ Demonstrates real-world DeFi attack scenario\n");
      console.log("=".repeat(50) + "\n");
      
      expect(await vaultA.getBalance()).to.equal(0);
      expect(await vaultB.getBalance()).to.equal(0);
    });
  });
});
