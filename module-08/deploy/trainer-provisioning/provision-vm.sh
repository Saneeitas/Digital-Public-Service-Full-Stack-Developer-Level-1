#!/bin/bash
# TRAINING TOOL — provisions one team's training VM the way the lab describes it.
# Run once as root:  sudo bash provision-vm.sh team1 team1.training.example
# Run by whoever prepares the practice environment.
set -euo pipefail
TEAM="${1:?team name, e.g. team1}"
HOST="${2:?service address, e.g. team1.training.example}"

id "$TEAM" >/dev/null 2>&1 || useradd --create-home --shell /bin/bash "$TEAM"
usermod -aG adm,systemd-journal "$TEAM"          # may read logs, nothing else

cat > "/etc/sudoers.d/$TEAM" <<EOF
# $TEAM may restart its own service and do nothing else as root.
$TEAM ALL=(root) NOPASSWD: /usr/bin/systemctl restart $TEAM, /usr/bin/systemctl restart $TEAM.service
EOF
chmod 440 "/etc/sudoers.d/$TEAM"
visudo -cf "/etc/sudoers.d/$TEAM" >/dev/null

cat > "/etc/systemd/system/$TEAM.service" <<EOF
[Unit]
Description=$TEAM citizen service
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
Type=simple
User=$TEAM
Group=$TEAM
WorkingDirectory=/home/$TEAM/app
EnvironmentFile=/home/$TEAM/app/.env
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=1
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

cat > "/etc/nginx/sites-available/$TEAM" <<EOF
# Team site — managed by the trainer. Do not edit.
server {
    listen 80;
    server_name $HOST;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 30s;
    }
}
EOF
rm -f /etc/nginx/sites-enabled/default
ln -sf "/etc/nginx/sites-available/$TEAM" "/etc/nginx/sites-enabled/$TEAM"
nginx -t

systemctl daemon-reload
systemctl enable "$TEAM.service"
systemctl enable nginx
systemctl restart nginx
echo "provisioned $TEAM at $HOST"
