#!/usr/bin/env bash
set -euo pipefail

# Helper to manage goal runners for the opencode agent.
# Usage:
#   goal.sh start --purpose NAME --interval 5m --prompt 'check deploy' --until 'healthy' [--max_attempts 10] [--timeout 1h]
#   goal.sh stop --purpose NAME
#   goal.sh status --purpose NAME

PIDDIR=/tmp
OUTDIR=/tmp

usage(){
  cat <<EOF
Usage: $0 start|stop|status --purpose NAME [--interval 5m] --prompt '...' [--until '...'] [--max_attempts N] [--timeout 1h]

Commands:
  start   Start a background goal runner that emits AGENT_GOAL_TICK_<purpose> JSON lines every interval
  stop    Stop a running goal runner for the purpose
  status  Show status for a purpose

Examples:
  $0 start --purpose deploy --interval 5m --prompt "check deploy status" --until "healthy"
  $0 stop --purpose deploy
  $0 status --purpose deploy
EOF
}

parse_duration(){
  local v="$1"
  if [[ -z "$v" ]]; then
    echo 60
    return
  fi
  if [[ "$v" =~ ^([0-9]+)(s|m|h|d)$ ]]; then
    local n=${BASH_REMATCH[1]}
    local u=${BASH_REMATCH[2]}
    case "$u" in
      s) echo $((n)) ;;
      m) echo $((n*60)) ;;
      h) echo $((n*3600)) ;;
      d) echo $((n*86400)) ;;
    esac
  else
    if [[ "$v" =~ ^[0-9]+$ ]]; then
      echo "$v"
    else
      echo 60
    fi
  fi
}

is_running(){
  local pid=$1
  if [[ -z "$pid" ]]; then return 1; fi
  if ps -p "$pid" > /dev/null 2>&1; then
    return 0
  else
    return 1
  fi
}

cmd="$1"; shift || true
PURPOSE=""
INTERVAL=""
PROMPT=""
UNTIL=""
MAX_ATTEMPTS=""
TIMEOUT=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --purpose) PURPOSE="$2"; shift 2 ;;
    --interval) INTERVAL="$2"; shift 2 ;;
    --prompt) PROMPT="$2"; shift 2 ;;
    --until) UNTIL="$2"; shift 2 ;;
    --max_attempts) MAX_ATTEMPTS="$2"; shift 2 ;;
    --timeout) TIMEOUT="$2"; shift 2 ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Unknown arg: $1"; usage; exit 2 ;;
  esac
done

if [[ -z "$PURPOSE" ]]; then
  echo "--purpose is required" >&2
  usage
  exit 2
fi

PIDFILE="$PIDDIR/opencode-goal-${PURPOSE}.pid"
METAFILE="$PIDDIR/opencode-goal-${PURPOSE}.meta"
OUTFILE="$OUTDIR/opencode-goal-${PURPOSE}.log"
SCRIPT="$OUTDIR/opencode-goal-${PURPOSE}.sh"

case "$cmd" in
  start)
    if [[ -f "$PIDFILE" ]]; then
      pid=$(cat "$PIDFILE" 2>/dev/null || true)
      if is_running "$pid"; then
        echo "Goal runner for '$PURPOSE' already running (pid $pid)." >&2
        exit 1
      else
        echo "Removing stale pidfile $PIDFILE" >&2
        rm -f "$PIDFILE"
      fi
    fi

    if [[ -z "$PROMPT" ]]; then
      echo "--prompt is required for start" >&2
      usage
      exit 2
    fi
    if [[ -z "$INTERVAL" ]]; then INTERVAL="5m"; fi
    SECS=$(parse_duration "$INTERVAL")

    # Create runner script
    cat > "$SCRIPT" <<EOF
#!/usr/bin/env bash
set -euo pipefail
PROMPT='$PROMPT'
UNTIL='$UNTIL'
MAX_ATTEMPTS=${MAX_ATTEMPTS:-0}
TIMEOUT_SECS=$(parse_duration "$TIMEOUT")
COUNT=0
START_TS=$(date +%s)
while true; do
  COUNT=$((COUNT+1))
  /usr/bin/python3 - <<PY >> "$OUTFILE" 2>&1
import json,sys
res={'prompt': PROMPT, 'attempt': COUNT}
print('AGENT_GOAL_TICK_${PURPOSE} ' + json.dumps(res))
PY
  # Evaluate result heuristically by scanning the log tail for UNTIL (if provided)
  if [[ -n "$UNTIL" ]]; then
    if tail -n 200 "$OUTFILE" | grep -i -E "$UNTIL" >/dev/null 2>&1; then
      /usr/bin/python3 - <<PY >> "$OUTFILE" 2>&1
