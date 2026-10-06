package com.civicbrain.storage;

public record ProcessedImage(byte[] bytes, int width, int height) {
    public String mime() { return "image/jpeg"; }
}
