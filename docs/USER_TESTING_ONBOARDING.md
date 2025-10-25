# User Testing Protocol: Onboarding Flow

## Overview

This document provides a comprehensive protocol for conducting user testing sessions for the onboarding tutorial. Use this guide to observe first-time users and gather insights for improving the onboarding experience.

## Test Objectives

1. **Usability**: Can users complete onboarding without assistance?
2. **Comprehension**: Do users understand the key features after onboarding?
3. **Engagement**: Do users find the tutorial helpful and engaging?
4. **Time Efficiency**: Is the onboarding length appropriate?
5. **Pain Points**: What causes confusion or frustration?

## Success Criteria

### Primary Goals (Must Achieve)

- ✅ **>80% Completion Rate**: 4 out of 5 participants complete onboarding
- ✅ **No Critical Blockers**: No technical issues prevent completion
- ✅ **<5 Minutes Average Time**: Users complete in reasonable time
- ✅ **>75% Positive Feedback**: Users rate tutorial as helpful

### Secondary Goals (Nice to Have)

- ✅ **Zero Confusion Events**: Users don't express confusion
- ✅ **Active Engagement**: Users read all descriptions
- ✅ **Feature Recognition**: Users can identify 5+ features after completion
- ✅ **No Skips**: Users complete all steps voluntarily

## Test Participants

### Participant Personas

#### Persona 1: Complete Beginner

- **Profile**: Never used video editing software
- **Tech Savvy**: Low (2/5)
- **Age Range**: 25-35
- **Goal**: Create simple videos for social media
- **Pain Points**: Intimidated by complex tools

#### Persona 2: Casual Creator

- **Profile**: Used iMovie or basic tools
- **Tech Savvy**: Medium (3/5)
- **Age Range**: 20-30
- **Goal**: Create content for YouTube/TikTok
- **Pain Points**: Needs more advanced features

#### Persona 3: Experienced User

- **Profile**: Used Premiere Pro or Final Cut Pro
- **Tech Savvy**: High (4/5)
- **Age Range**: 25-40
- **Goal**: Professional editing with AI assistance
- **Pain Points**: Wants efficiency and shortcuts

#### Persona 4: Content Marketer

- **Profile**: Creates marketing videos regularly
- **Tech Savvy**: Medium (3/5)
- **Age Range**: 28-45
- **Goal**: Fast production of branded content
- **Pain Points**: Needs templates and speed

#### Persona 5: Senior User

- **Profile**: Limited tech experience
- **Tech Savvy**: Low (1-2/5)
- **Age Range**: 55+
- **Goal**: Create family videos
- **Pain Points**: Easily confused by complex UI

### Recruitment Criteria

For each test session, recruit:

- **5 participants** representing different personas
- **First-time users** who haven't seen the editor before
- **Diverse backgrounds** in age, tech experience, and use cases
- **Native or fluent English speakers** (if testing English copy)

## Test Environment Setup

### Hardware Requirements

- **Computer**: Desktop or laptop with sufficient specs
- **Browser**: Latest Chrome, Firefox, or Safari
- **Screen Recording**: OBS Studio or QuickTime
- **Camera**: Optional for facial expressions
- **Audio**: Microphone for think-aloud protocol

### Software Setup

1. Clear browser cache and cookies
2. Disable browser extensions (ad blockers, etc.)
3. Set `forceShow={true}` on UserOnboarding component
4. Enable PostHog session recording (if consent given)
5. Prepare screen recording software

### Test Materials

- [ ] Consent form
- [ ] Pre-test questionnaire
- [ ] Post-test questionnaire
- [ ] Observation checklist
- [ ] Note-taking template
- [ ] Compensation (if applicable)

## Test Script

### 1. Introduction (5 minutes)

**Say to Participant:**

> "Thank you for participating in this user testing session. Today, we'll be testing a new video editor's onboarding tutorial. I want to emphasize that we're testing the tutorial, not you. There are no right or wrong answers.
>
> I'll ask you to complete the onboarding tutorial while thinking aloud - just say what you're thinking as you go through each step. I'll be taking notes and recording the session for analysis.
>
> If you get stuck or confused, that's valuable feedback for us. Feel free to be honest about your experience. Do you have any questions before we start?"

**Recording Consent:**

> "Is it okay if I record your screen and audio for analysis purposes? The recording will only be used internally and will be deleted after 30 days."

### 2. Pre-Test Questionnaire (3 minutes)

Ask participants:

1. **Video Editing Experience**
   - Have you used video editing software before? (Yes/No)
   - If yes, which tools? (iMovie, Premiere Pro, etc.)
   - How often do you edit videos? (Daily/Weekly/Monthly/Rarely/Never)

2. **Tech Proficiency**
   - How comfortable are you with new software? (1-5 scale)
   - Do you usually read tutorials or jump right in? (Tutorial/Jump In)

