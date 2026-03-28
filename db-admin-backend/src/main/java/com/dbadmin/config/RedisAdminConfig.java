package com.dbadmin.config;

import io.lettuce.core.RedisClient;
import io.lettuce.core.RedisURI;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.api.sync.RedisCommands;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/**
 * Provides a bare Lettuce RedisClient so RedisAdminService can
 * open short-lived connections to any DB index (0-15) on demand.
 *
 * We intentionally bypass Spring Data Redis's RedisTemplate here
 * because RedisTemplate is bound to a single DB at startup time.
 */
@Slf4j
@Configuration
public class RedisAdminConfig {

    @Value("${spring.redis.host:localhost}")
    private String host;

    @Value("${spring.redis.port:6379}")
    private int port;

    @Value("${spring.redis.password:}")
    private String password;

    @Value("${spring.redis.timeout:3000ms}")
    private String timeout;

    @Bean(destroyMethod = "shutdown")
    public RedisClient redisAdminClient() {
        RedisURI.Builder builder = RedisURI.builder()
                .withHost(host)
                .withPort(port)
                .withTimeout(Duration.ofSeconds(3));

        if (password != null && !password.isBlank()) {
            builder.withPassword(password.toCharArray());
        }

        RedisClient client = RedisClient.create(builder.build());
        log.info("[redis-admin] RedisClient initialised → {}:{}", host, port);
        return client;
    }
}
