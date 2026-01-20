
# AI Team – React / Next.js (Cloud-only, Export-ready)

This repository represents a **multi-agent AI team** for working on React and Next.js projects.

The system's goals are:

* to **analyze JIRA tasks and Figma designs**
* to **maximize reuse of existing code**
* to **minimize refactoring and risk**
* to enable a **controlled, repeatable AI workflow**

The system is designed to work **100% in the cloud** today, and can be switched to **hybrid or local** setup tomorrow without refactoring.

---


## 🧠 Concept (in short)

The AI team has a clear hierarchy and responsibilities:

```
Skipper
  |
Kowalski
  |
Rico
  |
Soldiers
  |
Melman
```

* **Skipper** – orchestration and decisions
* **Kowalski** – analysis and solution proposals
* **Rico** – existing code research
* **Soldiers** – implementation
* **Melman** – QA / verification and guardrails

---


## 📁 Project Structure

```
ai-team/
├── agents/              # Agent definitions (roles, rules)
│   ├── Skipper.yaml
│   ├── Kowalski.yaml
│   ├── rico.yaml
│   ├── private.yaml
│   └── melman.yaml
│
├── workflows/           # Step orchestration
│   └── jira_figma_to_code.yaml
│
├── models/              # CENTRAL place for models
│   └── models.yaml
│
├── rules/               # Rules and guardrails
│   ├── guardrails.md
│   ├── protected-areas.md
│   └── react-next-rules.md
│
├── inputs/              # Input data
│   ├── jira-task.md
│   └── figma-notes.md
│
└── README.md
```

---


## 🤖 Agents (who does what)

### 🧠 Skipper – Orchestrator

* Understands JIRA + Figma
* Delegates tasks
* Makes final decisions
* **Does not write code**

### 🧪 Kowalski – Analyst

* Analyzes requirements
* Proposes multiple solutions (A/B/C)
* Risk assessment
* **Does not write code**

### 🕵️ Rico – Code Researcher

* Reviews the existing repo
* Finds components, hooks, patterns
* Detects **App Router vs Pages Router**
* **Does not make decisions**

### 🧑‍💻 Soldiers – Coders

* Implement exactly what Skipper instructs
* Minimal changes
* No refactoring

### 🧪 Melman – QA / Verifier


* Reviews changes
* Checks JIRA requirements
* Checks guardrails
* Can mark a **BLOCKER**

---


## 🔧 Models – where and how to configure

📌 **All models are configured exclusively in one file:**

```
models/models.yaml
```

Agents **never know** which model they are using.
Models are mapped by role.

### Current cloud-only setup

```yaml
mode: cloud-only

models:
  Skipper:
    provider: openai
    model: gpt-4.1

  Kowalski:
    provider: openai
    model: gpt-4.1

  rico:
    provider: openai
    model: gpt-4.1-mini

  vojnik_strong:
    provider: openai
    model: gpt-4.1

  vojnik_fast:
    provider: openai
    model: gpt-4.1-mini

  melman:
    provider: openai
    model: gpt-4.1-mini
```

---


## 🔁 Fallback models (IMPORTANT)

Fallback models are used for:

* API errors
* rate-limit
* timeout
* temporary quality degradation

### Rule

* **The workflow is never interrupted**
* If the primary model fails → fallback is used

### Example with fallback configuration

```yaml
models:
  Skipper:
    provider: openai
    model: gpt-4.1
    fallback:
      provider: openai
      model: gpt-4.1-mini

  Kowalski:
    provider: openai
    model: gpt-4.1
    fallback:
      provider: openai
      model: gpt-4.1-mini

  rico:
    provider: openai
    model: gpt-4.1-mini
    fallback:
      provider: openai
      model: gpt-4.1-mini

  vojnik_strong:
    provider: openai
    model: gpt-4.1
    fallback:
      provider: openai
      model: gpt-4.1-mini

  melman:
    provider: openai
    model: gpt-4.1-mini
    fallback:
      provider: openai
      model: gpt-4.1-mini
```


Fallback model:

* must be **role-compatible**
* can be weaker, but more stable

Skipper always receives information that fallback was used.

---


## 🔒 Guardrails (security)

AI agents are forbidden from touching:

* auth / permissions
* payments / billing
* env variables
* CI/CD
* database migrations
* core API contracts

Details can be found in:

```
rules/guardrails.md
rules/protected-areas.md
```

If violated → **Melman blocks the merge**.

---


## ▶️ How to use (quick start)

1. Add a JIRA task:

```
inputs/jira-task.md
```

2. Add Figma notes:

```
inputs/figma-notes.md
```

3. Check / configure models:

```
models/models.yaml
```

4. Run the workflow via OpenCode or a custom runner

---


## 🎯 Why this is good

* no AI chaos
* no refactor disasters
* everything is controlled
* easy to change vendor
* enterprise-ready

---


## 🔮 Next steps

* local / hybrid models
* Test-Private agent
* automatic PR generator
* audit log

---

**This is not a chatbot.**

This is an **AI development team as a software system**.
