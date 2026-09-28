package com.yourcompany.billing.config;

import com.yourcompany.billing.entity.Employee;
import com.yourcompany.billing.entity.Role;
import com.yourcompany.billing.entity.User;
import com.yourcompany.billing.repository.EmployeeRepository;
import com.yourcompany.billing.repository.RoleRepository;
import com.yourcompany.billing.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class AdminBootstrapRunner implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final EmployeeRepository employeeRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.initial-password:Admin@Offline123}")
    private String initialAdminPassword;

    @Override
    @Transactional
    @SuppressWarnings("null")
    public void run(String... args) {
        // 1. Bootstrap Admin
        if (userRepository.countByRoleName("ADMIN") == 0) {
            log.info("No administrative account found in database. Initializing default bootstrap administrator...");

            Role adminRole = roleRepository.findByName("ADMIN")
                    .orElseGet(() -> roleRepository.save(Role.builder()
                            .name("ADMIN")
                            .description("Full system administrator")
                            .build()));

            Employee adminEmp = employeeRepository.findByEmployeeCode("EMP001")
                    .orElseGet(() -> employeeRepository.save(Employee.builder()
                            .employeeCode("EMP001")
                            .firstName("Rajan")
                            .lastName("Admin")
                            .designation("System Administrator")
                            .phone("9876543210")
                            .email("admin@billing.local")
                            .isActive(true)
                            .build()));

            User adminUser = User.builder()
                    .username("admin")
                    .passwordHash(passwordEncoder.encode(initialAdminPassword))
                    .role(adminRole)
                    .employee(adminEmp)
                    .isActive(true)
                    .build();

            userRepository.save(adminUser);

            log.info("===============================================================================");
            log.info("SYSTEM BOOTSTRAP: Administrator account created!");
            log.info("Username: admin");
            log.info("Password: {}", initialAdminPassword);
            log.info("Please change this password immediately in production environments.");
            log.info("===============================================================================");
        }

        // 2. Bootstrap Cashier / Biller
        if (userRepository.findByUsername("cashier1").isEmpty()) {
            Role billerRole = roleRepository.findByName("BILLER")
                    .orElseGet(() -> roleRepository.save(Role.builder()
                            .name("BILLER")
                            .description("Front-desk point of sale and invoice creation operator")
                            .build()));

            Employee cashierEmp = employeeRepository.findByEmployeeCode("EMP002")
                    .orElseGet(() -> employeeRepository.save(Employee.builder()
                            .employeeCode("EMP002")
                            .firstName("Priya")
                            .lastName("Sharma")
                            .designation("Cashier #01")
                            .phone("9876543211")
                            .email("priya.cashier@billing.local")
                            .isActive(true)
                            .build()));

            User cashierUser = User.builder()
                    .username("cashier1")
                    .passwordHash(passwordEncoder.encode("Cashier@123"))
                    .role(billerRole)
                    .employee(cashierEmp)
                    .isActive(true)
                    .build();

            userRepository.save(cashierUser);
            log.info("SYSTEM BOOTSTRAP: Cashier account created (Username: cashier1, Password: Cashier@123, PIN: 1234)");
        }

        // 3. Bootstrap Store Manager
        if (userRepository.findByUsername("manager").isEmpty()) {
            Role managerRole = roleRepository.findByName("MANAGER")
                    .orElseGet(() -> roleRepository.save(Role.builder()
                            .name("MANAGER")
                            .description("Store manager overseeing sales and inventory")
                            .build()));

            Employee managerEmp = employeeRepository.findByEmployeeCode("EMP003")
                    .orElseGet(() -> employeeRepository.save(Employee.builder()
                            .employeeCode("EMP003")
                            .firstName("Sunil")
                            .lastName("Verma")
                            .designation("Store Manager")
                            .phone("9876543212")
                            .email("sunil.manager@billing.local")
                            .isActive(true)
                            .build()));

            User managerUser = User.builder()
                    .username("manager")
                    .passwordHash(passwordEncoder.encode("Manager@123"))
                    .role(managerRole)
                    .employee(managerEmp)
                    .isActive(true)
                    .build();

            userRepository.save(managerUser);
            log.info("SYSTEM BOOTSTRAP: Store Manager account created (Username: manager, Password: Manager@123)");
        }
    }
}
