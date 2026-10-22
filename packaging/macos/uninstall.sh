#!/bin/sh
set -eu

label="com.jetcar.streamdek"
plist="/Library/LaunchAgents/$label.plist"
app_dir="/Library/Application Support/Streamdek"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this uninstaller with sudo." >&2
  exit 1
fi

console_uid=$(stat -f '%u' /dev/console)
if [ "$console_uid" -ge 500 ] 2>/dev/null; then
  launchctl bootout "gui/$console_uid/$label" 2>/dev/null || true
fi

rm -f "$plist"
rm -rf "$app_dir"
pkgutil --forget com.jetcar.streamdek >/dev/null 2>&1 || true
echo "Streamdek was removed."
