package com.civicbrain.storage;

import com.civicbrain.common.ApiException;
import java.awt.Color;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;
import java.util.Map;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

/**
 * NFR-S3: validates by magic bytes (not extension/Content-Type), refuses oversized or decompression-bomb
 * images, and always re-encodes to a fresh JPEG – which drops EXIF/GPS and any appended payloads.
 */
@Component
public class ImageProcessor {
    public static final int MAX_BYTES = 5 * 1024 * 1024;
    static final int MAX_PIXELS = 40_000_000;
    static final int MAX_EDGE = 1600;   // keeps downloads small on 3G; plenty for detection

    public ProcessedImage process(MultipartFile file, String field) {
        if (file == null || file.isEmpty()) throw bad(field, "Image is empty.");
        if (file.getSize() > MAX_BYTES) throw bad(field, "Each image must be 5 MB or smaller.");
        byte[] raw;
        try {
            raw = file.getBytes();
        } catch (IOException e) {
            throw bad(field, "Could not read the image.");
        }
        return process(raw, field);
    }

    ProcessedImage process(byte[] raw, String field) {
        if (raw.length > MAX_BYTES) throw bad(field, "Each image must be 5 MB or smaller.");
        if (!looksLikeSupportedImage(raw)) throw bad(field, "Only JPEG, PNG or WebP images are allowed.");
        try (ImageInputStream in = ImageIO.createImageInputStream(new ByteArrayInputStream(raw))) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(in);
            if (!readers.hasNext()) throw bad(field, "Only JPEG, PNG or WebP images are allowed.");
            ImageReader reader = readers.next();
            try {
                reader.setInput(in, true, true);
                long pixels = (long) reader.getWidth(0) * reader.getHeight(0);
                if (pixels > MAX_PIXELS) throw bad(field, "Image dimensions are too large.");
                BufferedImage src = reader.read(0);
                return encode(src);
            } finally {
                reader.dispose();
            }
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw bad(field, "The file is not a valid image.");
        }
    }

    private ProcessedImage encode(BufferedImage src) throws IOException {
        int w = src.getWidth(), h = src.getHeight();
        double scale = Math.min(1.0, (double) MAX_EDGE / Math.max(w, h));
        int nw = Math.max(1, (int) Math.round(w * scale)), nh = Math.max(1, (int) Math.round(h * scale));
        BufferedImage out = new BufferedImage(nw, nh, BufferedImage.TYPE_INT_RGB);   // flattens alpha, drops metadata
        var g = out.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.setColor(Color.WHITE);
            g.fillRect(0, 0, nw, nh);
            g.drawImage(src, 0, 0, nw, nh, null);
        } finally {
            g.dispose();
        }
        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        try (var bos = new ByteArrayOutputStream(); var ios = ImageIO.createImageOutputStream(bos)) {
            ImageWriteParam p = writer.getDefaultWriteParam();
            p.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            p.setCompressionQuality(0.85f);
            writer.setOutput(ios);
            writer.write(null, new IIOImage(out, null, null), p);   // null metadata => nothing carried over
            ios.flush();
            return new ProcessedImage(bos.toByteArray(), nw, nh);
        } finally {
            writer.dispose();
        }
    }

    static boolean looksLikeSupportedImage(byte[] b) {
        if (b.length < 12) return false;
        boolean jpeg = (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF;
        boolean png = (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G'
                && b[4] == 0x0D && b[5] == 0x0A && b[6] == 0x1A && b[7] == 0x0A;
        boolean webp = b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P';
        return jpeg || png || webp;
    }

    private static ApiException bad(String field, String msg) {
        return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", msg, Map.of(field, msg), null);
    }
}
