// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VulnerableBank
 * @dev A deliberately vulnerable smart contract that demonstrates the re-entrancy attack.
 * 
 * VULNERABILITY: The withdraw() function violates the Checks-Effects-Interactions (CEI) pattern
 * by making an external call (sending Ether) BEFORE updating the internal state (balance).
 * This creates a window where a malicious contract can recursively call withdraw() again
 * before the balance is decremented, draining the contract.
 */
contract VulnerableBank {
    // Mapping to track each user's balance
    mapping(address => uint256) public balances;
    
    /**
     * @dev Allows users to deposit Ether into the bank
     * This function correctly updates state before any external interactions
     */
    function deposit() public payable {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        balances[msg.sender] += msg.value;
    }
    
    /**
     * @dev VULNERABLE: Allows users to withdraw their balance
     * 
     * FLAW: This function performs the external call (sending Ether) BEFORE updating
     * the user's balance. This is the classic re-entrancy vulnerability.
     * 
     * Attack Flow:
     * 1. Attacker calls withdraw()
     * 2. Contract sends Ether to attacker (line with call)
     * 3. Attacker's receive() function is triggered
     * 4. Attacker calls withdraw() again (re-entry)
     * 5. Balance check still passes (balance not yet updated)
     * 6. Contract sends Ether again
     * 7. Loop continues until contract is drained
     */
    function withdraw() public {
        uint256 balance = balances[msg.sender];
        require(balance > 0, "Insufficient balance");
        
        // VULNERABILITY: External call happens BEFORE state update
        // This violates the Checks-Effects-Interactions pattern
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Transfer failed");
        
        // State update happens AFTER external call - TOO LATE!
        balances[msg.sender] = 0;
    }
    
    /**
     * @dev Returns the contract's total Ether balance
     */
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
