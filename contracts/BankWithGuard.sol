// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BankWithGuard
 * @dev Secure bank using OpenZeppelin's ReentrancyGuard
 * 
 * DEFENSE MECHANISM: ReentrancyGuard
 * - Uses a mutex lock pattern
 * - Sets a state variable before function execution
 * - Prevents re-entrant calls by checking the lock
 * - Resets the lock after function completes
 * 
 * PROS:
 * - Industry standard (OpenZeppelin)
 * - Well-tested and audited
 * - Easy to implement (just add modifier)
 * - Protects entire contract automatically
 * 
 * CONS:
 * - Small gas overhead (~2,000-3,000 gas per call)
 * - Requires inheritance
 * - Adds deployment cost
 */
contract BankWithGuard is ReentrancyGuard {
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
     * @dev PROTECTED: Withdraw with ReentrancyGuard
     * The nonReentrant modifier prevents re-entrant calls
     */
    function withdraw() public nonReentrant {
        uint256 balance = balances[msg.sender];
        require(balance > 0, "Insufficient balance");
        
        // Even though we still make external call before state update,
        // the nonReentrant modifier prevents re-entry
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Transfer failed");
        
        balances[msg.sender] = 0;
        emit Withdrawal(msg.sender, balance);
    }
    
    /**
     * @dev PROTECTED: Transfer with ReentrancyGuard
     * Both functions are protected by the same lock
     */
    function transfer(address to, uint256 amount) public nonReentrant {
        require(to != address(0), "Invalid recipient");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");
        
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
