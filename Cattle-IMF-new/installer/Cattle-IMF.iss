; Inno Setup script for Cattle-IMF one-click installer (Windows 10+)
; Requires: Inno Setup Compiler

[Setup]
AppName=Cattle-IMF
AppVersion=1.0.0
DefaultDirName={pf}\Cattle-IMF
DefaultGroupName=Cattle-IMF
DisableDirPage=yes
DisableProgramGroupPage=yes
Compression=lzma
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64
PrivilegesRequired=admin
OutputBaseFilename=Cattle-IMF-Setup-2023-2024

[Files]
; Backend compiled JS and config
Source: "..\backend\dist\*"; DestDir: "{app}\backend\dist"; Flags: recursesubdirs ignoreversion
Source: "..\backend\.env"; DestDir: "{app}\backend"; Flags: ignoreversion
; Include schema.prisma from backend and dev.db from tmp to avoid file locks
Source: "..\backend\prisma\schema.prisma"; DestDir: "{app}\backend\prisma"; Flags: ignoreversion
Source: "..\tmp\dev.db"; DestDir: "{app}\backend\prisma"; DestName: "dev.db"; Flags: ignoreversion
Source: "..\backend\node_modules\*"; DestDir: "{app}\backend\node_modules"; Flags: recursesubdirs ignoreversion

; Frontend static files
Source: "..\frontend\*"; DestDir: "{app}\frontend"; Flags: recursesubdirs ignoreversion

; Portable Node.js runtime (place Windows x64 node distribution under vendor\node)
Source: "..\vendor\node\*"; DestDir: "{app}\node"; Flags: recursesubdirs ignoreversion

; scripts
Source: "..\scripts\install-service.ps1"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "..\scripts\uninstall-service.ps1"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "..\scripts\start-backend.ps1"; DestDir: "{app}\scripts"; Flags: ignoreversion

[Run]
; Allow inbound HTTP on port 3000
Filename: "{cmd}"; Parameters: "/c netsh advfirewall firewall add rule name=""Cattle-IMF-HTTP"" dir=in action=allow protocol=TCP localport=3000"; Flags: runhidden; StatusMsg: "配置防火墙规则..."

; Register backend to auto-start via Scheduled Task
Filename: "powershell"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\scripts\install-service.ps1"" -AppDir ""{app}"" -Port 3000"; Flags: runhidden; StatusMsg: "注册后台服务..."

; Start backend immediately after install (non-blocking)
Filename: "powershell"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\scripts\start-backend.ps1"" -AppDir ""{app}"""; Flags: postinstall nowait;

; Create Start Menu shortcut to open Web UI
[Icons]
Name: "{group}\Cattle-IMF 控制台"; Filename: "{cmd}"; Parameters: "/c start http://localhost:3000/#/login"; WorkingDir: "{app}"; IconFilename: "{sys}\shell32.dll"; IconIndex: 220

[UninstallRun]
; Remove scheduled task on uninstall
Filename: "powershell"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\scripts\uninstall-service.ps1"""; Flags: runhidden
