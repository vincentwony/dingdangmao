package com.wannianli.app;

import android.Manifest;
import android.app.Activity;
import android.content.ComponentName;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.GeolocationPermissions;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.webkit.WebViewAssetLoader;

import java.util.Calendar;
import java.util.concurrent.TimeUnit;

import androidx.work.ExistingWorkPolicy;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;

public class MainActivity extends Activity {

    private WebView webView;
    private boolean mIconUpdated = false;
    private static final int LOCATION_PERMISSION_REQUEST = 1001;

    private static final String[] ALIASES = {
        "MainActivityZi", "MainActivityChou", "MainActivityYin",
        "MainActivityMao", "MainActivityChen", "MainActivitySi",
        "MainActivityWu", "MainActivityWei", "MainActivityShen",
        "MainActivityYou", "MainActivityXu", "MainActivityHai"
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);

        // WebChromeClient：支持 JS Geolocation API + 定位权限回调
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                // 检查是否已有定位权限
                if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.ACCESS_FINE_LOCATION)
                        == PackageManager.PERMISSION_GRANTED) {
                    callback.invoke(origin, true, false);
                } else {
                    // 自动请求定位权限
                    pendingGeoCallback = callback;
                    pendingGeoOrigin = origin;
                    ActivityCompat.requestPermissions(MainActivity.this,
                        new String[]{ Manifest.permission.ACCESS_FINE_LOCATION,
                                      Manifest.permission.ACCESS_COARSE_LOCATION },
                        LOCATION_PERMISSION_REQUEST);
                }
            }
        });

        WebSettings ws = webView.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setAllowFileAccess(false);
        ws.setAllowContentAccess(true);
        ws.setUseWideViewPort(true);
        ws.setLoadWithOverviewMode(true);
        ws.setBuiltInZoomControls(true);
        ws.setDisplayZoomControls(false);
        ws.setSupportZoom(true);
        ws.setTextZoom(100);
        // 启用 WebView 定位支持
        ws.setGeolocationEnabled(true);

        // 注册授权桥接，供 JS 端获取 Android 硬件信息
        webView.addJavascriptInterface(new LicenseBridge(this), "LicenseBridge");

        // WebViewAssetLoader：以 https 协议代理本地 assets，避免 file:// 安全提示
        WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
            .setDomain("appassets.androidplatform.net")
            .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, android.webkit.WebResourceRequest request) {
                return false;
            }
            @Override
            public android.webkit.WebResourceResponse shouldInterceptRequest(WebView view,
                    android.webkit.WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }
            @Override
            public void onPageFinished(WebView view, String url) {
                // 页面加载完成，不在此处做重量操作
            }
        });

        webView.loadUrl("https://appassets.androidplatform.net/www/index.html");
        setContentView(webView);
    }

    @Override
    protected void onResume() {
        super.onResume();
        // 权限请求移至 onResume，不阻塞 onCreate 冷启动
        if (webView != null) {
            webView.postDelayed(new Runnable() {
                @Override
                public void run() {
                    requestLocationPermission();
                }
            }, 500);
        }
        // 延迟 3 秒后首次更新图标，避免冷启动时
        // WebViewAssetLoader 瞬载 → onPageFinished 立即触发 →
        // setComponentEnabledSetting 与 singleTask 冲突导致闪退
        if (!mIconUpdated) {
            mIconUpdated = true;
            if (webView != null) {
                webView.postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            updateAppIcon();
                        } catch (Exception e) {
                            android.util.Log.w("Wannianli", "updateAppIcon delayed failed: " + e.getMessage());
                        }
                    }
                }, 3000);
            }
        }
    }

    // 定位权限回调暂存
    private GeolocationPermissions.Callback pendingGeoCallback;
    private String pendingGeoOrigin;

    /** 启动时自动请求定位权限 */
    private void requestLocationPermission() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                new String[]{ Manifest.permission.ACCESS_FINE_LOCATION,
                              Manifest.permission.ACCESS_COARSE_LOCATION },
                LOCATION_PERMISSION_REQUEST);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == LOCATION_PERMISSION_REQUEST) {
            boolean granted = grantResults.length > 0
                && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            // 如果有等待中的 WebView 定位请求，回调结果
            if (pendingGeoCallback != null) {
                pendingGeoCallback.invoke(pendingGeoOrigin, granted, false);
                pendingGeoCallback = null;
                pendingGeoOrigin = null;
            }
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    /** 实例方法：从 Activity 调用 */
    void updateAppIcon() {
        updateAppIcon(this);
    }

    /** 根据当前时辰更新 App 图标 */
    static void updateAppIcon(android.content.Context context) {
        if (context == null) return;
        PackageManager pm = context.getPackageManager();
        String pkg = context.getPackageName();

        int shichen = getCurrentShichen();

        for (int i = 0; i < ALIASES.length; i++) {
            ComponentName cn = new ComponentName(pkg, pkg + "." + ALIASES[i]);
            int state = (i == shichen)
                ? PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                : PackageManager.COMPONENT_ENABLED_STATE_DISABLED;
            pm.setComponentEnabledSetting(cn, state, PackageManager.DONT_KILL_APP);
        }

        scheduleNextUpdate(context, shichen);
    }

    /** 获取当前时辰索引 0=子,1=丑,...,11=亥 */
    static int getCurrentShichen() {
        int h = Calendar.getInstance().get(Calendar.HOUR_OF_DAY);
        return ((h + 1) % 24) / 2;
    }

    /** 计算下一时辰交界时刻并调度更新 */
    static void scheduleNextUpdate(android.content.Context context, int currentShichen) {
        Calendar now = Calendar.getInstance();
        int h = now.get(Calendar.HOUR_OF_DAY);

        int nextH;
        if (h % 2 == 1) {
            nextH = (h + 2) % 24;
        } else {
            nextH = (h + 1) % 24;
        }

        Calendar next = Calendar.getInstance();
        next.set(Calendar.HOUR_OF_DAY, nextH);
        next.set(Calendar.MINUTE, 0);
        next.set(Calendar.SECOND, 0);
        next.set(Calendar.MILLISECOND, 0);

        long delay = next.getTimeInMillis() - now.getTimeInMillis();
        if (delay <= 0) {
            delay += TimeUnit.DAYS.toMillis(1);
        }

        OneTimeWorkRequest work = new OneTimeWorkRequest.Builder(IconUpdateWorker.class)
            .setInitialDelay(delay, TimeUnit.MILLISECONDS)
            .build();

        WorkManager.getInstance(context).enqueueUniqueWork(
            "icon_update", ExistingWorkPolicy.REPLACE, work);
    }
}
