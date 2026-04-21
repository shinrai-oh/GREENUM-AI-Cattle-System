#define MyAppName "牛群监控系统"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Cattle Monitoring"

[Setup]
AppName={#MyAppName}
AppVersion={#MyAppVersion}
DefaultDirName={pf}\Cattle-Monitoring
DefaultGroupName={#MyAppName}
PrivilegesRequired=admin
DisableDirPage=no
DisableProgramGroupPage=no
ArchitecturesInstallIn64BitMode=x64
Compression=lzma
SolidCompression=yes
OutputDir=.
OutputBaseFilename=cattle-monitoring-setup
UsePreviousAppDir=yes

[Languages]
Name: "chinesesimplified"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "..\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion
; 排除不必要的目录
Source: "..\windows-installer\install.ps1"; DestDir: "{app}\windows-installer"; Flags: ignoreversion
Source: "..\windows-installer\uninstall.ps1"; DestDir: "{app}\windows-installer"; Flags: ignoreversion

[Icons]
Name: "{group}\启动系统"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\start-windows.ps1"""; WorkingDir: "{app}"
Name: "{group}\停止系统"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\stop-windows.ps1"""; WorkingDir: "{app}"
Name: "{group}\系统健康检查"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\check-system-health.ps1"""; WorkingDir: "{app}"
Name: "{commondesktop}\牛群监控系统"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\start-windows.ps1"""; WorkingDir: "{app}"

[Run]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\windows-installer\install.ps1"" -StartNow -CreateShortcuts"; Flags: postinstall runhidden; Description: "安装完成后立即启动系统"
