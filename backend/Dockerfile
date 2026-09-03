# Build Stage
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app

COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests -B

# Runtime Stage
FROM eclipse-temurin:21-jre-jammy AS runtime
WORKDIR /app

COPY --from=builder /app/target/*.jar app.jar

ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
