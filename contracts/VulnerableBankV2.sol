// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VulnerableBankV2
 * @dev Demonstrates CROSS-FUNCTION re-entrancy vulnerability
 * 
 * VULNERABILITY: Multiple functions share the same state (balances mapping)
 * but each function can be called independently. An attacker can:
 * 1. Call withdraw()
 * 2. During the callback, call transfer() instead of withdraw() again
 * 3. Both functions check the same balance, which hasn't been updated yet
 * 
 * This is more sophisticated than single-function re-entrancy and harder to detect.
 */
contract VulnerableBankV2 {
    mapping(address => uint256) public balances;
    
    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);
    event Transfer(address indexed from, address indexed to, uint256 amount);
    
    /**
     * @dev Deposit Ether into the bank
     */
    function deposit() public payable {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }
    
    /**
     * @dev VULNERABLE: Withdraw funds
     * External call before state update creates re-entrancy window
     */
    function withdraw() public {
        uint256 balance = balances[msg.sender];
        require(balance > 0, "Insufficient balance");
        
        // VULNERABILITY: External call BEFORE state update
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Transfer failed");
        
        // State update happens AFTER external call
        balances[msg.sender] = 0;
        emit Withdrawal(msg.sender, balance);
    }
    
    /**
     * @dev VULNERABLE: Transfer funds to another address
     * This function also makes external call before updating state
     * Attacker can re-enter through this function while withdraw() is executing
     */
    function transfer(address to, uint256 amount) public {
        require(to != address(0), "Invalid recipient");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        // VULNERABILITY: External call BEFORE state update
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");
        
        // State update happens AFTER external call
        balances[msg.sender] -= amount;
        emit Transfer(msg.sender, to, amount);
    }
    
    /**
     * @dev Get contract's total Ether balance
     */
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Get user's balance
     */
    function getUserBalance(address user) public view returns (uint256) {
        return balances[user];
    }
}
