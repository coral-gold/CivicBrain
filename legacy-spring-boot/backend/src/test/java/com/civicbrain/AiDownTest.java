package com.civicbrain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.civicbrain.ai.AiClient;
import com.civicbrain.security.JwtService;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;

/** SRS §8.4 / FR-AI7: an unavailable AI service must never block complaint submission. */
@Import(AiDownTest.FailingAi.class)
class AiDownTest extends BaseIntegrationTest {
    @TestConfiguration
    static class FailingAi {
        @Bean
        @org.springframework.context.annotation.Primary
        AiClient aiClient() {
            return id -> { throw new IllegalStateException("AI service unreachable"); };
        }
    }

    @Autowired JwtService jwt;

    @Test
    void complaintIsStillCreatedAndStaysSubmittedWhenAiThrows() throws Exception {
        var alice = citizen("alice@example.com", true);
        var img = new BufferedImage(32, 32, BufferedImage.TYPE_INT_RGB);
        var bos = new ByteArrayOutputStream();
        ImageIO.write(img, "jpg", bos);
        mvc.perform(multipart("/api/citizen/complaints")
                        .file(new MockMultipartFile("data", "", "application/json",
                                "{\"description\":\"Streetlight is broken here\",\"lat\":18.05,\"lng\":73.05}".getBytes()))
                        .file(new MockMultipartFile("images", "a.jpg", "image/jpeg", bos.toByteArray()))
                        .cookie(sessionFor(alice, jwt)))
                .andExpect(status().isCreated());
        Thread.sleep(300);   // let the async AFTER_COMMIT listener run (and fail) before asserting
        assertThat(jdbc.queryForObject("select status from complaints", String.class)).isEqualTo("SUBMITTED");
    }
}
