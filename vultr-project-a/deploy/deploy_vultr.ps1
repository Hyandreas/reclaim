# Deploy Reclaim to the Vultr instance. Usage: .\deploy_vultr.ps1 -Ip <instance-ip>
param([Parameter(Mandatory = $true)][string]$Ip)

$ErrorActionPreference = 'Stop'
$proj = 'F:\csProj\reclaim\reclaim\vultr-project-a'
$key = "$env:USERPROFILE\.ssh\reclaim_vultr"
$sshOpts = @('-i', $key, '-o', 'StrictHostKeyChecking=accept-new', '-o', 'ConnectTimeout=10')

# 1. Build and pack the app (Vite dist + backend + legacy app/assets + .env), excluding junk
Push-Location $proj
try {
    npm install
    if ($LASTEXITCODE -ne 0) { throw 'npm install failed' }
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'npm run build failed' }
}
finally {
    Pop-Location
}

$stage = Join-Path $env:TEMP 'reclaim-deploy'
if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
New-Item -ItemType Directory -Force $stage | Out-Null
Copy-Item -Recurse "$proj\backend" "$stage\backend"
Copy-Item -Recurse "$proj\app" "$stage\app"
Copy-Item -Recurse "$proj\dist" "$stage\dist"
Copy-Item "$proj\.env" "$stage\.env" -ErrorAction SilentlyContinue
Copy-Item "$proj\docker-compose.yml" "$stage\docker-compose.yml" -ErrorAction SilentlyContinue
Get-ChildItem -Recurse $stage -Directory -Filter '__pycache__' | Remove-Item -Recurse -Force
Get-ChildItem -Recurse $stage -Directory -Filter 'var' | Remove-Item -Recurse -Force
$zip = Join-Path $env:TEMP 'reclaim-deploy.zip'
if (Test-Path $zip) { Remove-Item -Force $zip }
Compress-Archive -Path "$stage\*" -DestinationPath $zip

# 2. Ship it
scp @sshOpts $zip "root@${Ip}:/root/reclaim-deploy.zip"
if ($LASTEXITCODE -ne 0) { throw 'scp failed' }

# 3. Install + systemd service (idempotent)
$remote = @'
set -e
apt-get update -qq && apt-get install -y -qq unzip python3 >/dev/null
mkdir -p /opt/reclaim
unzip -oq /root/reclaim-deploy.zip -d /opt/reclaim
cat > /etc/systemd/system/reclaim.service <<'UNIT'
[Unit]
Description=Reclaim SLA credit audit demo
After=network.target
[Service]
WorkingDirectory=/opt/reclaim
Environment=DEPLOYMENT_MODE=vultr
ExecStart=/usr/bin/python3 /opt/reclaim/backend/server.py --host 0.0.0.0 --port 8765
Restart=always
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now reclaim
systemctl restart reclaim
sleep 2
ufw allow 8765/tcp >/dev/null 2>&1 || true
curl -s http://127.0.0.1:8765/health | head -c 400
echo ''
systemctl is-active reclaim
'@
$remote | ssh @sshOpts "root@${Ip}" 'bash -s'
Write-Output "Deployed. Open http://${Ip}:8765/"
