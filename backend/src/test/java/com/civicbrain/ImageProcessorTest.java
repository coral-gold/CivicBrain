package com.civicbrain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.civicbrain.common.ApiException;
import com.civicbrain.storage.ImageProcessor;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class ImageProcessorTest {
    private final ImageProcessor processor = new ImageProcessor();

    private static byte[] encode(int w, int h, String fmt, int type) throws Exception {
        var out = new ByteArrayOutputStream();
        if (!ImageIO.write(new BufferedImage(w, h, type), fmt, out)) throw new IllegalStateException("no writer for " + fmt);
        return out.toByteArray();
    }

    @Test
    void jpegPngAndWebpAreAcceptedAndNormalisedToJpeg() throws Exception {
        for (String fmt : new String[] {"jpg", "png", "webp"}) {
            byte[] src = encode(40, 30, fmt, fmt.equals("png") ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB);
            var res = processor.process(new MockMultipartFile("images", "x." + fmt, "application/octet-stream", src), "images");
            assertThat(res.width()).isEqualTo(40);
            assertThat(res.bytes()[0] & 0xFF).isEqualTo(0xFF);   // JPEG SOI
            assertThat(ImageIO.read(new ByteArrayInputStream(res.bytes()))).isNotNull();
        }
    }

    @Test
    void largeImagesAreDownscaled() throws Exception {
        var res = processor.process(new MockMultipartFile("images", "big.png", "image/png",
                encode(4000, 2000, "png", BufferedImage.TYPE_INT_RGB)), "images");
        assertThat(res.width()).isEqualTo(1600);
        assertThat(res.height()).isEqualTo(800);
    }

    @Test
    void contentTypeAndExtensionAreIgnoredOnlyMagicBytesCount() {
        var gif = new MockMultipartFile("images", "x.jpg", "image/jpeg", "GIF89a\u0001\u0000\u0001\u0000\u0000\u0000\u0000;".getBytes());
        assertThatThrownBy(() -> processor.process(gif, "images")).isInstanceOf(ApiException.class);
        var svg = new MockMultipartFile("images", "x.png", "image/png", "<svg xmlns='http://www.w3.org/2000/svg'/>".getBytes());
        assertThatThrownBy(() -> processor.process(svg, "images")).isInstanceOf(ApiException.class);
    }
}
