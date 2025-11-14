// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VaultB
 * @dev Second vault in cross-contract re-entrancy demonstration
 * 
 * VULNERABILITY: Identical to VaultA, but exists as a separate contract.
 * The cross-contract attack exploits both vaults simultaneously,
 * demonstrating how an attacker can orchestrate complex multi-contract exploits.
 * 
 * In real DeFi scenarios, these could be:
 * - Different lending pools
 * - Different liquidity pools
 * - Different protocol components
 * 
 * Each contract might be secure in isolation, but together they create
 * a larger attack surface.
 */
contract VaultB {
    mapping(address => uint256) public balances;
    
    string public constant VAULT_NAME = "Vault B";
    
    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);
    
    /**
     * @dev Deposit Ether into Vault B
     */
    function deposit() public payable {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }
    
    /**
     * @dev VULNERABLE: Withdraw funds from Vault B
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
