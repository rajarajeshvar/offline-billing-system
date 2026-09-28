package com.yourcompany.billing.service;

import com.yourcompany.billing.entity.Customer;
import com.yourcompany.billing.exception.BusinessValidationException;
import com.yourcompany.billing.exception.ResourceNotFoundException;
import com.yourcompany.billing.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class CustomerService {

    private final CustomerRepository customerRepository;

    @Transactional
    public Customer createCustomer(Customer customer) {
        if (customer.getCustomerCode() != null && !customer.getCustomerCode().isBlank() &&
                customerRepository.findByCustomerCode(customer.getCustomerCode()).isPresent()) {
            throw new BusinessValidationException("Customer with code '" + customer.getCustomerCode() + "' already exists.");
        }
        return customerRepository.save(customer);
    }

    @Transactional(readOnly = true)
    public Page<Customer> getCustomers(String query, Pageable pageable) {
        if (query != null && !query.isBlank()) {
            return customerRepository.searchCustomers(query.trim(), pageable);
        }
        return customerRepository.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public Customer getCustomerById(Long id) {
        return customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + id));
    }
}
