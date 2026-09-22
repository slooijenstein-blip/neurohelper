# Synlumae Calendar Prototype - Manual Testing Report

**Test Date:** Tuesday, September 22, 2026  
**Test URL:** https://neurohelper-git-cursor-synlumae-calendar-726cdf-samlooijenstein.vercel.app/  
**Tester:** Autonomous Agent

---

## Test Results Summary

| Step | Test Case | Status | Notes |
|------|-----------|--------|-------|
| 1 | Sign-in with "Continue as Therapist" | ✅ PASS | Successfully clicked and navigated |
| 2 | Patients list shows Alex and Jordan | ✅ PASS | Both patients visible with correct details |
| 3 | Today tab shows week strip and day plan with Done checkboxes | ✅ PASS | Week strip visible, 5 steps displayed with checkboxes |
| 4 | Library shows "My templates" | ✅ PASS | "My templates" section visible with templates |
| 4a | Apply dialog accessible | ✅ PASS | "Apply to days..." button opened dialog successfully |
| 5 | People page shows "Invite someone" button | ✅ PASS | Invite button visible and functional |
| 5a | Invite dialog opens | ✅ PASS | Dialog displayed with Name, Email, Caregiver fields |
| 6 | Profile → Continue as Parent shows Today for Alex | ✅ PASS | Switched to parent view, Today shows Alex's schedule |
| 7 | Profile → Continue as Helper → Mark step Done | ⚠️ PARTIAL | Helper view shows "Children" page, not Today view directly |
| 7a | Alternative: Marking steps done as Therapist | ✅ PASS | Successfully marked step as done, progress updated |

---

## Detailed Test Walkthrough

### 1. Sign-in Page
**Status:** ✅ PASS

- Sign-in page loaded correctly with Synlumae branding
- Three prototype buttons visible:
  - "Continue as Therapist" (clicked)
  - "Continue as Parent"
  - "Continue as Helper"
- Successfully navigated to Patients list

---

### 2. Patients List
**Status:** ✅ PASS

**Screenshot:** `screenshot-01-patients-list.webp`

Observations:
- Page displays "Patients" heading with tagline "Your caseload — tags are desk-only, never shared with parents"
- Two patients visible:
  - **Alex** - 5-6 years, Early years
  - **Jordan** - 6-8 years, School age
- Search functionality present
- Filter tags: All, Early years, School age
- "New group tag" input field available
- "Add patient" button in top-right corner

---

### 3. Today Tab (Therapist View - Alex)
**Status:** ✅ PASS

**Screenshot:** `screenshot-02-today-as-therapist.webp`

Observations:
- Displays "Today for Alex" with week strip
- Week strip shows days MON 21 through SUN 27, with TUE 22 highlighted
- "Change today's plan" button visible
- Day plan titled "Weekday afternoon calm hour" with "0/5 done" progress
- Five steps displayed with checkboxes:
  1. STEP 1 - 5M: Arrive and settle (Shoes off, soft voice)
  2. STEP 2 - 15M: Quiet sensory bin (Rice + scoops)
  3. STEP 3 - 10M: Snack together
  4. STEP 4 - 10M: Picture book
  5. STEP 5 - 5M: Transition cue (Timer + next activity)
- All checkboxes initially unchecked

---

### 4. Library
**Status:** ✅ PASS

Observations:
- Three sections visible:
  - **MY TEMPLATES** section with:
    - "Weekday afternoon calm hour" (5 steps)
    - "Morning ready routine" (4 steps)
  - **FOR ALEX** section with patient-specific copy
- Each template shows:
  - Step count
  - First few step names
  - "Apply to days..." button
- Clicking "Apply to days..." successfully opened dialog with weekday selection

---

### 5. People Page
**Status:** ✅ PASS

Observations:
- Page displays "People" heading with subtitle "Who can see Alex's schedule"
- Large pink "Invite someone" button prominently displayed
- Two people listed:
  - **Maya (Therapist)** - THERAPIST, ACTIVE
  - **Sam (Parent)** - CAREGIVER, ACTIVE
