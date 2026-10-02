# CivicBrain – presentation material

Everything here was captured from the **real running application** (not mockups), except where noted.

## Videos (`video/`)
| File | Length | Use |
|---|---|---|
| `CivicBrain-full-demo.mp4` | ~1m50 | **Play this one in the meeting.** Title → citizen on phone → officer/admin console → status slide |
| `CivicBrain-citizen-phone-demo.mp4` | ~55s | Phone-shaped (portrait) clip of the citizen flow |
| `CivicBrain-staff-console-demo.mp4` | ~40s | Desktop clip of the officer and admin console |

## Screenshots (`screenshots/`) – suggested slide order
01 landing · 02 signup · 03 login · 04 citizen dashboard · 08–09 report: photos · 10 report: GPS map · 11 report: "similar complaints" + Me too ·
12 report: review · 05 my complaints · 06 complaint timeline · 07 confirm / reopen · 13 staff login · 14 officer queue (Ward 1) ·
15 complaint detail · 16 admin queue (all wards) · 17 ward settings · 18 architecture · 19 complaint lifecycle

## Talking points
1. **Problem:** citizens report potholes, garbage, water leaks; municipal staff have no way to tell what is most urgent.
2. **Citizen side:** passwordless signup with an emailed code; report in 4 steps (photo, GPS, description, review); the system finds the ward from the GPS point (PostGIS); it warns about similar open complaints within 150 m and offers **"Me too"** instead of a duplicate; the citizen tracks progress and confirms or reopens the fix.
3. **Officer side:** sees only their own ward, ranked by priority; the citizen's phone number is masked; admin sees all wards; super admin manages wards (GeoJSON).
4. **Quality:** 46 automated backend tests (access control, state machine, image rules, rate limits) + 9 frontend tests; security: OTP hashing, account lockout, signed image URLs, EXIF stripped from uploads.
5. **Next:** AI service (M3) – classification, duplicate detection, explainable priority score, cost estimate; then action plans, hotspot map and crew-route optimisation.

## Be upfront about (so nobody is misled)
* **The AI is not built yet.** The "Priority" numbers in the officer queue are **sample values** typed in for the demo. Real AI scoring is milestone M3.
* The **complaint photos are illustrations** (`sample-photos/`), not real photographs.
* The **map background is a drawn stand-in** (the recording machine had no access to OpenStreetMap). The real app uses OpenStreetMap tiles.
* Demo logins: officer@civicbrain.demo / Officer!Demo2026 · admin@civicbrain.demo / Admin!Demo2026x
