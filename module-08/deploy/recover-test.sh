#!/bin/bash
# Kills the service process, then measures how long /health takes to answer 200.
# Change SERVICE if your team name is not team1.
SERVICE=team1

PID=$(systemctl show -p MainPID --value "$SERVICE")
echo "Killing process $PID"
kill -9 "$PID"

start=$(date +%s.%N)
recovered=no
for i in $(seq 1 100); do
  if curl -sf -o /dev/null http://localhost/health; then
    recovered=yes
    break
  fi
  sleep 0.1
done
end=$(date +%s.%N)

if [ "$recovered" = yes ]; then
  awk -v s="$start" -v e="$end" \
    'BEGIN { printf "Health returned 200 after %.1f seconds\n", e - s }'
  echo "New process: $(systemctl show -p MainPID --value "$SERVICE")"
else
  echo "NOT recovered within 10 seconds"
  exit 1
fi
