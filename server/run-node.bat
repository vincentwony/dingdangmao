@echo off
cd /d H:\Phone\server
set NODE_PATH=H:\Phone\server\node_modules
if not exist "H:\Phone\.cal-run" mkdir "H:\Phone\.cal-run"
"C:\Users\Administrator\.workbuddy\binaries\node\versions\22.22.2\node.exe" "H:\Phone\server\node_modules\nodemon\bin\nodemon.js" --ignore "core/**" --ignore "node_modules/**" --ignore "*.log" --ignore ".server.*" --ignore "verify/**" --ignore "dist/**" --ignore "extract_noref.js" --ignore "dump_remaining.js" index.js > "H:\Phone\.cal-run\.server.log" 2> "H:\Phone\.cal-run\.server.err"
