# How to Push to GitHub

## Step 1: Create GitHub Repository
1. Go to https://github.com/new
2. Repository name: `reentrancy-attack-demo`
3. Description: "Practical demonstration of re-entrancy attack in Ethereum smart contracts - ECE 59500 Project"
4. Choose Public or Private
5. DO NOT initialize with README
6. Click "Create repository"

## Step 2: Add Remote and Push

After creating the repository, run these commands:

```bash
# Replace YOUR_USERNAME with your GitHub username
git remote add origin https://github.com/YOUR_USERNAME/reentrancy-attack-demo.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 3: Verify

Go to your repository URL to see all files uploaded:
https://github.com/YOUR_USERNAME/reentrancy-attack-demo

## What's Included

✅ Smart Contracts (VulnerableBank, Attacker, SecureBank)
✅ Test Suite (5 passing tests)
✅ README with quick start guide
✅ LaTeX Report (project_update1.tex)
✅ Hardhat Configuration
✅ .gitignore (excludes node_modules, artifacts, etc.)

## Repository Structure

```
reentrancy-attack-demo/
├── contracts/
│   ├── VulnerableBank.sol
│   ├── Attacker.sol
│   └── SecureBank.sol
├── test/
│   └── ReentrancyAttack.test.js
├── README.md
├── project_update1.tex
├── hardhat.config.js
├── package.json
└── .gitignore
```

## If You Need to Update Later

```bash
# Make changes to files
git add .
git commit -m "Your commit message"
git push
```
