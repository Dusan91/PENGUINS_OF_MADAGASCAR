# Audit Log – AI Team

The audit log provides **complete transparency and traceability** of all decisions and actions made by the AI team.

The purpose of the audit log is:

* to always know **who decided what and why**
* to enable **debugging of AI behavior**
* to meet **enterprise / compliance** requirements
* to allow rollback and retrospectives

---

## 📌 Basic Principles

* The audit log is **append-only** (never retroactively changed)
* Every agent leaves a record
* Every decision has a reason (input → output)
* The audit log **does not affect agent behavior** – it only records

---

## 🧠 What is Logged

### 1️⃣ Workflow Information

* workflow name
* start time / end time
* status (SUCCESS / PARTIAL / FAILED)

### 2️⃣ Agent Activities

For each agent:

* agent_name (Skipper, Kowalski, Rico, Private, Melman)
* model (including fallback if used)
* input summary (hash or digest)
* output summary
* timestamp

### 3️⃣ Decisions (Key Part)

Specifically logged:

* Skipper decisions
* Kowalski recommendations
* Melman BLOCKER decisions

### 4️⃣ Guardrails

* whether guardrails were checked
* whether a violation occurred
* which rule was violated

---

## 📄 Record Format (JSONL – recommended)

Each line is one event.

```json
{
  "timestamp": "2026-01-20T10:42:31Z",
  "workflow": "jira_figma_to_code",
  "agent": "Skipper",
  "model": "gpt-4.1",
  "fallback_used": false,
  "action": "DECISION",
  "input_ref": "jira-task.md#hash",
  "output_summary": "Approved solution B, 2 Soldiers assigned",
  "severity": "INFO"
}
```

---

## 🧪 Melman Audit Records

If Melman reports a problem:

```json
{
  "timestamp": "2026-01-20T11:03:10Z",
  "workflow": "jira_figma_to_code",
  "agent": "Melman",
  "model": "gpt-4.1-mini",
  "action": "BLOCKER",
  "details": "Protected file /middleware.ts was modified",
  "severity": "CRITICAL"
}
```

---

## 🔁 Fallback Audit

Every fallback **must be logged**:

```json
{
  "timestamp": "2026-01-20T10:12:02Z",
  "agent": "Kowalski",
  "primary_model": "gpt-4.1",
  "fallback_model": "gpt-4.1-mini",
  "reason": "Rate limit",
  "severity": "WARNING"
}
```

---

## 📁 Recommended Log Location

```
audit/
├── 2026-01-20.jsonl
├── 2026-01-21.jsonl
```

* one file per day
* append-only

---

## 🔐 Security

Audit log:

* does not contain full code
* does not contain secrets (env, tokens)
* can be safely shared within the team

---

## 🎯 Why This Matters

Without an audit log:

* you don't know why the AI did something
* you have no forensics
* you lack enterprise trust

With an audit log:

* AI is a **responsible system**, not a black box

---

## Audit Requirement

On cycle completion, an audit entry must be created:
- type: FINALIZATION
- status: SUCCESS
- message: Smile and wave


**The audit log is a mandatory part of a serious AI team.**
