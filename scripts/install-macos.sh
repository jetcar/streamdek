#!/bin/sh
set -eu

if [ "$(uname -s)" != "Darwin" ]; then
  echo "This installer is for macOS." >&2
  exit 1
fi

project_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
node_path=$(command -v node)
label="com.jetcar.streamdek"
agent_dir="$HOME/Library/LaunchAgents"
agent_path="$agent_dir/$label.plist"
state_dir="${STREAMDEK_STATE_DIR:-$HOME/Library/Application Support/streamdek}"

xml_escape() {
  printf '%s' "$1" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g'
}

cd "$project_root"
if [ -d "$project_root/src" ]; then
  npm ci
  npm run build
elif [ -f "$project_root/dist/app.js" ]; then
  npm ci --omit=dev
else
  echo "Neither source files nor a prebuilt release were found." >&2
  exit 1
fi

mkdir -p "$agent_dir" "$state_dir"
escaped_node=$(xml_escape "$node_path")
escaped_app=$(xml_escape "$project_root/dist/app.js")
escaped_root=$(xml_escape "$project_root")
escaped_out=$(xml_escape "$state_dir/launchd.out.log")
escaped_err=$(xml_escape "$state_dir/launchd.err.log")

cat > "$agent_path" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$label</string>
  <key>ProgramArguments</key>
  <array>
    <string>$escaped_node</string>
    <string>$escaped_app</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$escaped_root</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key>
    <false/>
  </dict>
  <key>ProcessType</key>
  <string>Background</string>
  <key>StandardOutPath</key>
  <string>$escaped_out</string>
  <key>StandardErrorPath</key>
  <string>$escaped_err</string>
</dict>
</plist>
EOF

chmod 600 "$agent_path"
launchctl bootout "gui/$(id -u)/$label" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$agent_path"
launchctl kickstart -k "gui/$(id -u)/$label"
echo "Streamdek is installed and running."
