@echo off
title project-362 dev launcher
echo Loading environment variables...
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
set PATH=%USERPROFILE%\.cargo\bin;%PATH%;C:\Program Files\Git\usr\bin
set LIBCLANG_PATH=C:\Program Files\LLVM\bin
set BINDGEN_EXTRA_CLANG_ARGS=

echo Starting compilation and launching project-362...
cd /d "%~dp0apps\project-362-app-tauri"
python "../../run_with_clang.py" bun run tauri dev
pause
