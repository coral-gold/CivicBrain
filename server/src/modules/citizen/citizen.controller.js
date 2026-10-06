import { Citizen } from '../../models/Citizen.js';
import { Ward } from '../../models/Ward.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { audit } from '../auth/audit.js';
import { issueSession } from '../auth/session.js';
import { citizenDto } from '../auth/user.dto.js';

/** FR-A5–A7: validates uniqueness of phone and existence of ward, then activates the account. */
export const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, phone, gender, dateOfBirth, wardNumber } = req.body;
  if (!(await Ward.exists({ number: wardNumber }))) throw ApiError.validation('wardNumber', 'Choose a valid ward');
  const taken = await Citizen.exists({ phone, _id: { $ne: req.user.id } });
  const phoneInUse = () =>
    new ApiError(409, 'PHONE_IN_USE', 'This contact number is already registered.', { phone: 'This contact number is already registered.' });
  if (taken) throw phoneInUse();

  const citizen = await Citizen.findById(req.user.id);
  const wasPending = citizen.status === 'PROFILE_PENDING';
  Object.assign(citizen, { fullName, phone, gender, dateOfBirth, wardNumber, status: 'ACTIVE' });
  try {
    await citizen.save();
  } catch (e) {
    if (e?.code === 11000) throw phoneInUse(); // lost a race with another signup
    throw e;
  }
  if (wasPending) await audit(req, { event: 'PROFILE_COMPLETE', email: citizen.email, actorType: 'CITIZEN' });
  issueSession(res, { id: citizen._id, role: 'CITIZEN', name: citizen.fullName, profileComplete: true });
  res.json({ user: citizenDto(citizen) });
});
