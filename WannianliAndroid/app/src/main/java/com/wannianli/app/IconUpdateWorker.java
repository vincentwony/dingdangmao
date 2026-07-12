package com.wannianli.app;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

public class IconUpdateWorker extends Worker {

    public IconUpdateWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        MainActivity.updateAppIcon(getApplicationContext());
        return Result.success();
    }
}
