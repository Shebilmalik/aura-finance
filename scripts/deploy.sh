#!/usr/bin/env bash
# ─────────────────────────────────────────────────────
#  Aura Finance — Quick Deploy Script
#  Usage: bash scripts/deploy.sh
# ─────────────────────────────────────────────────────

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}"
echo "  ◈  AURA FINANCE — DEPLOY SCRIPT"
echo "  Institutional Liquidity Layer for Bitcoin"
echo -e "${NC}"

# ── Step 1: Check Node ──
echo -e "${YELLOW}[1/5] Checking Node.js version...${NC}"
NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 18 ]; then
  echo "❌ Node.js 18+ required. Current: $(node -v)"
  exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# ── Step 2: Install deps ──
echo -e "${YELLOW}[2/5] Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"

# ── Step 3: Install Vercel CLI if needed ──
echo -e "${YELLOW}[3/5] Checking Vercel CLI...${NC}"
if ! command -v vercel &> /dev/null; then
  npm install -g vercel
fi
echo -e "${GREEN}✓ Vercel CLI ready${NC}"

# ── Step 4: Vercel login check ──
echo -e "${YELLOW}[4/5] Checking Vercel auth...${NC}"
vercel whoami 2>/dev/null || vercel login
echo -e "${GREEN}✓ Authenticated${NC}"

# ── Step 5: Deploy ──
echo -e "${YELLOW}[5/5] Deploying to Vercel...${NC}"
vercel deploy --prod

echo ""
echo -e "${GREEN}🚀 Aura Finance deployed successfully!${NC}"
echo -e "${CYAN}Visit your Vercel dashboard for the live URL${NC}"
