# CVAT Development Guide

## Quick Start

### 1. First Time Setup (One Time Only)
```bash
# Install Docker 26.0+ and create network
docker network create cvat 2>/dev/null || true

# Make scripts executable
chmod +x scripts/dev-*.sh

# Full clean start
./scripts/dev-clean-start.sh
```

**Wait 30-60 seconds** for all services to initialize, then visit http://localhost

### 2. After Making Code Changes

#### For Frontend Changes Only (TypeScript/React in `cvat-ui/src/`)
In this Docker setup, the UI is served from a built static Docker image.
That means frontend source changes do not appear until `cvat_ui` is rebuilt.

To rebuild the UI and reload the container:
```bash
./scripts/dev-rebuild-ui.sh
```

#### For Backend Changes (Python in `cvat/` or workers)
```bash
./scripts/dev-clean-start.sh
```

#### If You're Unsure or Changes Don't Appear
```bash
# Nuclear option - complete fresh start
./scripts/dev-clean-start.sh
```

---

## Scripts Reference

### `./scripts/dev-clean-start.sh`
**Use when:**
- First time setting up
- After backend Python code changes
- After dependency updates (`requirements.txt`, `package.json`)
- When you suspect stale containers
- When "nothing works anymore" happens

**What it does:**
1. Stops all CVAT containers
2. Removes CVAT images and lingering containers
3. Creates the cvat network
4. Rebuilds the backend image
5. Starts all services
6. Waits for initialization

**Duration:** 3-5 minutes

### `./scripts/dev-hot-reload.sh`
**Use when:**
- You need to quickly restart services without rebuilding images
- You want a fresh container restart after config changes

**What it does:**
1. Stops all containers (keeps images)
2. Restarts them immediately

**Duration:** 10-15 seconds

### `./scripts/dev-rebuild-ui.sh`
**Use when:**
- You changed UI source files under `cvat-ui/src/`
- You need the frontend change to appear in the browser

**What it does:**
1. Builds the `cvat_ui` Docker image
2. Recreates only the `cvat_ui` container
3. Keeps all other services running

**Duration:** 1-3 minutes depending on cache

### `./scripts/dev-stop.sh`
**Use when:**
- You want to pause development without removing containers
- You want to free up system resources
- Debugging: want to inspect a stopped container

### `./scripts/dev-logs.sh`
**Use to:**
- See what services are doing
- Debug connection issues
- Find error messages

**Examples:**
```bash
./scripts/dev-logs.sh                    # All logs
./scripts/dev-logs.sh cvat_server        # Backend only
./scripts/dev-logs.sh -f cvat_server     # Follow backend logs
./scripts/dev-logs.sh cvat_db            # Database logs
```

---

## Service Endpoints

| Service | URL | Notes |
|---------|-----|-------|
| Frontend (UI) | http://localhost | React SPA with webpack dev server |
| Backend API | http://localhost/api | Behind nginx proxy |
| Direct API | http://localhost:7000 | If you need direct backend access |
| Postgres | localhost:5432 | From host machine only |
| Redis (in-memory) | Internal only | For caching |
| Redis (on-disk) | Internal only | For task persistence |
| Nuclio Dashboard | http://localhost:8070 | Serverless functions |

---

## Troubleshooting

### "Changes don't appear in UI"
1. Check frontend is actually running:
   ```bash
   ./scripts/dev-logs.sh | grep -i webpack
   ```
2. Clear browser cache: Ctrl+Shift+Del (or Cmd+Shift+Del on Mac)
3. Restart just the frontend:
   ```bash
   ./scripts/dev-hot-reload.sh
   ```

### "Backend API returns errors"
1. Check backend logs:
   ```bash
   ./scripts/dev-logs.sh cvat_server
   ```
2. Check database is running:
   ```bash
   ./scripts/dev-logs.sh cvat_db
   ```
3. Full restart:
   ```bash
   ./scripts/dev-clean-start.sh
   ```

### "Port 80 already in use"
```bash
# Find what's using port 80
sudo lsof -i :80

# Stop CVAT and try again
./scripts/dev-stop.sh
```

### "Out of disk space"
Docker images and volumes can accumulate. Clean up:
```bash
# Stop CVAT first
./scripts/dev-stop.sh

# Remove unused Docker data
docker system prune -a --volumes -f

# Then restart
./scripts/dev-clean-start.sh
```

### "Multiple CVAT instances running"
Check active containers:
```bash
docker ps | grep cvat

# Kill specific container if needed
docker kill <container-id>

# Clean and restart
./scripts/dev-clean-start.sh
```

---

## Testing Your Change

Here's how to verify your "Task -> Tosk" button change:

1. **Start fresh:**
   ```bash
   ./scripts/dev-clean-start.sh
   ```

2. **Wait for initialization** (60 seconds)

3. **Visit http://localhost** and log in

4. **Find the button** in the header - you should see "Tosk" instead of "Task"

5. **If you don't see it:**
   ```bash
   ./scripts/dev-logs.sh -f | grep -i webpack
   # Look for compilation errors
   ```

---

## Development Workflow Best Practices

### When Making Multiple Changes
```bash
# 1. Start fresh
./scripts/dev-clean-start.sh

# 2. Make frontend changes in cvat-ui/src/
# Rebuild the UI image after changes:
./scripts/dev-rebuild-ui.sh

# 3. If the UI still shows stale content after rebuild:
./scripts/dev-hot-reload.sh

# 4. If major backend changes:
./scripts/dev-clean-start.sh
```

### When Debugging Backend Issues
```bash
# 1. Get exact error
./scripts/dev-logs.sh cvat_server -f

# 2. Fix code in cvat/

# 3. Rebuild and restart
./scripts/dev-clean-start.sh

# 4. Check logs again
./scripts/dev-logs.sh cvat_server -f
```

### When Testing Serverless Functions
```bash
# Nuclio dashboard should be running
# Access at http://localhost:8070

# Check logs
./scripts/dev-logs.sh nuclio -f
```

---

## Moving to Hierarchical Annotations

Once you've confirmed the simple button change works reliably, you have confidence that:
- ✓ Docker deployment is working
- ✓ Frontend changes appear immediately
- ✓ Backend changes require rebuild
- ✓ The development workflow is stable

Then proceed with hierarchical annotation implementation with the same workflow.
