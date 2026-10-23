#ifndef AppVersion
  #error AppVersion must be defined
#endif
#ifndef PayloadDir
  #error PayloadDir must be defined
#endif
#ifndef OutputDir
  #error OutputDir must be defined
#endif
#ifndef OutputBaseFilename
  #error OutputBaseFilename must be defined
#endif

[Setup]
AppId={{4AB72BC0-2333-4F22-8F28-998CBCA23FF2}
AppName=Streamdek
AppVersion={#AppVersion}
AppPublisher=jetcar
AppPublisherURL=https://github.com/jetcar/streamdek
DefaultDirName={localappdata}\Programs\Streamdek
DefaultGroupName=Streamdek
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir={#OutputDir}
OutputBaseFilename={#OutputBaseFilename}
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
UninstallDisplayName=Streamdek
CloseApplications=no

[Files]
Source: "{#PayloadDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; BeforeInstall: StopStreamdek

[Icons]
Name: "{group}\Uninstall Streamdek"; Filename: "{uninstallexe}"

[Run]
Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\scripts\register-windows-task.ps1"" -NodePath ""{app}\node.exe"" -AppPath ""{app}\dist\app.js"" -WorkingDirectory ""{app}"""; Flags: runhidden waituntilterminated; StatusMsg: "Starting Streamdek..."

[UninstallRun]
Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\scripts\uninstall.ps1"""; Flags: runhidden; RunOnceId: "StopStreamdek"

[Code]
var
  StreamdekStopped: Boolean;

procedure StopStreamdek;
var
  PidText: AnsiString;
  Pid: Integer;
  ResultCode: Integer;
  PidPath: String;
begin
  if StreamdekStopped then
    exit;

  StreamdekStopped := True;
  Exec(ExpandConstant('{sys}\schtasks.exe'), '/End /TN Streamdek', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  PidPath := ExpandConstant('{localappdata}\streamdek\streamdek.pid');
  if LoadStringFromFile(PidPath, PidText) then
  begin
    Pid := StrToIntDef(Trim(String(PidText)), 0);
    if Pid > 0 then
      Exec(ExpandConstant('{sys}\taskkill.exe'), '/PID ' + IntToStr(Pid) + ' /T /F', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    DeleteFile(PidPath);
  end;
end;
