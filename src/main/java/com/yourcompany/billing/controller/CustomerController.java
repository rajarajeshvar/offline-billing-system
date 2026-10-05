package com.yourcompany.billing.controller;

import com.yourcompany.billing.dto.CustomerSummaryDto;
import com.yourcompany.billing.entity.Customer;
import com.yourcompany.billing.entity.enums.CustomerSegment;
import com.yourcompany.billing.entity.enums.CustomerType;
import com.yourcompany.billing.service.CustomerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @PostMapping
    public ResponseEntity<Customer> createCustomer(@Valid @RequestBody Customer customer, Principal principal) {
        String username = principal != null ? principal.getName() : null;
        return ResponseEntity.status(HttpStatus.CREATED).body(customerService.createCustomer(customer, username));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Customer> updateCustomer(
            @PathVariable Long id,
            @Valid @RequestBody Customer customer,
            Principal principal) {
        String username = principal != null ? principal.getName() : null;
        return ResponseEntity.ok(customerService.updateCustomer(id, customer, username));
    }

    @GetMapping
    public ResponseEntity<Page<Customer>> getCustomers(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) CustomerType type,
            @RequestParam(required = false) CustomerSegment segment,
            @PageableDefault(size = 20, sort = "name") Pageable pageable) {
        return ResponseEntity.ok(customerService.getCustomers(query, type, segment, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Customer> getCustomerById(@PathVariable Long id) {
        return ResponseEntity.ok(customerService.getCustomerById(id));
    }

    @GetMapping("/{id}/summary")
    public ResponseEntity<CustomerSummaryDto> getCustomerSummary(@PathVariable Long id) {
        return ResponseEntity.ok(customerService.getCustomerSummary(id));
    }
}
