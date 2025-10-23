// Tool instructions stored server-side
exports.getToolInstructions = () => {
  return `
# Image Storyboard Creator - Tool Instructions

## Purpose
This tool generates detailed image prompts for creating visual storyboards from advertising briefs, ensuring each scene is completely self-contained and ready for AI image generation.

## Overview
The Image Storyboard Creator transforms advertising descriptions and style guidelines into detailed, independent scene prompts suitable for AI image generation. Each prompt must be comprehensive enough to generate consistent, high-quality images without reference to other scenes.

## Input Requirements

### 1. Ad Description (Required)
- A brief, shotlist, or summary of the advertisement
- Must include at minimum a client name
- Should outline the key scenes, narrative, or visual flow
- Can be uploaded as PDF, DOC, DOCX, or TXT file

### 2. Style Block (Optional)
- Visual style guidelines for the imagery
- If not provided, defaults to "Cinematic intimacy"
- Should describe mood, lighting, color palette, camera angles, etc.
- Can be uploaded as PDF, DOC, DOCX, or TXT file

## Scene Generation Rules

### Critical Requirements for Each Scene Prompt
1. **Minimum 200 words per prompt** - Each scene description must be detailed and comprehensive
2. **Complete independence** - No references to other scenes, no "same as before", no sequential dependencies
3. **Consistent character descriptions** - Each character must be described identically across all scenes with the exact same run-on description (approximately 45-65 words)
4. **Single character reference per scene** - Each character should be introduced only ONCE per scene in the format: Name (complete run-on description including demographics, clothing, facial features, and all actions in one continuous sentence). No pronouns, no subsequent references - everything about that character in that scene should be in one long sentence.
5. **No pronouns or "same" references** - Never use pronouns (he/she/they/it) or the word "same" for any objects or people. Always use the full name or description
6. **Full visual context** - Include all styling, mood, lighting, and compositional details in each prompt
7. **Professional camera angles** - Each scene must specify authentic camera angles that a professional commercial producer would use

### Output Format
The tool generates between **6 and 16 scenes** in this exact format:
Scene 1: [detailed 200+ word prompt]
Scene 2: [detailed 200+ word prompt]
...
Scene N: [detailed 200+ word prompt]

### Character Description Format
**Correct:** Jamie (hispanic woman in her 30s with long wavy black hair wearing a bright yellow sundress and white sneakers with warm brown eyes and dimples when smiling) sits on the concrete steps next to a potted plant while laughing and eating cherry tomatoes from a small bowl and glancing at the pizza box on the ground beside her feet.

**Incorrect:** Jamie (hispanic woman in her 30s) enters the room. Jamie walks to the window. She looks outside. The woman turns around and smiles.

### Required Elements in Each Prompt
- Complete character descriptions (physical appearance, clothing, expression, and their single posed action)
- Full environment/setting details
- Specific lighting and mood information
- Camera angle and composition
- Color palette and visual style
- Any relevant props or background elements

## Style Integration
The style block information must be **incorporated directly** into each prompt, not referenced.

## Quality Assurance
The tool performs a two-step generation process:
1. **Initial Generation:** Creates scene prompts based on inputs
2. **Refinement Step:** Reviews and ensures all prompts meet the independence and word count requirements

## Image Generation Options
- **Imagen 3:** Default model for high-quality image generation
- **Imagen 4:** Latest model with enhanced capabilities
- Aspect Ratio: 16:9 (cinematic widescreen)
- Images per Scene: 2 variations
- Format: PNG with embedded prompt metadata
`;
};

exports.getFirstCallInstruction = () => {
  const toolInstructions = exports.getToolInstructions();
  return `Please follow **all** instructions below. If the user supplied a Style Block, replace the default style with that. If they supplied an Ad Description, use it as the baseline.

Before listing scenes, provide a 3-sentence summary of the ad being produced.

Return between **6 and 16** scenes, exactly in this format (but only as many as needed to tell the story within this range):
Scene 1: [prompt]
Scene 2: [prompt]
…
Scene 16: [prompt]

Ensure each prompt reflects the Ad Description's elements.

Checklist (must be met for all scenes):
1) Each image prompt is at least 200 words
2) Each scene is described completely independently from another; there are no references to the 'same' or other scenes
3) Each character must be described identically across all scenes with the exact same run-on description (approximately 45-65 words per character)
4) Each character should appear only ONCE per scene in format: Name (complete run-on description including demographics, clothing, features, and ALL actions in one continuous sentence) - no subsequent references
5) NEVER use pronouns (he/she/they/it) or the word "same" - always use full names or descriptions
6) Camera angles must be professional and authentic for commercials - think carefully about what angle a professional producer would choose for each scene's purpose
If the checklist isn't met, regenerate the scenes until it is.

TOOL INSTRUCTIONS:
${toolInstructions}`.trim();
};

exports.getRevisionInstruction = (initialPromptsText) => {
  return `You are now in a refinement step. Please review the set of image prompts provided below (which were generated in the immediately preceding turn). Your task is to ensure they STRICTLY ADHERE to all original instructions, especially these critical rules for EACH prompt:

1.  **Total Independence:** Each prompt must be a complete, self-contained instruction for an image generator. Eliminate ANY references to other scenes, previous prompts, or sequential actions (e.g., avoid phrases like 'continue with...', 'as before', 'the same character as in Scene X').
2.  **Full Re-description:** All characters, subjects, settings, and specific visual style elements (derived from the original Style Block if provided, or the default style) MUST be fully and explicitly re-described within EACH individual image prompt. Do not assume any implicit knowledge transfer between prompts. Each word of the prompt must be usable by an image generator directly.
3.  **Word Count:** Each prompt must be at least 200 words.
4.  **No External References in Final Prompts**: While you should use the provided Tool Instructions, Style Block, and Ad Description for context, the final image prompts themselves must not contain meta-references *to* these documents (e.g., do not say "refer to the Style Block for X"). Instead, *incorporate* the relevant details directly into each prompt.
5.  **Character Format:** Each character must appear exactly ONCE per scene in the format: Name (complete run-on description of 45-65 words including demographics, clothing, features, and ALL actions/positions in one continuous sentence). The description must be identical across all scenes for consistency. No subsequent references, pronouns, or mentions of the character should appear after this single introduction.
6.  **No Pronouns Rule:** NEVER use pronouns (he, she, they, it) or the word "same" in any context. Always use the full character name or object description.
7.  **Professional Camera Angles:** Each scene MUST specify a professional, authentic camera angle that a commercial producer would actually use. Consider the scene's emotional intent and purpose - use low angles for power/authority, eye-level for relatability, high angles for vulnerability, close-ups for emotion, wide shots for context, tracking shots for movement, etc. Avoid generic or amateur descriptions.

If the provided prompts do not meet these standards, you MUST REWRITE them. Do not explain the changes or add any conversational prefix; simply provide the revised, compliant list of scenes in the original format:
Scene 1: [prompt]
Scene 2: [prompt]
...
Scene 16: [prompt]

Here are the prompts to review and revise:
---
${initialPromptsText}
---
`;
};
