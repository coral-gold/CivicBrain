/** Never return Mongoose documents or password hashes: map to plain DTOs (SRS §12). */
export function citizenDto(c) {
  return {
    id: String(c._id),
    email: c.email,
    fullName: c.fullName,
    role: 'CITIZEN',
    status: c.status,
    profileComplete: c.status === 'ACTIVE',
    phone: c.phone ?? null,
    gender: c.gender ?? null,
    dateOfBirth: c.dateOfBirth ? c.dateOfBirth.toISOString().slice(0, 10) : null,
    wardNumber: c.wardNumber ?? null,
  };
}

export function staffDto(s) {
  return {
    id: String(s._id),
    email: s.email,
    fullName: s.fullName,
    role: s.role,
    profileComplete: true,
    assignedWard: s.assignedWard ?? null,
  };
}
