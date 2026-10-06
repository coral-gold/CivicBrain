package com.civicbrain.mail;

import com.civicbrain.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class MailService {
    private static final Logger log = LoggerFactory.getLogger(MailService.class);
    private final JavaMailSender sender;
    private final String from;

    public MailService(JavaMailSender sender, AppProperties props) {
        this.sender = sender;
        this.from = props.mailFrom();
    }

    @Async
    public void sendOtp(String to, String code, int ttlMinutes, boolean signup) {
        send(to, "Your CivicBrain verification code",
                "Your CivicBrain " + (signup ? "sign-up" : "login") + " code is " + code + ".\n\n"
                        + "It expires in " + ttlMinutes + " minutes and can be used once. "
                        + "If you did not request it, you can ignore this email.");
    }

    @Async
    public void sendAccountExists(String to) {
        send(to, "You already have a CivicBrain account",
                "Someone (hopefully you) tried to sign up with this email address, but an account already exists.\n\n"
                        + "Please use \"Log in\" on CivicBrain instead. If this wasn't you, no action is needed.");
    }

    @Async
    public void sendStatusChange(String to, long complaintId, String newStatus) {
        send(to, "Update on your CivicBrain complaint #" + complaintId,
                "Your complaint #" + complaintId + " is now: " + newStatus.replace('_', ' ') + ".");
    }

    private void send(String to, String subject, String text) {
        try {
            var m = new SimpleMailMessage();
            m.setFrom(from);
            m.setTo(to);
            m.setSubject(subject);
            m.setText(text);
            sender.send(m);
        } catch (Exception e) {
            // Never log the body (it may hold an OTP) – NFR-S8.
            log.error("Failed to send email '{}': {}", subject, e.getClass().getSimpleName());
        }
    }
}
