# Re-entrancy Attack Demonstration

**ECE 59500 – Introduction to Applied Cryptography**  
**Fall 2025 Project**  
**Team Members:** Saanvi Singh, Yoon Suk Uhr

## Project Overview

This project provides a practical, hands-on demonstration of the re-entrancy attack vulnerability in Ethereum smart contracts.

## Quick Start

```bash
# Install dependencies
npm install

# Compile contracts
npm run compile

# Run tests
npm test
```

## Expected Results

- **Attack on Vulnerable Bank:** 10 ETH stolen (100% success)
- **Attack on Secure Bank:** 0 ETH stolen (100% prevention)

## Project Structure

```
contracts/
├── VulnerableBank.sol    # Intentionally vulnerable
├── Attacker.sol          # Exploits the vulnerability
└── SecureBank.sol        # Secure implementation

test/
└── ReentrancyAttack.test.js  # Automated tests
```

## Key Results

### Vulnerable Bank Attack
- Initial Balance: 10.0 ETH
- Attacker Investment: 1.0 ETH
- Final Balance: 0.0 ETH
- **Total Stolen: 10.0 ETH**

### Secure Bank Defense
- Initial Balance: 10.0 ETH
- Attacker Investment: 1.0 ETH
- Final Balance: 10.0 ETH
- **Total Stolen: 0.0 ETH**

## The Vulnerability

```solidity
// VULNERABLE CODE
function withdraw() public {
    uint256 balance = balances[msg.sender];
    require(balance > 0);
    
    // ❌ External call BEFORE state update
    msg.sender.call{value: balance}("");
    
    // ⚠️ TOO LATE
    balances[msg.sender] = 0;
}
```

## The Fix

```solidity
// SECURE CODE
function withdraw() public {
    uint256 balance = balances[msg.sender];
    require(balance > 0);
    
    // ✅ State update FIRST
    balances[msg.sender] = 0;
    
    // Then external call
    msg.sender.call{value: balance}("");
}
```

## Technology Stack

- Hardhat 2.22.0
- Solidity 0.8.20
- Ethers.js 6.11.0
- Chai 4.3.10

## License

MIT - Educational purposes only

## ⚠️ Warning

This code contains intentional vulnerabilities for educational purposes.  
**NEVER** deploy to a real blockchain network.
