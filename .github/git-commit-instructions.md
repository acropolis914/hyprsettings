# 🤖 Git Commit Instructions for AI

Follow these rules when generating commit messages and titles.

---

## 🧾 General Format

Always create a **clear, well-structured commit message**:

### **Title**

- Format:
  ```
  <emoji> <type>: <short summary>
  ```
- Keep it concise (50–72 chars ideal)

### **Body (optional but preferred)**

- Explain **what changed and why**
- Use bullet points if multiple changes

---

## 🏷️ Commit Types

Use standard prefixes:

- ✨ `feat:` → New features
- 🐛 `fix:` → Bug fixes
- ♻️ `refactor:` → Code changes without behavior change
- ⚡ `perf:` → Performance improvements
- 📝 `docs:` → Documentation only
- 🎨 `style:` → Formatting / linting
- 🔧 `chore:` → Maintenance / tooling
- 🚀 `build:` → Build-related changes
- 🧪 `test:` → Tests

---

## 📁 Special Rules by Folder

### 1. `src/hyprland-wiki-content`

If changes come from this folder:

- Read the `.version` file inside it
- Include this in the commit message:

```
📚 docs: update hyprland wiki content to v<version>

- Wiki content has been updated to version <version>
```

---

### 2. `src/ui`

- These are **build outputs**
- Do **NOT analyze or describe changes**
- Always treat as:

```
🚀 build: update UI build output

- Regenerated UI assets from latest source
```

---

### 3. Other Changes

If changes are **outside `src/`**:

- Treat them as **tooling or miscellaneous**

Examples:

```
🔧 chore: update tooling configuration

- Adjusted config for development tools
```

or

```
🧰 chore: miscellaneous project updates

- Minor non-source changes
```

---

## 🧠 Best Practices

- Never leave commit messages empty or vague
- Avoid generic titles like `update` or `changes`
- Prefer **specific intent over file listing**
- Group related changes into one commit when possible
- If multiple categories apply, prioritize:
    1. `feat` / `fix`
    2. `refactor`
    3. `build` / `chore`

---

## ✅ Example Commits

### Feature

```
✨ feat: add websocket reconnect logic

- Automatically retries connection on failure
- Improves reliability in unstable networks
```

### Fix

```
🐛 fix: prevent null crash in parser

- Added guard for undefined input
```

### Wiki Update

```
📚 docs: update hyprland wiki content to v1.4.2

- Wiki content has been updated to version 1.4.2
```

### Build Output

```
🚀 build: update UI build output

- Regenerated UI assets from latest source
```

