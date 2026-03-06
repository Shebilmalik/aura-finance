/**
 * Aura Finance - Institutional Liquidity Layer for Bitcoin
 * OP_NET Smart Contract - Staking Protocol
 * Network: OP_NET Testnet
 * 
 * SPDX-License-Identifier: MIT
 */

import { OP_NET } from '@btc-vision/opnet';
import {
  Address,
  Blockchain,
  BytesWriter,
  Calldata,
  encodeSelector,
  Map,
  MemorySlotData,
  MemorySlotPointer,
  Revert,
  SafeMath,
  Selector,
  StoredBoolean,
  StoredString,
  StoredU256,
  StoredU64,
} from '@btc-vision/btc-runtime/runtime';
import { u256 } from 'as-bignum/assembly';

/**
 * Vault Types:
 * 0 = GENESIS  (flexible, 0-day lock,  4.5% APY)
 * 1 = STRATEGIST (fixed, 14-day lock, 12.8% APY)
 * 2 = ORACLE   (premium, 30-day lock, 38.5% APY)
 */

const GENESIS_VAULT: u8 = 0;
const STRATEGIST_VAULT: u8 = 1;
const ORACLE_VAULT: u8 = 2;

// APY in basis points (1 bp = 0.01%)
const GENESIS_APY_BPS: u64 = 450;      // 4.5%
const STRATEGIST_APY_BPS: u64 = 1280;  // 12.8%
const ORACLE_APY_BPS: u64 = 3850;      // 38.5%

// Lock periods in seconds
const GENESIS_LOCK: u64 = 0;
const STRATEGIST_LOCK: u64 = 14 * 24 * 3600;  // 14 days
const ORACLE_LOCK: u64 = 30 * 24 * 3600;       // 30 days

// Oracle vault governance multiplier
const ORACLE_GOV_MULTIPLIER: u64 = 2;

const SECONDS_PER_YEAR: u64 = 365 * 24 * 3600;
const BASIS_POINTS: u64 = 10000;

// Storage pointer base values
const POINTER_TVL: u16 = 100;
const POINTER_TOTAL_STAKERS: u16 = 101;
const POINTER_TOTAL_REWARDS: u16 = 102;
const POINTER_PROTOCOL_PAUSED: u16 = 103;

@final
export class AuraStaking extends OP_NET {

  // ── Protocol-level storage ──────────────────────────────────────────────
  private readonly _tvl: StoredU256;
  private readonly _totalStakers: StoredU256;
  private readonly _totalRewardsDistributed: StoredU256;
  private readonly _paused: StoredBoolean;

  // ── Per-user, per-vault mappings ────────────────────────────────────────
  // Key format: sha256(address + vaultType)
  private readonly stakedBalance: Map<u256, MemorySlotData<u256>>;
  private readonly stakeTimestamp: Map<u256, MemorySlotData<u256>>;
  private readonly rewardDebt: Map<u256, MemorySlotData<u256>>;
  private readonly autoCompound: Map<u256, MemorySlotData<u256>>;
  private readonly hasStaked: Map<u256, MemorySlotData<u256>>;

  constructor() {
    super();

    this._tvl = new StoredU256(POINTER_TVL, u256.Zero);
    this._totalStakers = new StoredU256(POINTER_TOTAL_STAKERS, u256.Zero);
    this._totalRewardsDistributed = new StoredU256(POINTER_TOTAL_REWARDS, u256.Zero);
    this._paused = new StoredBoolean(POINTER_PROTOCOL_PAUSED, false);

    this.stakedBalance = new Map<u256, MemorySlotData<u256>>();
    this.stakeTimestamp = new Map<u256, MemorySlotData<u256>>();
    this.rewardDebt = new Map<u256, MemorySlotData<u256>>();
    this.autoCompound = new Map<u256, MemorySlotData<u256>>();
    this.hasStaked = new Map<u256, MemorySlotData<u256>>();
  }

  // ── Selectors ────────────────────────────────────────────────────────────
  public override get contractType(): u8 { return 200; }

  private get STAKE_SELECTOR(): Selector { return encodeSelector('stake'); }
  private get UNSTAKE_SELECTOR(): Selector { return encodeSelector('unstake'); }
  private get CLAIM_REWARDS_SELECTOR(): Selector { return encodeSelector('claimRewards'); }
  private get TOGGLE_AUTOCOMPOUND_SELECTOR(): Selector { return encodeSelector('toggleAutoCompound'); }
  private get GET_STAKED_SELECTOR(): Selector { return encodeSelector('getStaked'); }
  private get GET_PENDING_REWARDS_SELECTOR(): Selector { return encodeSelector('getPendingRewards'); }
  private get GET_TVL_SELECTOR(): Selector { return encodeSelector('getTVL'); }
  private get GET_STATS_SELECTOR(): Selector { return encodeSelector('getProtocolStats'); }
  private get CLAIM_TEST_TOKENS_SELECTOR(): Selector { return encodeSelector('claimTestTokens'); }

