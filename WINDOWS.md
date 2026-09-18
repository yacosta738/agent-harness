# Windows Compatibility

This harness is designed for macOS and Linux. Windows requires extra setup.

## Quick Summary

| Script | Language | Windows Support |
|--------|----------|----------------|
| `deploy.sh` | Bash | Requires WSL, Git Bash, or Cygwin |
| `check-refs.py` | Python 3 | Works if Python is installed |
| `generate-bundle.mjs` | Node.js | Works if Node.js is installed |

## Option 1: WSL 2 (Recommended)

Windows Subsystem for Linux provides the best experience.

### Setup

1. **Enable WSL 2** (run in PowerShell as Admin):
   ```powershell
   wsl --install
   ```

2. **Restart your machine** when prompted.

3. **Clone the repo inside WSL** (not in `/mnt/c/`):
   ```bash
   git clone https://github.com/your-org/agent-harness.git ~/agent-harness
   cd ~/agent-harness
   ```

4. **Install dependencies inside WSL**:
   ```bash
   sudo apt update
   sudo apt install python3 nodejs npm git
   ```

5. **Run the deploy script**:
   ```bash
   bash scripts/deploy.sh --preset recommended --output dist/opencode
   ```

### Why clone inside WSL?

WSL filesystem performance is significantly better for the tools inside it. Accessing Windows files (`/mnt/c/`) from WSL works but is slower.

## Option 2: Git Bash

Git for Windows includes Git Bash, which can run most bash scripts.

### Setup

1. **Install Git for Windows**: https://git-scm.com/download/win

2. **Clone the repo** in your preferred directory.

3. **Install Python 3**: https://www.python.org/downloads/windows/

4. **Install Node.js**: https://nodejs.org/ (LTS recommended)

5. **Run with Git Bash**:
   ```bash
   git bash scripts/deploy.sh --preset recommended --output dist/opencode
   ```

### Known Limitations with Git Bash

- `set -euo pipefail` in `deploy.sh` may behave differently
- Some bash builtins may not be available
- Python scripts work, but paths must use forward slashes or be converted

## Option 3: Cygwin

Cygwin provides a POSIX-compatible layer on Windows.

### Setup

1. **Install Cygwin**: https://www.cygwin.com/

2. **Install packages**: `python3`, `nodejs`, `git`, `bash`

3. **Run scripts from Cygwin terminal**.

## Option 4: Docker

If Docker is available, you could containerize the harness.

### Minimal Dockerfile Example

```dockerfile
FROM node:20-slim

RUN apt-get update && apt-get install -y python3 git bash

WORKDIR /app
COPY . /app

RUN bash scripts/deploy.sh --preset recommended --output dist/opencode

CMD ["bash"]
```

Build and run:
```bash
docker build -t agent-harness .
docker run -it agent-harness
```

## Dependencies Checklist

Before running any script, verify you have:

- [ ] **Python 3.8+**: `python3 --version`
- [ ] **Node.js 18+**: `node --version`
- [ ] **Bash 4+**: `bash --version` (or WSL bash)

## Common Issues on Windows

### Python not found

Add Python to your PATH, or use:
```bash
py -3 scripts/check-refs.py --root dist/opencode
```

### Paths with spaces

If your Windows username has spaces (e.g., `C:\Users\Juan Perez\`), either:
- Create a Windows local user without spaces
- Clone to a path without spaces like `D:\dev\agent-harness`
- Use WSL where paths don't have spaces

### Permission denied (deploy.sh)

Run Git Bash as Administrator, or in WSL use:
```bash
chmod +x scripts/deploy.sh
```

## Testing Your Setup

```bash
# Verify Python
python3 scripts/check-refs.py

# Verify Node
node scripts/generate-bundle.mjs list --preset recommended

# Full render
bash scripts/deploy.sh --preset recommended --output dist/opencode
```

If all three commands succeed, you're ready to deploy with dotter.

## Next Step: Deploy

After setup, follow the [README.md](README.md#deployment) deployment instructions:

```bash
scripts/deploy.sh --preset recommended --output dist/opencode
# Then run: dotter deploy
```
