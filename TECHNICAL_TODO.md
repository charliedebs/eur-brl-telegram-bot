# Technical TODO - Objective Code Analysis

> **Analysis Date**: 2025-11-04
> **Approach**: Static code analysis, no user requirements considered
> **Severity**: 🔴 Critical | 🟡 Important | 🟢 Nice-to-have

---

## 🔴 CRITICAL (Fix Before Production)

### 1. Dead Code Bug: Alert Reference Type 'current'
**File**: `src/jobs/programmed-alerts.js:55-56`
**Issue**: If an alert exists with `reference_type='current'`, it will use the current rate at check-time instead of the frozen rate at creation-time.
**Root Cause**: Code assumes these alerts don't exist, but no validation prevents them.
**Impact**: Alert will never trigger correctly
**Fix**: Add validation to reject or auto-fix these alerts at cron runtime

```javascript
// Line 55-70: Current problematic code
if (alert.reference_type === 'current') {
  refValue = currentRate;  // ❌ WRONG: uses moving target
  threshold = refValue * (1 + alert.threshold_value / 100);
}
```

**Recommended Fix**:
```javascript
if (alert.reference_type === 'current') {
  console.error(`[CRON] Invalid alert ${alert.id}: reference_type='current' should be absolute`);
  continue; // Skip this alert
}
```

---

### 2. No Input Validation on Amounts
**Files**: Multiple locations using `parseFloat()`
**Issue**: User can send negative, zero, or extreme values
**Impact**: Could break calculations or cause API errors

**Examples**:
- `src/bot/index.js:87` - /rate command
- `src/bot/index.js:161` - /convert command
- Multiple callback handlers

**Fix**: Add validation function
```javascript
function validateAmount(amount, min = 1, max = 1000000) {
  if (!amount || !isFinite(amount) || amount < min || amount > max) {
    return null;
  }
  return amount;
}
```

---

### 3. Global Error Handler is French-Only
**File**: `src/bot/index.js:1756`
**Issue**: Error message hardcoded in French
```javascript
bot.catch((err, ctx) => {
  ctx.reply("❌ Une erreur est survenue.").catch(() => {});
});
```

**Fix**: Use msg object
```javascript
bot.catch((err, ctx) => {
  const msg = getMsg(ctx);
  ctx.reply(msg.ERROR_GENERAL || "❌ An error occurred").catch(() => {});
});
```

---

### 4. Empty Documentation Files
**Files**:
- `README.md` (0 bytes)
- `docs/schema.sql` (0 bytes)

**Impact**: Cannot deploy, maintain, or onboard developers
**Priority**: Must have for production

---

## 🟡 IMPORTANT (Production Ready, But Should Fix)

### 5. No Health Check Endpoint
**File**: `src/server.js`
**Current**: Only `GET /` returns `{"status": "ok"}`
**Need**: `GET /health` with actual checks

**Recommended Implementation**:
```javascript
app.get('/health', async (req, res) => {
  const checks = {
    server: 'ok',
    database: 'unknown',
    telegram: 'unknown',
    timestamp: new Date().toISOString()
  };

  // Test DB
  try {
    await db.supabase.from('users').select('id').limit(1);
    checks.database = 'ok';
  } catch (e) {
    checks.database = 'error';
  }

  // Test Telegram
  try {
    await bot.telegram.getMe();
    checks.telegram = 'ok';
  } catch (e) {
    checks.telegram = 'error';
  }

  const allOk = Object.values(checks).every(v => v === 'ok' || typeof v === 'string');
  res.status(allOk ? 200 : 503).json(checks);
});
```

---

### 6. No Rate Limiting
**Issue**: Bot has no protection against spam/abuse
**Impact**: User can send unlimited messages, costing API calls (OpenAI, Wise)

**Recommended Solution**: Use `telegraf-ratelimit`
```javascript
import rateLimit from 'telegraf-ratelimit';

const limitConfig = {
  window: 1000,      // 1 second
  limit: 3,          // 3 messages max
  onLimitExceeded: (ctx) => {
    const msg = getMsg(ctx);
    ctx.reply(msg.RATE_LIMIT_ERROR || '⏱️ Please slow down');
  }
};

bot.use(rateLimit(limitConfig));
```

---

