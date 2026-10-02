package com.civicbrain.admin;

public enum Role { CITIZEN, OFFICER, ADMIN, SUPER_ADMIN;
    public boolean isStaff() { return this != CITIZEN; }
}
