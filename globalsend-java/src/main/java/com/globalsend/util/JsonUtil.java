package com.globalsend.util;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

public final class JsonUtil {
    private static final Gson GSON = new GsonBuilder()
            .setDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZ")
            .serializeNulls()
            .create();

    private JsonUtil() {}

    public static String toJson(Object obj) {
        return GSON.toJson(obj);
    }

    public static <T> T fromJson(String json, Class<T> classOfT) {
        return GSON.fromJson(json, classOfT);
    }
}
