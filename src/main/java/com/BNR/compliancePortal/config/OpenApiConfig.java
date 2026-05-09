package com.BNR.compliancePortal.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String BEARER_SCHEME = "bearerAuth";

    @Bean
    public OpenAPI complianceOpenApi() {
        return new OpenAPI()
            .info(new Info()
                .title("BNR Bank Licensing & Compliance Portal API")
                .description("REST API for the National Bank of Rwanda licensing workflow. "
                    + "Implements DRAFT -> SUBMITTED -> UNDER_REVIEW -> REVIEWED -> "
                    + "APPROVED|REJECTED with role-based access control and an "
                    + "append-only audit trail.")
                .version("v1")
                .contact(new Contact()
                    .name("BNR Compliance Engineering")
                    .email("compliance-eng@bnr.rw"))
                .license(new License().name("Internal use only")))
            .addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME))
            .components(new Components()
                .addSecuritySchemes(BEARER_SCHEME, new SecurityScheme()
                    .name(BEARER_SCHEME)
                    .type(SecurityScheme.Type.HTTP)
                    .scheme("bearer")
                    .bearerFormat("JWT")
                    .description("Paste the accessToken returned by POST /api/v1/auth/login")));
    }
}
