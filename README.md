# ◈ Aura Finance

> **The Institutional Liquidity Layer for Bitcoin**  
> Built on OP_NET Testnet · Non-Custodial · Bitcoin L1 Secured

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/aura-finance)
![OP_NET](https://img.shields.io/badge/Network-OP__NET_Testnet-00d2ff?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)
![Status](https://img.shields.io/badge/Status-Live_Testnet-00ff88?style=flat-square)

---

## 📁 Project Structure

```
aura-finance/
├── public/                    ← Vercel serves this folder
│   ├── index.html             ← Full DApp (single file)
│   ├── 404.html               ← Custom error page
│   └── robots.txt
│
├── contracts/
│   └── AuraStaking.ts         ← OP_NET smart contract (AssemblyScript)
│
├── scripts/
│   └── deploy.sh              ← One-command deploy helper
│
├── docs/
│   └── deployment.md          ← OP_NET deployment guide
│
├── .github/
│   └── workflows/
│       └── deploy.yml         ← GitHub Actions auto-deploy
│
├── .gitignore
├── package.json
├── vercel.json                ← Vercel config
└── README.md
```

---

## 🚀 Deploy to GitHub + Vercel

### Prerequisites
- [Git](https://git-scm.com) installed
- [Node.js 18+](https://nodejs.org) installed
- [GitHub account](https://github.com)
- [Vercel account](https://vercel.com) (free)

---

### PART 1 — Push to GitHub

**Step 1: Create GitHub Repository**

1. Go to **https://github.com/new**
2. Repository name: `aura-finance`
3. Set to **Public** (or Private)
4. **Do NOT** check "Initialize with README"
5. Click **Create repository**

**Step 2: Initialize Git & Push**

Open your terminal in the project folder:

```bash
# Initialize git
git init

# Add all files
git add .

# First commit
git commit -m "🚀 Initial commit — Aura Finance DeFi Protocol"

# Connect to your GitHub repo (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/aura-finance.git

# Push
git branch -M main
git push -u origin main
```

✅ Your code is now live on GitHub!

---

### PART 2 — Deploy to Vercel

**Option A: One-Click (Easiest)**

Click the button at the top of this README — it clones + deploys automatically.

---

**Option B: Vercel Dashboard (Recommended)**

1. Go to **https://vercel.com/dashboard**
2. Click **"Add New Project"**
3. Click **"Import Git Repository"**
4. Select **aura-finance** from your GitHub list
5. Configure settings:
   - **Framework Preset:** `Other`
   - **Root Directory:** `./`
   - **Build Command:** *(leave empty)*
   - **Output Directory:** `public`
6. Click **"Deploy"**

Your live URL will be: `https://aura-finance-YOUR_NAME.vercel.app`

---

**Option C: Vercel CLI**

```bash
npm install -g vercel
vercel login
vercel --prod
```

---

### PART 3 — Auto-Deploy on Git Push (GitHub Actions)

Every push to `main` will automatically redeploy. Setup:

1. Vercel Dashboard → Project → **Settings → General** → copy **Project ID**
2. Vercel **Account Settings** → copy **Org/Team ID**
3. Vercel **Account Settings → Tokens** → create a new token

4. GitHub repo → **Settings → Secrets and variables → Actions → New secret**

Add these 3 secrets:

| Secret Name | Where to find it |
|---|---|
| `VERCEL_TOKEN` | Vercel Account Settings → Tokens |
| `VERCEL_ORG_ID` | Vercel Account Settings → General |
| `VERCEL_PROJECT_ID` | Vercel Project → Settings → General |

Now every `git push` triggers auto-deploy! 🎉

---

### PART 4 — Custom Domain (Optional)

1. Vercel Dashboard → Project → **Settings → Domains**
2. Type your domain e.g. `app.aura.finance`
3. Update your DNS `CNAME` record to point to `cname.vercel-dns.com`
4. SSL auto-provisions within minutes ✅

---

## ⚡ Vault System

| Vault | Lock | APY | Feature |
|---|---|---|---|
| **GENESIS** | Flexible | 4.5% | — |
| **STRATEGIST** | 14 days | 12.8% | — |
| **ORACLE** | 30 days | 38.5% | 2× Governance Vote |

---

## 🔧 Local Development

```bash
npm install
npm run dev
# Open http://localhost:3000
```

---

## 📜 Smart Contract Deployment

```bash
npm install -g @btc-vision/opnet-cli
npm run compile:contract
export OPNET_PRIVATE_KEY="your_testnet_key"
npm run deploy:testnet
```

See [`docs/deployment.md`](docs/deployment.md) for the full OP_NET guide.

---

## 🛡 Security

- Non-custodial · Bitcoin L1 anchored · Open source
- SafeMath protected · DAO governed · Emergency pause (multi-sig)

---

## 📄 License

MIT © 2025 Aura Finance DAO