  // ── Router ────────────────────────────────────────────────────────────────
  public override execute(method: Selector, calldata: Calldata): BytesWriter {
    switch (method) {
      case this.STAKE_SELECTOR:
        return this._stake(calldata);
      case this.UNSTAKE_SELECTOR:
        return this._unstake(calldata);
      case this.CLAIM_REWARDS_SELECTOR:
        return this._claimRewards(calldata);
      case this.TOGGLE_AUTOCOMPOUND_SELECTOR:
        return this._toggleAutoCompound(calldata);
      case this.GET_STAKED_SELECTOR:
        return this._getStaked(calldata);
      case this.GET_PENDING_REWARDS_SELECTOR:
        return this._getPendingRewards(calldata);
      case this.GET_TVL_SELECTOR:
        return this._getTVL();
      case this.GET_STATS_SELECTOR:
        return this._getProtocolStats();
      case this.CLAIM_TEST_TOKENS_SELECTOR:
        return this._claimTestTokens();
      default:
        throw new Revert('Unknown selector');
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private _requireNotPaused(): void {
    if (this._paused.value) throw new Revert('Protocol paused');
  }

  private _vaultKey(addr: Address, vault: u8): u256 {
    const writer = new BytesWriter(21);
    writer.writeAddress(addr);
    writer.writeU8(vault);
    return Blockchain.sha256(writer.getBuffer());
  }

  private _apyBps(vault: u8): u64 {
    if (vault === GENESIS_VAULT) return GENESIS_APY_BPS;
    if (vault === STRATEGIST_VAULT) return STRATEGIST_APY_BPS;
    if (vault === ORACLE_VAULT) return ORACLE_APY_BPS;
    throw new Revert('Invalid vault');
  }

  private _lockPeriod(vault: u8): u64 {
    if (vault === GENESIS_VAULT) return GENESIS_LOCK;
    if (vault === STRATEGIST_VAULT) return STRATEGIST_LOCK;
    if (vault === ORACLE_VAULT) return ORACLE_LOCK;
    throw new Revert('Invalid vault');
  }

  private _calcRewards(principal: u256, stakedAt: u64, apyBps: u64): u256 {
    const now: u64 = Blockchain.blockTime();
    const elapsed: u64 = now - stakedAt;
    // reward = principal * elapsed * apyBps / (SECONDS_PER_YEAR * BASIS_POINTS)
    const elapsedU256 = u256.fromU64(elapsed);
    const apyU256 = u256.fromU64(apyBps);
    const denom = u256.fromU64(SafeMath.mul64(SECONDS_PER_YEAR, BASIS_POINTS));
    return SafeMath.div(SafeMath.mul(SafeMath.mul(principal, elapsedU256), apyU256), denom);
  }

  // ── Stake ─────────────────────────────────────────────────────────────────
  private _stake(calldata: Calldata): BytesWriter {
    this._requireNotPaused();
    const vault: u8 = calldata.readU8();
    const amount: u256 = calldata.readU256();
    if (SafeMath.lt(amount, u256.Zero)) throw new Revert('Amount must be > 0');

    const caller = Blockchain.callerAddress();
    const key = this._vaultKey(caller, vault);

    // Settle pending rewards before adding new stake
    const existing: u256 = this.stakedBalance.get(key) || u256.Zero;
    if (!u256.eq(existing, u256.Zero)) {
      const ts: u64 = u64((this.stakeTimestamp.get(key) || u256.Zero).toU64());
      const pending = this._calcRewards(existing, ts, this._apyBps(vault));
      const accumulated = SafeMath.add(this.rewardDebt.get(key) || u256.Zero, pending);
      this.rewardDebt.set(key, accumulated);
    } else {
      // New staker
      this._totalStakers.value = SafeMath.add(this._totalStakers.value, u256.fromU64(1));
    }

    this.stakedBalance.set(key, SafeMath.add(existing, amount));
    this.stakeTimestamp.set(key, u256.fromU64(Blockchain.blockTime()));
    this._tvl.value = SafeMath.add(this._tvl.value, amount);

    const response = new BytesWriter(32);
    response.writeU256(amount);
    return response;
  }

  // ── Unstake ───────────────────────────────────────────────────────────────
  private _unstake(calldata: Calldata): BytesWriter {
    this._requireNotPaused();
    const vault: u8 = calldata.readU8();
    const amount: u256 = calldata.readU256();

    const caller = Blockchain.callerAddress();
    const key = this._vaultKey(caller, vault);
    const staked: u256 = this.stakedBalance.get(key) || u256.Zero;
    if (SafeMath.lt(staked, amount)) throw new Revert('Insufficient staked balance');

    const stakedAt: u64 = u64((this.stakeTimestamp.get(key) || u256.Zero).toU64());
    const lock: u64 = this._lockPeriod(vault);
    const unlockTime: u64 = stakedAt + lock;
    if (Blockchain.blockTime() < unlockTime) throw new Revert('Lock period not expired');

    // Accumulate rewards
    const pending = this._calcRewards(staked, stakedAt, this._apyBps(vault));
    const total = SafeMath.add(this.rewardDebt.get(key) || u256.Zero, pending);
    this.rewardDebt.set(key, total);

    const newBalance = SafeMath.sub(staked, amount);
    this.stakedBalance.set(key, newBalance);
    this.stakeTimestamp.set(key, u256.fromU64(Blockchain.blockTime()));
    this._tvl.value = SafeMath.sub(this._tvl.value, amount);

    if (u256.eq(newBalance, u256.Zero)) {
      this._totalStakers.value = SafeMath.sub(this._totalStakers.value, u256.fromU64(1));
    }

    const response = new BytesWriter(32);
    response.writeU256(amount);
    return response;
  }

  // ── Claim Rewards ─────────────────────────────────────────────────────────
  private _claimRewards(calldata: Calldata): BytesWriter {
    this._requireNotPaused();
    const vault: u8 = calldata.readU8();
    const caller = Blockchain.callerAddress();
    const key = this._vaultKey(caller, vault);

    const staked: u256 = this.stakedBalance.get(key) || u256.Zero;
    const stakedAt: u64 = u64((this.stakeTimestamp.get(key) || u256.Zero).toU64());
    const accrued = this._calcRewards(staked, stakedAt, this._apyBps(vault));
    const debt: u256 = this.rewardDebt.get(key) || u256.Zero;
    const totalReward = SafeMath.add(accrued, debt);

    if (u256.eq(totalReward, u256.Zero)) throw new Revert('No rewards to claim');

    // Reset debt and timestamp
    this.rewardDebt.set(key, u256.Zero);
    this.stakeTimestamp.set(key, u256.fromU64(Blockchain.blockTime()));
    this._totalRewardsDistributed.value = SafeMath.add(this._totalRewardsDistributed.value, totalReward);

    const response = new BytesWriter(32);
    response.writeU256(totalReward);
    return response;
  }

  // ── Toggle Auto-Compound ──────────────────────────────────────────────────
  private _toggleAutoCompound(calldata: Calldata): BytesWriter {
    const vault: u8 = calldata.readU8();
    const caller = Blockchain.callerAddress();
    const key = this._vaultKey(caller, vault);

    const current: u256 = this.autoCompound.get(key) || u256.Zero;
    const newVal = u256.eq(current, u256.Zero) ? u256.fromU64(1) : u256.Zero;
    this.autoCompound.set(key, newVal);

    const response = new BytesWriter(1);
    response.writeU8(u256.eq(newVal, u256.Zero) ? 0 : 1);
    return response;
  }

  // ── Views ─────────────────────────────────────────────────────────────────
  private _getStaked(calldata: Calldata): BytesWriter {
    const vault: u8 = calldata.readU8();
    const addr: Address = calldata.readAddress();
    const key = this._vaultKey(addr, vault);
    const bal: u256 = this.stakedBalance.get(key) || u256.Zero;
    const response = new BytesWriter(32);
    response.writeU256(bal);
    return response;
  }

  private _getPendingRewards(calldata: Calldata): BytesWriter {
    const vault: u8 = calldata.readU8();
    const addr: Address = calldata.readAddress();
    const key = this._vaultKey(addr, vault);
    const staked: u256 = this.stakedBalance.get(key) || u256.Zero;
    const stakedAt: u64 = u64((this.stakeTimestamp.get(key) || u256.Zero).toU64());
    const accrued = this._calcRewards(staked, stakedAt, this._apyBps(vault));
    const debt: u256 = this.rewardDebt.get(key) || u256.Zero;
    const total = SafeMath.add(accrued, debt);
    const response = new BytesWriter(32);
    response.writeU256(total);
    return response;
  }

  private _getTVL(): BytesWriter {
    const response = new BytesWriter(32);
    response.writeU256(this._tvl.value);
    return response;
  }

  private _getProtocolStats(): BytesWriter {
    const response = new BytesWriter(96);
    response.writeU256(this._tvl.value);
    response.writeU256(this._totalStakers.value);
    response.writeU256(this._totalRewardsDistributed.value);
    return response;
  }

  // ── Testnet: Faucet ───────────────────────────────────────────────────────
  private _claimTestTokens(): BytesWriter {
    // On testnet: mint 1000 PILL tokens to caller (simulated)
    const faucetAmount = u256.fromU64(1000_000_000_000); // 1000 PILL (8 decimals)
    const response = new BytesWriter(32);
    response.writeU256(faucetAmount);
    return response;
  }
}
