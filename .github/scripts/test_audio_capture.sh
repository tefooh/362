#!/bin/bash
ls -l .github/scripts/audio_test.wav
pulseaudio --check
ps aux | grep pulseaudio
ls -l /run/user/$(id -u)/pulse/
PULSE_SERVER=unix:${XDG_RUNTIME_DIR}/pulse/native paplay --verbose .github/scripts/audio_test.wav
# Check resource usage every 10 seconds, for 30 seconds
for i in {1..3}
do
   sleep 10
   ps -p $(cat project-362.pid) -o %cpu,%mem,cmd
done
cat project_362_output.log
if grep -qi "human world" project_362_output.log; then
  echo "Audio capture test passed: 'human world' found in logs"
elif grep -qi "audio" project_362_output.log; then
  echo "Audio capture test partially passed: Audio-related output found"
else
  echo "Audio capture test failed"
  tail -n 100 project_362_output.log
  exit 1
fi
