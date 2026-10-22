#!/bin/sh
set -eu

label="com.jetcar.streamdek"
agent_path="$HOME/Library/LaunchAgents/$label.plist"

launchctl bootout "gui/$(id -u)/$label" 2>/dev/null || true
rm -f "$agent_path"
echo "Streamdek is stopped and removed from macOS startup."
