package com.swp391.parking.service;

import com.swp391.parking.dto.request.ChangePasswordRequest;
import com.swp391.parking.dto.request.UpdateProfileRequest;
import com.swp391.parking.dto.response.UserProfileResponse;

public interface UserProfileService {

    UserProfileResponse getMyProfile(String username);

    UserProfileResponse updateMyProfile(String username, UpdateProfileRequest request);

    void changeMyPassword(String username, ChangePasswordRequest request);
}
