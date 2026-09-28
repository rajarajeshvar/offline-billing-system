package com.yourcompany.billing.service;

import com.yourcompany.billing.dto.AuthResponse;
import com.yourcompany.billing.dto.LoginRequest;
import com.yourcompany.billing.entity.User;
import com.yourcompany.billing.exception.ResourceNotFoundException;
import com.yourcompany.billing.repository.UserRepository;
import com.yourcompany.billing.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final UserRepository userRepository;

    @Transactional
    public AuthResponse authenticateUser(LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getUsername().trim(),
                        loginRequest.getPassword()
                )
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = tokenProvider.generateToken(authentication);

        User user = userRepository.findByUsername(loginRequest.getUsername().trim())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        user.setLastLoginAt(OffsetDateTime.now());
        userRepository.save(user);

        String employeeName = user.getEmployee() != null ? user.getEmployee().getFullName() : "System Admin";

        return AuthResponse.builder()
                .token(jwt)
                .userId(user.getId())
                .username(user.getUsername())
                .role(user.getRole().getName())
                .employeeName(employeeName)
                .build();
    }
}