### 7. Missing Environment Variable Validation
**File**: `src/services/nlu.js`, `src/core/nlu.js`
**Issue**: No check if `OPENAI_API_KEY` exists before making calls
**Impact**: Bot starts but NLU silently fails

**Current**:
```javascript
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY  // Could be undefined
});
```

**Fix**: Add validation at startup
```javascript
// src/server.js - Add before bot.launch()
const requiredEnvVars = [
  'TELEGRAM_BOT_TOKEN',
  'SUPABASE_URL',
  'SUPABASE_KEY',
  'OPENAI_API_KEY'
];

for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    console.error(`❌ Missing required env var: ${varName}`);
    process.exit(1);
  }
}
```

---

### 8. Inconsistent Error Messages
**Issue**: Some errors hardcoded in French, not using msg object
**Examples**:
- `src/bot/index.js:474` - "⚠️ Taux crypto indisponibles"
- `src/bot/index.js:562` - "⚠️ Taux indisponibles"
- `src/bot/index.js:590` - "⚠️ Taux indisponibles"

**Fix**: Replace all with `msg.ERROR_RATES_UNAVAILABLE`

---

### 9. No Graceful Shutdown
**File**: `src/server.js:36-37`
**Current**:
```javascript
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
```

**Issue**: Doesn't wait for pending operations
**Fix**: Add graceful shutdown
```javascript
let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n${signal} received, shutting down gracefully...`);

  // Stop accepting new requests
  server.close(() => {
    console.log('HTTP server closed');
  });

  // Stop bot
  await bot.stop(signal);
  console.log('Bot stopped');

  // Give pending operations 5s to complete
  setTimeout(() => {
    console.log('Forcing exit');
    process.exit(0);
  }, 5000);
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
```

---

## 🟢 NICE-TO-HAVE (Quality Improvements)

### 10. Unused File: src/services/nlu.js
**Issue**: File exists but is never imported
**Used Instead**: `src/core/nlu.js`
**Fix**: Delete `src/services/nlu.js` to avoid confusion

---

### 11. No Structured Logging
**Issue**: 196 `console.log/error` statements throughout codebase
**Impact**: Difficult to filter, search, or analyze logs in production

**Recommended**: Use Winston or Pino
```bash
npm install winston
```

```javascript
// src/utils/logger.js
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

Then replace: `console.log(...)` → `logger.info(...)`

---

### 12. No Test Suite
**Issue**: 0 test files, no automated testing
**Impact**: Regressions go unnoticed, hard to refactor confidently

**Recommendation**: Start with critical path tests
- Test rate fetching with mocked APIs
- Test alert threshold calculations
- Test NLU parsing with known inputs

---

### 13. No Database Migration System
**Issue**: Schema changes must be done manually in Supabase
**Risk**: Code/DB version mismatch

**Options**:
- Use Supabase migrations (built-in)
- Use a migration tool (node-pg-migrate, knex)

---

### 14. Incomplete Features (Known)

#### 14a. Pix Payment System
**Status**: Stubbed (shows "coming soon")
**Location**: `src/bot/index.js:845-851`
**Database methods**: Already implemented
**Missing**: Actual payment provider integration

#### 14b. Admin Notifications for FAQ
**Status**: TODO comment at line 1520
**Issue**: User questions are logged but admin is not notified
**Fix**: Send Telegram message to admin user ID when FAQ question received

---

## 📝 Summary

**Must Fix (Blockers)**: 4 issues
**Should Fix (Important)**: 5 issues
**Nice-to-Have (Polish)**: 5 issues

**Estimated Effort**:
- Critical fixes: 2-3 hours
- Important fixes: 4-6 hours
- Nice-to-have: 8-12 hours

---

## 🚀 Prioritization for Launch

**For MVP Launch** (Fix These):
1. ✅ Input validation (#2)
2. ✅ Error message localization (#3, #8)
3. ✅ Empty documentation (#4)
4. ✅ Env var validation (#7)

**For Stable Production** (Fix After Launch):
5. Rate limiting (#6)
6. Health check endpoint (#5)
7. Graceful shutdown (#9)

**For Long-term Quality** (Backlog):
8. Dead code cleanup (#1, #10)
9. Structured logging (#11)
10. Test suite (#12)
11. Complete features (#14)

---

**Last Updated**: 2025-11-04
**Regenerate**: Delete this file and ask Claude to recreate from fresh analysis