import json,sys
print('AGENT_GOAL_REACHED_${PURPOSE} ' + json.dumps({'prompt': PROMPT, 'attempt': COUNT, 'matched': True}))
PY
      exit 0
    fi
  else
    # No explicit until: use heuristic (look for success keywords)
    if tail -n 200 "$OUTFILE" | grep -i -E "success|succeeded|done|passing|healthy|green|0 failures" >/dev/null 2>&1; then
      /usr/bin/python3 - <<PY >> "$OUTFILE" 2>&1
import json,sys
print('AGENT_GOAL_REACHED_${PURPOSE} ' + json.dumps({'prompt': PROMPT, 'attempt': COUNT, 'matched': True, 'heuristic': True}))
PY
      exit 0
    fi
  fi

  # Check max attempts
  if [[ -n "${MAX_ATTEMPTS}" ]] && [[ "$MAX_ATTEMPTS" -gt 0 ]] && [[ "$COUNT" -ge "$MAX_ATTEMPTS" ]]; then
    /usr/bin/python3 - <<PY >> "$OUTFILE" 2>&1
import json,sys
print('AGENT_GOAL_FAILED_${PURPOSE} ' + json.dumps({'prompt': PROMPT, 'attempts': COUNT, 'reason': 'max_attempts'}))
PY
    exit 2
  fi

  # Check timeout
  if [[ -n "${TIMEOUT}" ]] && [[ "$TIMEOUT" != "" ]]; then
    NOW_TS=$(date +%s)
    ELAPSED=$((NOW_TS-START_TS))
    if [[ "$ELAPSED" -ge $(( $(parse_duration "$TIMEOUT") )) ]]; then
      /usr/bin/python3 - <<PY >> "$OUTFILE" 2>&1
import json,sys
print('AGENT_GOAL_FAILED_${PURPOSE} ' + json.dumps({'prompt': PROMPT, 'attempts': COUNT, 'reason': 'timeout'}))
PY
      exit 2
    fi
  fi

  sleep $SECS
  # continue loop
done
EOF
    chmod +x "$SCRIPT" || true

    # Save metadata
    /usr/bin/python3 - <<PY > "$METAFILE"
import json
meta={
  'purpose': '${PURPOSE}',
  'interval': '${INTERVAL}',
  'interval_seconds': ${SECS},
  'prompt': ${json.dumps(PROMPT)},
  'until': ${json.dumps(UNTIL)},
  'max_attempts': ${json.dumps(MAX_ATTEMPTS)},
  'timeout': ${json.dumps(TIMEOUT)}
}
print(json.dumps(meta))
PY

    nohup bash "$SCRIPT" >> "$OUTFILE" 2>&1 &
    pid=$!
    echo $pid > "$PIDFILE"

    sleep 0.5
    if is_running "$pid"; then
      echo "Started goal runner '$PURPOSE' (pid $pid), interval ${INTERVAL} (${SECS}s). Log: $OUTFILE"
      echo "PIDFILE: $PIDFILE META: $METAFILE"
      exit 0
    else
      echo "Failed to start goal runner for '$PURPOSE'. Check $OUTFILE" >&2
      rm -f "$PIDFILE"
      exit 1
    fi
    ;;

  stop)
    if [[ ! -f "$PIDFILE" ]]; then
      echo "No pidfile for '$PURPOSE' ($PIDFILE). Not running?" >&2
      exit 1
    fi
    pid=$(cat "$PIDFILE")
    if is_running "$pid"; then
      kill "$pid" || true
      sleep 0.2
      if is_running "$pid"; then
        kill -9 "$pid" || true
      fi
      echo "Stopped goal runner '$PURPOSE' (pid $pid)."
    else
      echo "Process $pid not running; removing pidfile." >&2
    fi
    rm -f "$PIDFILE" "$SCRIPT" || true
    exit 0
    ;;

  status)
    if [[ -f "$PIDFILE" ]]; then
      pid=$(cat "$PIDFILE" 2>/dev/null || true)
      if is_running "$pid"; then
        echo "Running: pid=$pid"
      else
        echo "Stale pidfile (pid $pid not running)"
      fi
    else
      echo "Not running (no pidfile)."
    fi
    if [[ -f "$METAFILE" ]]; then
      echo "Metadata:"; cat "$METAFILE"
    fi
    echo "Log: $OUTFILE"
    exit 0
    ;;

  *)
    usage
    exit 2
    ;;
esac
