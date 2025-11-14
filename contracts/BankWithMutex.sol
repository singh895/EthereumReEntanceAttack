// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BankWithMutex
 * @dev Secure bank using custom mutex lock pattern
 * 
 * DEFENSE MECHANISM: Custom Mutex Lock
 * - Manually implements the same pattern as ReentrancyGuard
 * - Uses a boolean flag to track execution state
 * - Prevents re-entrant calls by checking the flag
 * 
 * PROS:
 * - No external dependencies
 * - Full control over implementation
 * - Slightly lower gas cost than OpenZeppelin
 * - Educational value (shows how it works)
 * 
 * CONS:
 * - Must implement correctly yourself
 * - Not audited (unless you audit it)
 * - Easy to make mistakes
 * - Must remember to add modifier to all functions
 */
contract BankWithMutex {
    mapping(address => uint256) public balances;
    
    // Mutex lock state
    bool private locked;
    
    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);
    event Transfer(address indexed from, address indexed to, uint256 amount);
    
    /**
     * @dev Custom re-entrancy guard modifier
     * This is essentially what OpenZeppelin's ReentrancyGuard does
     */
    modifier noReentrant() {
        require(!locked, "No re-entrancy");
        locked = true;
        _;
        locked = false;
    }
    
    /**
     * @dev Deposit Ether into the bank
     */
    function deposit() public payable {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }
    
    /**
     * @dev PROTECTED: Withdraw with custom mutex
     */
    function withdraw() public noReentrant {
        uint256 balance = balances[msg.sender];
        require(balance > 0, "Insufficient balance");
        
        // External call before state update, but protected by mutex
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Transfer failed");
        
        balances[msg.sender] = 0;
        emit Withdrawal(msg.sender, balance);
    }
    
    /**
     * @dev PROTECTED: Transfer with custom mutex
     */
    function transfer(address to, uint256 amount) public noReentrant {
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
