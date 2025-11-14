// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VaultA
 * @dev First vault in cross-contract re-entrancy demonstration
 * 
 * VULNERABILITY: This vault is vulnerable to re-entrancy on its own,
 * but the real danger is when combined with VaultB. An attacker can:
 * 1. Deposit in both VaultA and VaultB
 * 2. Withdraw from VaultA
 * 3. During callback, withdraw from VaultB
 * 4. During that callback, withdraw from VaultA again
 * 5. Continue alternating until both are drained
 * 
 * This demonstrates how DeFi protocols with multiple contracts
 * can be exploited in complex attack chains.
 */
contract VaultA {
    mapping(address => uint256) public balances;
    
    string public constant VAULT_NAME = "Vault A";
    
    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);
    
    /**
     * @dev Deposit Ether into Vault A
     */
    function deposit() public payable {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }
    
    /**
     * @dev VULNERABLE: Withdraw funds from Vault A
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
     * @dev Get vault's total Ether balance
     */
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Get user's balance in this vault
     */
    function getUserBalance(address user) public view returns (uint256) {
        return balances[user];
    }
}