3. **Expectations**
   - What do you expect to learn from this tutorial?
   - What features are most important to you in a video editor?

### 3. Test Scenario (10-15 minutes)

**Instructions to Participant:**

> "I'm going to show you a video editor for the first time. A tutorial will appear automatically. Please complete the tutorial at your own pace while thinking aloud about what you're seeing and thinking.
>
> Remember:
>
> - Say what you're thinking out loud
> - Point out anything confusing or unclear
> - Read the descriptions naturally (don't feel pressured to rush)
> - If you want to skip, tell me why before you do
>
> Let me know when you're ready, and I'll load the page."

**Load the editor and observe silently.**

### 4. Observation Checklist

As the participant goes through onboarding, note:

#### Step 1: Welcome

- [ ] Reads the full description
- [ ] Understands they can skip
- [ ] Knows arrow keys work
- [ ] Clicks "Next" without hesitation
- **Confusion Points**: \***\*\_\_\_\*\***
- **Quotes**: \***\*\_\_\_\*\***

#### Step 2: Asset Panel

- [ ] Identifies the asset panel
- [ ] Understands drag-and-drop
- [ ] Mentions uploading files
- [ ] Reads full description
- **Confusion Points**: \***\*\_\_\_\*\***
- **Quotes**: \***\*\_\_\_\*\***

#### Step 3: Timeline

- [ ] Understands timeline purpose
- [ ] Recognizes where clips go
- [ ] Mentions arranging/editing
- [ ] Seems engaged
- **Confusion Points**: \***\*\_\_\_\*\***
- **Quotes**: \***\*\_\_\_\*\***

#### Step 4: Preview & Playback

- [ ] Identifies preview area
- [ ] Understands playback controls
- [ ] Mentions video preview
- [ ] Reads description
- **Confusion Points**: \***\*\_\_\_\*\***
- **Quotes**: \***\*\_\_\_\*\***

#### Step 5: Timeline Controls

- [ ] Notices control buttons
- [ ] Mentions zoom/undo
- [ ] Acknowledges keyboard shortcuts
- [ ] Interested in shortcuts
- **Confusion Points**: \***\*\_\_\_\*\***
- **Quotes**: \***\*\_\_\_\*\***

#### Step 6: Grid & Snap

- [ ] Understands grid concept
- [ ] Recognizes snap functionality
- [ ] Mentions precision
- [ ] Remembers shortcut (Cmd+Shift+S)
- **Confusion Points**: \***\*\_\_\_\*\***
- **Quotes**: \***\*\_\_\_\*\***

#### Step 7: Completion

- [ ] Reaches final step
- [ ] Feels confident to start
- [ ] Clicks "Get Started"
- [ ] Positive reaction
- **Confusion Points**: \***\*\_\_\_\*\***
- **Quotes**: \***\*\_\_\_\*\***

### 5. Post-Test Questionnaire (5 minutes)

Ask participants:

1. **Overall Experience**
   - How would you rate the tutorial? (1-5 stars)
   - Was it helpful? (Yes/No/Somewhat)
   - Was it too long, too short, or just right?

2. **Comprehension**
   - Can you tell me the main areas of the editor? (Test recall)
   - What is the timeline used for?
   - Where would you upload a video clip?
   - How would you undo an action?

3. **Specific Feedback**
   - Which step was most helpful?
   - Which step was most confusing?
   - Was any information missing?
   - Would you skip this tutorial if given the choice? Why?

4. **Improvements**
   - What could be improved?
   - What would you add?
   - What would you remove?
   - Any final thoughts?

### 6. Feature Recognition Test (3 minutes)

**Task**: "Without going back to the tutorial, can you show me where you would..."

- [ ] Upload a new video clip
- [ ] Add a clip to the timeline
- [ ] Play the video preview
- [ ] Undo your last action
- [ ] Zoom in on the timeline
- [ ] Access keyboard shortcuts (press "?")

**Score**: \_\_\_ / 6 tasks completed successfully

## Data Collection

### Quantitative Metrics

Track for each participant:

- **Completion**: Did they complete onboarding? (Yes/No)
- **Time**: Total time to complete (mm:ss)
- **Time Per Step**: Time spent on each step
- **Skips**: Did they skip? At which step?
- **Confusion Events**: Number of times they expressed confusion
- **Feature Recognition**: Score out of 6 on recognition test

### Qualitative Observations

Note for each participant:

- **Direct Quotes**: Verbatim reactions and comments
- **Non-Verbal Cues**: Facial expressions, body language
- **Confusion Points**: Specific moments of confusion
- **Positive Reactions**: What they liked
- **Negative Reactions**: What frustrated them
- **Suggestions**: Improvements they mentioned

### Recording Analysis

After the session:

- Review screen recordings for missed observations
- Note precise timestamps of confusion events
- Identify patterns across participants
- Extract notable quotes
- Create video clips of key moments

## Analysis Framework

### Severity Ratings

Rate issues found:

**Critical (P0)**

- Blocks onboarding completion
- Causes abandonment
- Major confusion for 3+ participants
- Requires immediate fix

**High (P1)**

- Significant confusion
- Slows down progress
- Mentioned by 2+ participants
- Should fix before launch

**Medium (P2)**

- Minor confusion
- Slightly unclear
- Mentioned by 1 participant
- Fix in next iteration

**Low (P3)**

- Polish issues
- Nice-to-have improvements
- Cosmetic issues
- Consider for future

### Success Metrics Analysis

Calculate:

- **Completion Rate**: **_ / 5 (_**%)
- **Average Time**: \_\_\_ minutes
- **Feature Recognition**: \_\_\_ / 6 average
- **Satisfaction**: \_\_\_ / 5 average rating
- **Confusion Events**: \_\_\_ average per participant

Compare against success criteria:

- ✅ Met criteria
- ⚠️ Close to criteria
- ❌ Did not meet criteria

## Common Pain Points to Watch For

### Technical Issues

- [ ] Tutorial doesn't appear
- [ ] Highlight box misaligned
- [ ] Tooltip off-screen
- [ ] Keyboard shortcuts don't work
- [ ] Performance lag

### Usability Issues

- [ ] Can't find target elements
- [ ] Descriptions too long/short
- [ ] Unclear instructions
- [ ] Confusing terminology
- [ ] Button placement unclear

### Content Issues

- [ ] Information overload
- [ ] Too many steps
- [ ] Missing context
- [ ] Jargon not explained
- [ ] Inconsistent tone

### Engagement Issues

- [ ] Users skip reading
- [ ] Users seem bored
- [ ] Users click through quickly
- [ ] Users don't engage with features
- [ ] Users express frustration

## Report Template

After testing, create a report:

### Executive Summary

- Participants tested: 5
- Completion rate: \_\_\_\_%
- Average time: \_\_\_ minutes
- Overall satisfaction: \_\_\_ / 5
- Critical issues found: \_\_\_
- Recommendation: [Launch / Fix Critical Issues / Major Revisions Needed]

### Key Findings

**What Worked Well:**

1. ***
2. ***
3. ***

**Critical Issues:**

1. [Issue] - [Severity] - [Frequency] - [Recommendation]
2. ***

**Notable Quotes:**

> "\***\*\_\_\_\*\***" - Participant X

### Recommendations

**Immediate Actions (Before Launch):**

1. ***
2. ***

**Short-term Improvements (Next Sprint):**

1. ***
2. ***

**Long-term Enhancements (Future Iterations):**

1. ***
2. ***

### Appendix

- Participant demographics
- Detailed observation notes
- Video clips of key moments
- Raw survey responses

## Testing Schedule

### Pre-Launch Testing

- **Week 1**: Recruit 5 participants
- **Week 2**: Conduct 5 sessions (1 per day)
- **Week 3**: Analyze results and implement fixes
- **Week 4**: Conduct 3 validation sessions

### Post-Launch Testing

- **Monthly**: Test with 3 new users
- **Quarterly**: Comprehensive usability audit
- **After Major Updates**: Test changed steps with 5 users

## Ethics and Best Practices

### Participant Care

- ✅ Obtain informed consent
- ✅ Explain data usage clearly
- ✅ Allow breaks if needed
- ✅ Don't make participants feel tested
- ✅ Compensate fairly for time
- ✅ Thank participants sincerely

### Data Privacy

- ✅ Anonymize all data
- ✅ Delete recordings after 30 days
- ✅ Secure storage of notes
- ✅ Don't share identifying information
- ✅ Comply with GDPR/privacy laws

### Testing Integrity

- ✅ Don't lead participants
- ✅ Don't explain or help during test
- ✅ Observe objectively
- ✅ Record accurately
- ✅ Don't cherry-pick data
- ✅ Report all findings honestly

## Resources

### Tools

- **Recruiting**: UserTesting, Respondent.io, UserInterviews
- **Screen Recording**: OBS Studio, QuickTime, Loom
- **Notes**: Notion, Google Docs, Miro
- **Analysis**: Dovetail, Airtable, Spreadsheets

### Further Reading

- _Don't Make Me Think_ by Steve Krug
- _The Mom Test_ by Rob Fitzpatrick
- Nielsen Norman Group articles on usability testing
- _Rocket Surgery Made Easy_ by Steve Krug

## Related Documentation

- [Onboarding Metrics](./ONBOARDING_METRICS.md)
- [A/B Testing Service](../lib/services/abTestingService.ts)
- [UserOnboarding Component](../components/UserOnboarding.tsx)
