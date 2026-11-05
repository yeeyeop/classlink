@echo off
setlocal
chcp 65001 >nul

net session >nul 2>&1
if errorlevel 1 (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "$name = 'CLASSLINK LAN 3000'; $rule = Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue; if (-not $rule) { New-NetFirewallRule -DisplayName $name -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -RemoteAddress LocalSubnet -Profile Any | Out-Null }; Write-Host 'CLASSLINK LAN firewall rule is ready.'"

if errorlevel 1 (
  echo Failed to create the firewall rule.
) else (
  echo Windows Firewall now allows CLASSLINK on TCP port 3000 from the local subnet.
)

pause
endlocal
