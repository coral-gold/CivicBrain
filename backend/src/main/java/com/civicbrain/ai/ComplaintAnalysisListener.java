package com.civicbrain.ai;

import com.civicbrain.complaint.ComplaintSubmittedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** FR-AI7: analysis runs after the submit transaction commits, off the request thread, and can never fail a submit. */
@Component
public class ComplaintAnalysisListener {
    private static final Logger log = LoggerFactory.getLogger(ComplaintAnalysisListener.class);
    private final AiClient ai;

    public ComplaintAnalysisListener(AiClient ai) { this.ai = ai; }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onSubmitted(ComplaintSubmittedEvent e) {
        try {
            ai.analyze(e.complaintId());
        } catch (Exception ex) {
            log.warn("AI analysis failed for complaint {}: {}", e.complaintId(), ex.getClass().getSimpleName());
        }
    }
}