- Invite dialog includes fields for:
  - Name
  - Email
  - Role selector (Caregiver selected by default)
  - Note about permissions
  - "Send invite" button
  - "Copy invite link" option

---

### 6. Parent View
**Status:** ✅ PASS

Observations:
- Successfully switched to parent view using "Continue as Parent" button
- Status indicator shows "Signed in as Sam (Parent)" at bottom
- Notification: "Now viewing as Caregiver"
- Today tab shows Alex's schedule (not Jordan's)
- Back link displays "Viewing Alex"
- Same day plan visible with all steps
- Navigation sidebar simplified (no Patients section)

---

### 7. Helper View
**Status:** ⚠️ PARTIAL FAIL

**Issue Found:**
- When switching to "Continue as Helper" mode, the application redirects to a "Children" page
- This page prompts "Add your first child to start" with an "Add child" button
- The Today view is not directly accessible for helpers
- Clicking "Today" in sidebar shows "Children" instead of day plan

**Expected Behavior:**
- Helper should be able to access Today view for assigned children
- Should be able to mark steps as done

**Possible Causes:**
1. Helper account may need to be explicitly assigned to a child first
2. Prototype data may not include helper-to-child relationships
3. Helper workflow may be incomplete in this prototype phase

**Workaround Tested:**
- Marked steps as done while in Therapist view instead
- Functionality works correctly (checkbox marks done, progress updates)

---

### 7a. Alternative Test - Marking Steps Done (Therapist View)
**Status:** ✅ PASS

**Screenshot:** `screenshot-03-today-step-marked-done.webp`

Observations:
- Clicked checkbox for "STEP 1 - 5M: Arrive and settle"
- Checkbox successfully marked as checked
- Step row highlighted/changed background color
- Progress indicator updated from "0/5 done" to "1/5 done"
- UI responded immediately
- Visual feedback clear and appropriate

---

## Bugs Found

### 🐛 Bug #1: Helper View Doesn't Show Today/Day Plan
**Severity:** Medium  
**Type:** Functionality / UX Issue

**Description:**
When switching to "Continue as Helper" in the prototype walkthrough, the user is redirected to a "Children" page that prompts to add a child, rather than displaying the Today view with the assigned child's schedule.

**Steps to Reproduce:**
1. Navigate to Profile page
2. Click "Continue as Helper" button
3. Click "Today" in sidebar

**Expected Result:**
- Helper should see Today view for Alex (the child they're assigned to)
- Should be able to mark steps as done

**Actual Result:**
- Shows "Children" page with "Add your first child to start" message
- Cannot access day plan directly

**Impact:**
- Cannot complete step 7 of the walkthrough as specified
- Helper role cannot mark steps as done in prototype

**Notes:**
- This may be expected behavior if helper accounts need explicit child assignment
- Parent view works correctly and shows Alex's schedule
- Therapist view works correctly

---

## Screenshots

All screenshots saved to: `/workspace/test-results/`

1. **screenshot-01-patients-list.webp** - Patients list showing Alex and Jordan
2. **screenshot-02-today-as-therapist.webp** - Today tab with week strip and day plan
3. **screenshot-03-today-step-marked-done.webp** - Today tab with step 1 marked done

---

## Overall Assessment

**Pass Rate:** 9/10 test cases passed (90%)

### ✅ Working Well:
- Sign-in flow with prototype role switching
- Patient list display and navigation
- Today view with week strip
- Day plan display with steps and timing
- Library templates and Apply dialog
- People/invite functionality
- Parent role switching and view
- Checkbox interactions and progress tracking
- Visual design and user interface

### ⚠️ Issues:
- Helper role cannot access Today view or mark steps done
- Helper workflow appears incomplete

### 🎯 Recommendations:
1. Investigate helper-to-child assignment flow
2. Ensure helper view includes access to assigned children's schedules
3. Test helper checkbox functionality once view access is resolved
4. Consider if "Children" page for helpers is intentional design
5. Add explicit helper onboarding if child assignment is required

---

**Test Completed:** Tuesday, September 22, 2026, 11:23 AM UTC
