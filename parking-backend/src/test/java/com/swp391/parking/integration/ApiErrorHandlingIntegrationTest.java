package com.swp391.parking.integration;

import com.swp391.parking.support.AbstractIntegrationTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.blankOrNullString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Import(ApiErrorHandlingIntegrationTest.TestErrorControllerConfig.class)
class ApiErrorHandlingIntegrationTest extends AbstractIntegrationTestSupport {

    @Test
    @WithMockUser(username = "api-error-staff", roles = "STAFF")
    void unknownApiRoute_authenticated_shouldReturnNotFound() throws Exception {
        mockMvc.perform(get("/api/does-not-exist"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message", not(blankOrNullString())));
    }

    @Test
    void unknownApiRoute_unauthenticated_shouldReturnUnauthorized() throws Exception {
        mockMvc.perform(get("/api/does-not-exist"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void existingSecuredEndpoint_unauthenticated_shouldReturnUnauthorized() throws Exception {
        mockMvc.perform(get("/api/sessions/my"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "api-error-staff", roles = "STAFF")
    void existingEndpointWithInvalidResourceId_shouldReturnNotFound() throws Exception {
        mockMvc.perform(get("/api/sessions/{id}", 999999L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message", not(blankOrNullString())));
    }

    @Test
    @WithMockUser(username = "api-error-staff", roles = "STAFF")
    void validationException_shouldReturnBadRequest() throws Exception {
        mockMvc.perform(post("/api/sessions/entry")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message", not(blankOrNullString())));
    }

    @Test
    @WithMockUser(username = "api-error-staff", roles = "STAFF")
    void genericUnexpectedException_shouldReturnInternalServerError() throws Exception {
        mockMvc.perform(get("/api/test/unexpected-error"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message", not(blankOrNullString())));
    }

    @TestConfiguration
    static class TestErrorControllerConfig {
        @RestController
        static class TestErrorController {
            @GetMapping("/api/test/unexpected-error")
            String unexpectedError() {
                throw new IllegalStateException("boom");
            }
        }
    }
}
