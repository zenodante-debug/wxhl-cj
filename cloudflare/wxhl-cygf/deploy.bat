@echo off
setlocal EnableDelayedExpansion
rem ============================================================
rem  wxhl 创意工坊 · 一键部署（双击运行）
rem  用法：把本文件用资源管理器找到，双击即可；或在终端里输 deploy.bat
rem  你只需要：① 若弹浏览器就点授权  ② 把建库输出的 database_id 粘回来
rem ============================================================
cd /d "%~dp0"
rem 任何一步失败都会跳到 :hold 停住窗口，方便你把内容发给 Claude

echo.
echo ==========================================
echo   wxhl 创意工坊 · 部署
echo   工作目录：%CD%
echo ==========================================
echo.

rem ———— 找到 wrangler ————
where wrangler >nul 2>nul
if %errorlevel%==0 (
  set WR=wrangler
  goto :have_wrangler
)
echo [!] 没找到 wrangler，正在全局安装（npm install -g wrangler）…
call npm install -g wrangler
if errorlevel 1 goto :npm_fail
set WR=wrangler
goto :have_wrangler

:npm_fail
echo [!] 全局安装失败，改用 npx（首次下载稍慢）…
set WR=npx --yes wrangler@latest
:have_wrangler
call %WR% --version || goto :wrangler_broken
goto :check_login

:wrangler_broken
echo [X] wrangler 无法运行。把上面的错误发给 Claude 看。
goto :hold

:check_login
echo.
echo == 1/5 检查 Cloudflare 登录 ==
call %WR% whoami >nul 2>nul
if %errorlevel%==0 goto :logged_in
echo [!] 未登录，现在调起 wrangler login（会弹浏览器，请点"授权/Allow"）…
call %WR% login
if errorlevel 1 goto :login_fail
:logged_in
echo [OK] 已登录
call %WR% whoami
goto :create_db

:login_fail
echo [X] 登录失败。请重试，或把上面输出发给 Claude。
goto :hold

:create_db
echo.
echo == 2/5 创建数据库 wxhl-cygf-db ==
call %WR% d1 create wxhl-cygf-db
echo.
echo ^> 上面输出里有一行 database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
set /p DBID=请把那个 database_id 整个粘到这里，然后回车：
if "%DBID%"=="" goto :no_id
goto :write_id

:no_id
echo [X] 没拿到 database_id。把上面 d1 create 的输出发给 Claude。
goto :hold

:write_id
powershell -NoProfile -Command "$f='%~dp0wrangler.toml'; (Get-Content -Raw $f) -replace 'PENDING_CREATE','%DBID%' | Set-Content -Encoding utf8 $f"
findstr /C:"%DBID%" "%~dp0wrangler.toml" >nul
if errorlevel 1 goto :write_fail
echo [OK] 已把 database_id 写进 wrangler.toml
goto :set_secret

:write_fail
echo [X] 写入 wrangler.toml 失败。请手动把 database_id 改成 %DBID% 后重跑。
goto :hold

:set_secret
echo.
echo == 3/5 设置管理密钥 WORKSHOP_ADMIN_KEY ==
echo 这是你（工坊主）的万能密钥：能删任何人的包、也能帮丢了密钥的玩家重置。随便一串，但请记牢。
set /p KEY=请输入管理密钥（会明文显示）：
if "%KEY%"=="" goto :no_key
echo %KEY%| call %WR% secret put WORKSHOP_ADMIN_KEY >nul
echo [OK] 管理密钥已设置
goto :deploy

:no_key
echo [X] 密钥不能为空。
goto :hold

:deploy
echo.
echo == 4/5 部署 Worker ==
call %WR% deploy
if errorlevel 1 goto :deploy_fail
echo [OK] 部署完成
goto :smoke

:deploy_fail
echo [X] 部署失败。请把上面的完整输出发给 Claude（这是关键一步）。
goto :hold

:smoke
echo.
echo == 5/5 冒烟测试 ==
call node smoke.mjs
if errorlevel 1 goto :smoke_fail
goto :done

:smoke_fail
echo [!] 冒烟有失败项。把上面的输出（尤其是 ✗ 行）发给 Claude。
goto :end

:done
echo.
echo ==========================================
echo   ✓ 全部完成！
echo   打开浏览器访问：https://cygf.657868.xyz
echo   然后在酒馆里点「创意工坊」按钮确认页面能出来
echo ==========================================

:hold
echo.
echo （窗口保持打开，你可以向上翻看每一步的结果）
pause
