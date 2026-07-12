package com.wannianli.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.provider.Settings;
import android.webkit.JavascriptInterface;

import org.json.JSONException;
import org.json.JSONObject;

import java.security.SecureRandom;

/**
 * LicenseBridge — 为 WebView 提供 Android 硬件标识信息
 *
 * 在 WebView 中通过 window.LicenseBridge.getDeviceInfo() 调用，
 * 返回包含设备指纹信息的 JSON 字符串。
 */
public class LicenseBridge {

    private static final String PREFS_NAME = "license_bridge_prefs";
    private static final String SEED_KEY = "install_seed";

    private final Context context;
    private String cachedDeviceInfo;

    public LicenseBridge(Context context) {
        this.context = context.getApplicationContext();
    }

    /**
     * 获取设备指纹信息（JSON字符串）
     *
     * 返回数据示例：
     * {
     *   "androidId": "xxxxxxxxxxxxxxxx",
     *   "model": "Pixel 7",
     *   "manufacturer": "Google",
     *   "hardware": "gs201",
     *   "board": "cheetah",
     *   "brand": "google",
     *   "device": "cheetah",
     *   "product": "cheetah",
     *   "sdkVersion": 34,
     *   "installSeed": "a1b2c3d4..."
     * }
     */
    @JavascriptInterface
    public String getDeviceInfo() {
        if (cachedDeviceInfo != null) return cachedDeviceInfo;

        try {
            JSONObject info = new JSONObject();

            // Android ID — 设备唯一标识，无需权限
            try {
                String androidId = Settings.Secure.getString(
                    context.getContentResolver(), Settings.Secure.ANDROID_ID);
                info.put("androidId", androidId != null ? androidId : "null");
            } catch (Exception e) {
                info.put("androidId", "error");
            }

            // Build 信息
            info.put("model", Build.MODEL);
            info.put("manufacturer", Build.MANUFACTURER);
            info.put("hardware", Build.HARDWARE);
            info.put("board", Build.BOARD);
            info.put("brand", Build.BRAND);
            info.put("device", Build.DEVICE);
            info.put("product", Build.PRODUCT);
            info.put("sdkVersion", Build.VERSION.SDK_INT);

            // 安装种子（首次安装时随机生成，卸载后丢失）
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String seed = prefs.getString(SEED_KEY, null);
            if (seed == null) {
                seed = generateSeed(32);
                prefs.edit().putString(SEED_KEY, seed).apply();
            }
            info.put("installSeed", seed);

            cachedDeviceInfo = info.toString();
            return cachedDeviceInfo;

        } catch (JSONException e) {
            return "{\"error\": \"" + e.getMessage() + "\"}";
        }
    }

    /**
     * 生成随机种子字符串
     */
    private static String generateSeed(int length) {
        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder(length);
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (int i = 0; i < length; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }

    /**
     * 获取机器码（与 Web 版格式一致：XXXX-XXXX-XXXX）
     *
     * 基于设备信息生成，确保同一设备重新安装后生成的机器码基本稳定
     * （Android ID 和 Build 信息在重装后不变，installSeed 会变）
     */
    @JavascriptInterface
    public String getMachineCode() {
        // 此方法也可直接返回机器码，
        // 但目前的架构是在 JS 端统一生成哈希，
        // 这样 Web 版和 Android 版使用相同的逻辑。
        // 这里只提供原始数据，JS 端做哈希。
        return "";
    }

}
