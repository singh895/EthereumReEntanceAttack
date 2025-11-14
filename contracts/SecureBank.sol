// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SecureBank
 * @dev A secure version of the bank contract that properly implements the CEI pattern
 * 
 * SECURITY FIX: This contract follows the Checks-Effects-Interactions (CEI) pattern:
 * 1. CHECKS: Validate conditions (require statements)
 * 2. EFFECTS: Update state variables
 * 3. INTERACTIONS: Make external calls
 * 
 * By updating the balance BEFORE sending Ether, we prevent re-entrancy attacks.
 */
contract SecureBank {
    mapping(address => uint256) public balances;
    
    function deposit() public payable {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        balances[msg.sender] += msg.value;
    }
    
    /**
     * @dev SECURE: Properly implements the CEI pattern
     * 
     * Protection Mechanism:
     * 1. Check: Verify the user has sufficient balance
     * 2. Effect: Update the balance to 0 FIRST
     * 3. Interaction: Then send the Ether
     * 
     * If an attacker tries to re-enter, their balance is already 0,
     * so the require statement will fail and the attack is prevented.
     */
    function withdraw() public {
        uint256 balance = balances[msg.sender];
        require(balance > 0, "Insufficient balance");
        
        // SECURITY FIX: Update state BEFORE external call
        balances[msg.sender] = 0;
        
        // External call happens AFTER state update
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Transfer failed");
    }
    
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
