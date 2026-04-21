; Inno Setup Script for TMR Monitoring Installer
#define MyAppName "TMR 饲料配比智能监测系统"
#define MyAppVersion "0.1.0"
#define MyAppPublisher "TMR Monitoring"
#define InstallDirName "{pf64}\TMRMonitoring"

[Setup]
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={#InstallDirName}
DefaultGroupName={#MyAppName}
DisableDirPage=yes
DisableProgramGroupPage=yes
PrivilegesRequired=admin
Compression=lzma
SolidCompression=yes
OutputBaseFilename=TMRMonitoringInstaller

[Languages]
Name: "chinesesimplified"; MessagesFile: "compiler:Default.isl"

[Files]
; Backend files
Source: "..\server\index.js"; DestDir: "{#InstallDirName}\server"; Flags: ignoreversion
Source: "..\server\db.js"; DestDir: "{#InstallDirName}\server"; Flags: ignoreversion
Source: "..\server\package.json"; DestDir: "{#InstallDirName}\server"; Flags: ignoreversion
Source: "..\server\service-install.js"; DestDir: "{#InstallDirName}\server"; Flags: ignoreversion
Source: "..\server\service-uninstall.js"; DestDir: "{#InstallDirName}\server"; Flags: ignoreversion

; Portable Node runtime
Source: "..\node-v20.17.0-win-x64\*"; DestDir: "{#InstallDirName}\node"; Flags: ignoreversion recursesubdirs createallsubdirs

; Frontend build output
Source: "..\web\dist\*"; DestDir: "{#InstallDirName}\web\dist"; Flags: ignoreversion recursesubdirs createallsubdirs

[Run]
; Install backend dependencies (production-only) and install service
Filename: "{#InstallDirName}\node\npm.cmd"; Parameters: "install --only=prod"; WorkingDir: "{#InstallDirName}\server"; Flags: runhidden
Filename: "{#InstallDirName}\node\node.exe"; Parameters: "service-install.js"; WorkingDir: "{#InstallDirName}\server"; Flags: runhidden

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{#InstallDirName}\node\node.exe"; Parameters: "index.js"; WorkingDir: "{#InstallDirName}\server"
Name: "{group}\卸载服务"; Filename: "{#InstallDirName}\node\node.exe"; Parameters: "service-uninstall.js"; WorkingDir: "{#InstallDirName}\server"
Name: "{group}\打开监控页面"; Filename: "{cmd}"; Parameters: "/c start http://localhost:3001/"; WorkingDir: "{#InstallDirName}\server"

