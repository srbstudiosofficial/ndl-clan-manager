@echo off
title Push NDL Clan Manager to GitHub for Render
echo =======================================================
echo    PUSH TO GITHUB // RENDER DEPLOYMENT ASSISTANT
echo =======================================================
echo.
echo 1. Create an empty repository on https://github.com/new
echo    (e.g., name it: ndl-clan-manager)
echo 2. Copy the repository URL (e.g., https://github.com/your-username/ndl-clan-manager.git)
echo.
set /p REPO_URL="Enter your GitHub Repository URL: "
if "%REPO_URL%"=="" goto end

git remote remove origin >nul 2>&1
git remote add origin %REPO_URL%
git branch -M main
git push -u origin main

echo.
echo =======================================================
echo Code successfully pushed to GitHub!
echo Now connect this repository on https://dashboard.render.com
echo =======================================================
:end
pause
