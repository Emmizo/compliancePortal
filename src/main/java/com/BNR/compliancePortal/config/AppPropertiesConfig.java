package com.BNR.compliancePortal.config;

import com.BNR.compliancePortal.security.JwtProperties;
import com.BNR.compliancePortal.service.DocumentProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties({JwtProperties.class, DocumentProperties.class})
public class AppPropertiesConfig {
}
