package com.BNR.compliancePortal.config;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;

@Configuration
public class OpenApiConfig {

    private static final String BEARER_SCHEME = "bearerAuth";

    /**
     * When empty, Swagger exposes common local bases so "Try it out" never defaults to bare http://localhost:80.
     * Set {@code app.openapi.primary-server-url} (optional env {@code OPENAPI_PRIMARY_SERVER_URL}) for a single
     * server list in staged or production Swagger.
     */
    @Bean
    public OpenAPI complianceOpenApi(@Value("${app.openapi.primary-server-url:}") String primaryServerUrl) {
        Info apiInfo = new Info()
            .title("BNR Bank Licensing & Compliance Portal API")
            .description("REST API for the National Bank of Rwanda licensing workflow. "
                + "Implements DRAFT -> SUBMITTED -> UNDER_REVIEW -> REVIEWED -> "
                + "APPROVED|REJECTED with role-based access control and an "
                + "append-only audit trail.")
            .version("v1")
            .contact(new Contact()
                .name("BNR Compliance Engineering")
                .email("compliance-eng@bnr.rw"))
            .license(new License().name("Internal use only"));

        SecurityScheme bearerScheme = new SecurityScheme()
            .name(BEARER_SCHEME)
            .type(SecurityScheme.Type.HTTP)
            .scheme("bearer")
            .bearerFormat("JWT")
            .description("Paste the accessToken from POST /api/v1/auth/login. Users are created by ADMIN (POST /api/v1/admin/users) or seed data—there is no public register.");

        Components apiComponents = new Components()
            .addSecuritySchemes(BEARER_SCHEME, bearerScheme);

        return new OpenAPI()
            .info(apiInfo)
            .addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME))
            .components(apiComponents)
            .servers(openApiServers(primaryServerUrl));
    }

    private static List<Server> openApiServers(String primaryServerUrl) {
        String trimmed = primaryServerUrl.strip();
        if (!trimmed.isEmpty()) {
            return List.of(withDescription(trimTrailingSlash(trimmed), "API base URL"));
        }

        return List.of(
            withDescription("http://localhost:8088",
                "Docker Compose: published backend (:8088->:8080)"),
            withDescription("http://localhost:3000",
                "Docker UI / nginx or Vite dev (proxies /api + /swagger)"),
            withDescription("http://localhost:8080",
                "Local JVM (./mvnw spring-boot:run default server.port)"),
            withDescription("http://127.0.0.1:8080",
                "Same as above via 127.0.0.1"));
    }

    private static Server withDescription(String url, String description) {
        return new Server().url(url).description(description);
    }

    private static String trimTrailingSlash(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
