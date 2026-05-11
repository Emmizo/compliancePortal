# syntax=docker/dockerfile:1.7
#
# Spring Boot backend for the BNR Compliance Portal.
#
# Stage 1 (builder): full JDK + Maven wrapper to compile the fat JAR.
# Stage 2 (runtime): slim JRE only, runs as a non-root user, exposes 8080.
# ----------------------------------------------------------------------------

FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace

# Warm the local Maven cache from pom.xml first so that a code-only change
# does not invalidate the dependency download layer.
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x ./mvnw \
 && ./mvnw -B -ntp -DskipTests dependency:resolve dependency:resolve-plugins

COPY src src
RUN ./mvnw -B -ntp -DskipTests package \
 && cp target/compliancePortal-*.jar /workspace/app.jar


FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app

# Non-root runtime user. Document storage volume is owned by this user.
RUN groupadd --system portal \
 && useradd --system --gid portal --create-home --home-dir /home/portal portal \
 && mkdir -p /var/compliance/documents \
 && chown -R portal:portal /var/compliance /app

USER portal

COPY --from=build --chown=portal:portal /workspace/app.jar /app/app.jar

EXPOSE 8080

# JVM tuning kept minimal; container memory limits + UseContainerSupport (default
# in modern JDKs) handle the rest. ExitOnOutOfMemoryError ensures restart-on-OOM
# instead of a half-broken container.
ENTRYPOINT ["java", \
            "-XX:+ExitOnOutOfMemoryError", \
            "-Djava.security.egd=file:/dev/./urandom", \
            "-jar", "/app/app.jar"]
