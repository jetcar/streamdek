#!/bin/sh
set -eu

service_dir="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
service_path="$service_dir/streamdek.service"

systemctl --user disable --now streamdek.service 2>/dev/null || true
rm -f "$service_path"
systemctl --user daemon-reload
echo "Streamdek is stopped and removed from Linux startup."
