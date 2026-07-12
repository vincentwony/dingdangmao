#!/bin/bash
# sign-apk.sh — 自动签名 APK
# 用法: ./sign-apk.sh     （会提示输入密钥库密码）

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/WannianliAndroid"
KEYSTORE="$PROJECT_DIR/release.jks"
UNSIGNED="$PROJECT_DIR/app/build/outputs/apk/release/app-release-unsigned.apk"
SIGNED="$PROJECT_DIR/app/build/outputs/apk/release/app-release.apk"
SDK_BUILD_TOOLS="C:/Users/Administrator/AppData/Local/Android/Sdk/build-tools/34.0.0"

echo "═══════════════════════════════════════"
echo "  公信万年历 APK 签名"
echo "═══════════════════════════════════════"
echo ""

# 检查文件
if [ ! -f "$KEYSTORE" ]; then
  echo "[错误] 密钥库不存在: $KEYSTORE"
  echo "请先运行生成密钥命令（见 签名步骤.nd 第1步）"
  exit 1
fi

if [ ! -f "$UNSIGNED" ]; then
  echo "[错误] 未签名 APK 不存在: $UNSIGNED"
  echo "请先运行构建: node build-release.js && gradle assembleRelease"
  exit 1
fi

echo "[1/3] 密钥库: $KEYSTORE"
echo "       APK : $UNSIGNED"
echo ""

# 读取密码（支持环境变量 KEYSTORE_PASS，否则提示输入）
if [ -n "$KEYSTORE_PASS" ]; then
  PASS="$KEYSTORE_PASS"
else
  read -s -p "请输入密钥库密码: " PASS
  echo ""
  if [ -z "$PASS" ]; then
    echo "[错误] 密码不能为空"
    exit 1
  fi
fi

echo "[2/3] 签名中..."
"$SDK_BUILD_TOOLS/apksigner.bat" sign \
  --ks "$KEYSTORE" \
  --ks-pass "pass:$PASS" \
  --out "$SIGNED" \
  "$UNSIGNED"

echo "[3/3] 验证签名..."
"$SDK_BUILD_TOOLS/apksigner.bat" verify --verbose "$SIGNED"

echo ""
echo "═══════════════════════════════════════"
echo "  签名完成！"
echo "  $SIGNED"
echo "═══════════════════════════════════════"
