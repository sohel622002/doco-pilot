$root = $PSScriptRoot

if (Get-Command wt -ErrorAction SilentlyContinue) {
    wt -w 0 new-tab --title "server" -d $root powershell -NoExit -Command "npm run dev:server" `; `
       new-tab --title "client" -d $root powershell -NoExit -Command "npm run dev:client" `; `
       new-tab --title "agent" -d $root powershell -NoExit -Command "npm run dev:agent"
} else {
    Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$root'; npm run dev:server"
    Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$root'; npm run dev:client"
    Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$root'; npm run dev:agent"
}
