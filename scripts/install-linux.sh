#!/bin/sh
set -eu

if [ "$(uname -s)" != "Linux" ]; then
  echo "This installer is for Linux." >&2
  exit 1
fi

project_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
node_path=$(command -v node)
service_dir="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
service_path="$service_dir/streamdek.service"
rules_source="$project_root/scripts/50-elgato-stream-deck-user.rules"
rules_target="/etc/udev/rules.d/50-elgato-stream-deck-user.rules"

cd "$project_root"
npm ci
npm run build

if ! command -v systemctl >/dev/null 2>&1; then
  echo "systemd is required for automatic startup." >&2
  exit 1
fi

if [ ! -f "$rules_target" ] || ! cmp -s "$rules_source" "$rules_target"; then
  sudo install -m 0644 "$rules_source" "$rules_target"
  sudo udevadm control --reload-rules
  echo "Stream Deck permissions installed. Unplug and reconnect the device once."
fi

mkdir -p "$service_dir"
escaped_node=$(printf '%s' "$node_path" | sed 's/\\/\\\\/g; s/"/\\"/g')
escaped_app=$(printf '%s' "$project_root/dist/app.js" | sed 's/\\/\\\\/g; s/"/\\"/g')
escaped_root=$(printf '%s' "$project_root" | sed 's/\\/\\\\/g; s/"/\\"/g')

cat > "$service_path" <<EOF
[Unit]
Description=Streamdek Codex status display

[Service]
Type=simple
ExecStart="$escaped_node" "$escaped_app"
WorkingDirectory="$escaped_root"
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now streamdek.service
echo "Streamdek is installed and running."
