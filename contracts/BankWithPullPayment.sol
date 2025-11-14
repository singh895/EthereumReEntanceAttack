// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BankWithPullPayment
 * @dev Secure bank using pull payment pattern
 * 
 * DEFENSE MECHANISM: Pull Payment Pattern
 * - Instead of pushing payments (sending ETH), let users pull
 * - Separates state update from payment
 * - Users must call two functions: initiate, then complete
 * 
 * PROS:
 * - Completely eliminates re-entrancy risk
 * - No external calls during state changes
 * - Clear separation of concerns
 * - No gas overhead for protection
 * 
 * CONS:
 * - Requires two transactions (worse UX)
 * - Users pay gas twice
 * - More complex user flow
 * - Not suitable for all use cases
 */
contract BankWithPullPayment {
    mapping(address => uint256) public balances;
    mapping(address => uint256) public pendingWithdrawals;
    
    event Deposit(address indexed user, uint256 amount);
    event WithdrawalInitiated(address indexed user, uint256 amount);
    event WithdrawalCompleted(address indexed user, uint256 amount);
    
    /**
     * @dev Deposit Ether into the bank
     */
    function deposit() public payable {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }
    
    /**
     * @dev Step 1: Initiate withdrawal (state update only, no external call)
     * This function ONLY updates state, making it safe from re-entrancy
     */
    function initiateWithdrawal() public {
        uint256 balance = balances[msg.sender];
        require(balance > 0, "Insufficient balance");
        require(pendingWithdrawals[msg.sender] == 0, "Withdrawal already pending");
        
        // Update state ONLY - no external calls
        balances[msg.sender] = 0;
        pendingWithdrawals[msg.sender] = balance;
        
        emit WithdrawalInitiated(msg.sender, balance);
    }
    
    /**
     * @dev Step 2: Complete withdrawal (external call only, state already updated)
     * This function makes the external call, but state is already safe
     */
    function completeWithdrawal() public {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No pending withdrawal");
        
        // Clear pending before sending (CEI pattern)
        pendingWithdrawals[msg.sender] = 0;
        
        // Now safe to send - even if re-entered, pendingWithdrawals is 0
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit WithdrawalCompleted(msg.sender, amount);
    }
    
    /**
     * @dev Convenience function: initiate and complete in one call
     * Note: This is still safe because we follow CEI in completeWithdrawal
     */
    function withdraw() public {
        initiateWithdrawal();
        completeWithdrawal();
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
    
    /**
     * @dev Get user's pending withdrawal
     */
    function getPendingWithdrawal(address user) public view returns (uint256) {
        return pendingWithdrawals[user];
    }
}
