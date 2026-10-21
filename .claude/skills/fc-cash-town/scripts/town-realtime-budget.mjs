#!/usr/bin/env node
// Read-only planning check for the owner's $40/month budget (2026-10-21).
// Does not read credentials, change Billing, or impose a dollar limit.
// Rates: supabase.com/docs/guides/platform/manage-your-usage/realtime-messages
// Keep --base aligned with Upcoming Invoice excluding Realtime, and supply
// other charges/tax explicitly. Historical messages under Spend Cap are NOT
// automatically treated as billable overage by this calculator.
//
// node town-realtime-budget.mjs --base 31.03 --projected-messages 4000000
// node town-realtime-budget.mjs --base 31.03 --billable-overage 18321325 --spend-cap off
const args = process.argv.slice(2);
const value = (name, fallback) => { const i = args.indexOf(`--${name}`); return i < 0 ? fallback : args[i + 1]; };
const numeric = (name, fallback) => {
  const n = Number(value(name, fallback));
  if (!Number.isFinite(n) || n < 0) throw new Error(`--${name} must be a non-negative number`);
  return n;
};
const budget = numeric('budget', 40), base = numeric('base', 31.03), tax = numeric('tax-rate', 0);
const other = numeric('other-charges', 0), days = numeric('days', 31);
if (!days) throw new Error('--days must be positive');
const projectedMessages = numeric('projected-messages', 4_000_000);
const billableOverage = numeric('billable-overage', 0);
const cap = value('spend-cap', 'on');
if (cap !== 'on' && cap !== 'off') throw new Error('--spend-cap must be on or off');
if (cap === 'on' && billableOverage) throw new Error('Do not assume capped historical usage is billable; verify the invoice before modelling overage with --spend-cap off');
const packages = cap === 'off' ? Math.ceil(billableOverage / 1_000_000) : 0;
const realtime = packages * 2.5;
const total = (base + other + realtime) * (1 + tax);
const result = {
  kind: 'planning scenario, not an invoice or a billing limit',
  budgetUsd: budget, baseEstimateUsd: base, spendCap: cap,
  realtimeTargetMessages: 4_000_000, dailyTargetMessages: Math.floor(4_000_000 / days),
  includedMessages: 5_000_000, projectedMessages,
  billableOverageMessagesExplicitlySupplied: billableOverage, realtimePackages: packages, realtimeEstimateUsd: realtime,
  otherChargesUsd: other, taxRate: tax, totalEstimateUsd: Number(total.toFixed(2)),
  withinBudget: total <= budget,
  restrictionRisk: cap === 'on' && projectedMessages > 5_000_000,
  billingAction: 'Keep Supabase Spend Cap enabled to block covered overage. It does not cap Compute or guarantee a $40 total. Check add-ons and taxes separately.',
};
console.log(JSON.stringify(result, null, 2));
if (!result.withinBudget || result.restrictionRisk) process.exitCode = 2;
