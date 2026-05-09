package com.BNR.compliancePortal.web.error;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;


@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiError(
    int status,
    String error,
    String message,
    Instant timestamp,
    List<String> details
) {

    public static ApiError of(HttpStatus status, String error, String message) {
        return new ApiError(status.value(), error, message, Instant.now(), null);
    }

    public static ApiError of(HttpStatus status, String error, String message, List<String> details) {
        return new ApiError(status.value(), error, message, Instant.now(), details);
    }
}
