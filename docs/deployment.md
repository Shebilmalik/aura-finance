# Aura Finance — Deployment Guide

## OP_NET Testnet Deployment

### Step 1: Environment Setup

```bash
# Install Node.js 18+
node --version  # Must be >= 18

# Install global CLI
npm install -g @btc-vision/opnet-cli

# Install project dependencies
npm install @btc-vision/opnet \
            @btc-vision/btc-runtime \
            as-bignum \
            assemblyscript
```

### Step 2: Configure Network

Create `opnet.config.json`:
```json
{
  "network": "testnet",
  "rpcUrl": "https://testnet.opnet.org/rpc",
  "explorerUrl": "https://testnet.opnet.org",
  "gasMultiplier": 1.2
}
```

### Step 3: Compile Contract

```bash
opnet compile ./contracts/AuraStaking.ts

# Verify compiled output
ls -lh ./dist/AuraStaking.wasm
# Expected: ~45-80KB WASM binary
```

### Step 4: Fund Testnet Wallet

1. Install OPWallet: https://opnet.org/wallet
2. Switch to Testnet in settings
3. Request testnet BTC from faucet: https://testnet.opnet.org/faucet

### Step 5: Deploy

```bash
export OPNET_PRIVATE_KEY="your_wif_or_hex_private_key"

opnet deploy \
  --network testnet \
  --contract ./dist/AuraStaking.wasm \
  --gas-limit 500000 \
  --confirm

# Save the output contract address!
```

### Step 6: Initialize Protocol

```bash
# Call initialize function to set up initial vault parameters
opnet call \
  --network testnet \
  --address 0xYOUR_CONTRACT_ADDRESS \
  --method initialize \
  --args '[]'
```

### Step 7: Verify Deployment

```bash
opnet verify \
  --network testnet \
  --address 0xYOUR_CONTRACT_ADDRESS

# View on Explorer
open https://testnet.opnet.org/contract/0xYOUR_CONTRACT_ADDRESS
```

### Step 8: Update Frontend

Edit `frontend/index.html` line ~650:
```javascript
// Update contract address
const CONTRACT_ADDRESS = '0xYOUR_CONTRACT_ADDRESS';
```

### Step 9: Serve Frontend

```bash
# Option A: Simple HTTP server
npx serve ./frontend

# Option B: Deploy to Vercel
npx vercel --prod ./frontend

# Option C: Deploy to GitHub Pages
# Push to gh-pages branch
```

---

## Troubleshooting

**"Insufficient gas"**: Increase `--gas-limit` to 1000000

**"Invalid selector"**: Ensure contract is compiled with latest OP_NET runtime

**"Lock period not expired"**: Wait for the lock duration before unstaking

**CoinGecko API 429**: Free tier limit hit — prices will use fallback values

---

## Mainnet Checklist

Before mainnet deployment:
- [ ] Full security audit by certified firm
- [ ] Bug bounty program launched
- [ ] DAO governance vote approved deployment
- [ ] Multi-sig treasury configured (3/5)
- [ ] Emergency pause multi-sig configured (2/3)
- [ ] Frontend hosted on IPFS for decentralization
- [ ] Subgraph deployed for indexing
