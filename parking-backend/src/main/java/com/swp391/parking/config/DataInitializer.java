package com.swp391.parking.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.beans.factory.annotation.Autowired;

import javax.sql.DataSource;
import java.sql.Connection;

// Data already loaded - disabling to prevent constraint violations on restart
// @Configuration
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private DataSource dataSource;

    @Override
    public void run(String... args) throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            ScriptUtils.executeSqlScript(connection, new ClassPathResource("data.sql"));
            System.out.println("✅ Test data loaded successfully from data.sql");
        } catch (Exception e) {
            System.err.println("⚠️ Data initialization failed: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
