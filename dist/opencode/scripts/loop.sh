#!/usr/bin/env bash
set -euo pipefail

# Helper to manage background loop senders for the opencode agent.
# Usage:
#   loop.sh start --purpose NAME --interval 5m --prompt 'check deploy'
#   loop.sh stop --purpose NAME
#   loop.sh status --purpose NAME

PIDDIR=/tmp
OUTDIR=/tmp

usage(){
  cat <<EOF
Usage: $0 start|stop|status --purpose NAME [--interval 5m] [--prompt '...']

Commands:
  start   Start a background loop that emits AGENT_LOOP_TICK_<purpose> JSON lines every interval
  stop    Stop a running loop for the purpose
  status  Show status for a purpose

Examples:
  $0 start --purpose deploy --interval 5m --prompt "check deploy status"
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
    # try to accept plain seconds
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

while [[ $# -gt 0 ]]; do
  case "$1" in
    --purpose) PURPOSE="$2"; shift 2 ;;
    --interval) INTERVAL="$2"; shift 2 ;;
    --prompt) PROMPT="$2"; shift 2 ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Unknown arg: $1"; usage; exit 2 ;;
  esac
done

if [[ -z "$PURPOSE" ]]; then
  echo "--purpose is required" >&2
  usage
  exit 2
fi

PIDFILE="$PIDDIR/opencode-loop-${PURPOSE}.pid"
METAFILE="$PIDDIR/opencode-loop-${PURPOSE}.meta"
OUTFILE="$OUTDIR/opencode-loop-${PURPOSE}.log"
SCRIPT="$OUTDIR/opencode-loop-${PURPOSE}.sh"

case "$cmd" in
  start)
    if [[ -f "$PIDFILE" ]]; then
      pid=$(cat "$PIDFILE" 2>/dev/null || true)
      if is_running "$pid"; then
        echo "Loop for '$PURPOSE' already running (pid $pid)." >&2
        exit 1
      else
        echo "Removing stale pidfile $PIDFILE" >&2
        rm -f "$PIDFILE"
      fi
    fi

    if [[ -z "$INTERVAL" ]]; then INTERVAL="5m"; fi
    if [[ -z "$PROMPT" ]]; then
      echo "--prompt is required for start" >&2
      usage
      exit 2
    fi

    SECS=$(parse_duration "$INTERVAL")

    cat > "$SCRIPT" <<EOF
#!/usr/bin/env bash
set -euo pipefail
PROMPT="\"\"" # placeholder, we won't use here
while true; do
  sleep $SECS
  /usr/bin/python3 -c "import json,sys; print('AGENT_LOOP_TICK_${PURPOSE} ' + json.dumps(sys.argv[1]))" "\$1"
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
  'prompt': ${json.dumps(PROMPT)}
}
print(json.dumps(meta))
PY

    # Start the background script with the prompt as argv
    nohup bash "$SCRIPT" "$PROMPT" >> "$OUTFILE" 2>&1 &
    pid=$!
    echo $pid > "$PIDFILE"

    # Smoke-check
    sleep 0.5
    if is_running "$pid"; then
      # Emit an immediate startup tick so the agent can run the prompt once immediately
      /usr/bin/python3 -c "import json,sys; print('AGENT_LOOP_TICK_${PURPOSE} ' + json.dumps({'prompt': sys.argv[1], 'startup': True}))" "$PROMPT" >> "$OUTFILE" 2>&1 || true
      echo "Started loop '$PURPOSE' (pid $pid), interval ${INTERVAL} (${SECS}s). Log: $OUTFILE"
      echo "PIDFILE: $PIDFILE META: $METAFILE"
      exit 0
    else
      echo "Failed to start loop for '$PURPOSE'. Check $OUTFILE" >&2
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
      echo "Stopped loop '$PURPOSE' (pid $pid)."
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
