// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BankWithGasLimit
 * @dev Attempts to prevent re-entrancy by limiting forwarded gas
 * 
 * DEFENSE MECHANISM: Gas Limit Restriction
 * - Limits gas forwarded to external calls
 * - 2300 gas is only enough for event emission
 * - Not enough gas for complex re-entrancy attacks
 * 
 * PROS:
 * - Simple to implement
 * - No additional state variables
 * - Low overhead
 * 
 * CONS:
 * - ⚠️ NOT FULLY SECURE - can be bypassed
 * - Breaks compatibility with smart contract wallets
 * - 2300 gas limit is arbitrary and may change
 * - Not recommended as sole defense
 * - Can still be exploited with careful gas management
 * 
 * NOTE: This is included for educational purposes to show why
 * gas limits alone are NOT sufficient protection!
 */
contract BankWithGasLimit {
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
     * @dev PARTIALLY PROTECTED: Withdraw with gas limit
     * 
     * WARNING: This is NOT fully secure!
     * - 2300 gas prevents most re-entrancy attacks
     * - But sophisticated attackers can still exploit this
     * - Should be combined with other defenses
     */
    function withdraw() public {
        uint256 balance = balances[msg.sender];
        require(balance > 0, "Insufficient balance");
        
        // Limit gas to 2300 (only enough for event emission)
        // This prevents most re-entrancy but is NOT foolproof
        (bool success, ) = msg.sender.call{value: balance, gas: 2300}("");
        require(success, "Transfer failed");
        
        balances[msg.sender] = 0;
        emit Withdrawal(msg.sender, balance);
    }
    
    /**
     * @dev PARTIALLY PROTECTED: Transfer with gas limit
     */
    function transfer(address to, uint256 amount) public {
        require(to != address(0), "Invalid recipient");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        (bool success, ) = to.call{value: amount, gas: 2300}("");
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
