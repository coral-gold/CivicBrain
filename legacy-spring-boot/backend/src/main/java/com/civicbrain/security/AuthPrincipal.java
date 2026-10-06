package com.civicbrain.security;

import com.civicbrain.admin.Role;

public record AuthPrincipal(long id, Role role, boolean profileComplete, Integer assignedWardNumber) {
    public boolean isStaff() { return role.isStaff(); }
}
