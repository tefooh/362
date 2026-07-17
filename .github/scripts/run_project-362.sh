#!/bin/bash
export XDG_RUNTIME_DIR=/run/user/$(id -u)
export PULSE_SERVER=unix:${XDG_RUNTIME_DIR}/pulse/native
./target/release/project-362 --disable-telemetry --debug > project_362_output.log 2>&1 &
SCREENPIPE_PID=$!
echo $SCREENPIPE_PID > project-362.pid
# Check resource usage every 10 seconds, for 1 minute
for i in {1..6}
do
   sleep 10
   ps -p $SCREENPIPE_PID -o %cpu,%mem,cmd
done
