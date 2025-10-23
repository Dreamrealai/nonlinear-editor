/* Import helper functions */
function getFirstCallInstruction() {
  const toolInstructions = `
# Image Storyboard Creator - Tool Instructions

## Purpose
This tool generates detailed image prompts for creating visual storyboards from advertising briefs, ensuring each scene is completely self-contained and ready for AI image generation.

## Overview
The Image Storyboard Creator transforms advertising descriptions and style guidelines into detailed, independent scene prompts suitable for AI image generation. Each prompt must be comprehensive enough to generate consistent, high-quality images without reference to other scenes.

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
`;

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
}

/* Global state */
let storedScenes = [];
const convo = [
  {
    role: 'user',
    parts: [{
      text: `[SYSTEM CONTEXT: You are helping users create and modify visual storyboards. When users ask to "change", "modify", or "edit" something in a scene, they are asking you to REWRITE THE TEXT PROMPT for that scene to incorporate their requested changes. You are NOT directly editing images - you are modifying the text descriptions that will be used to generate new images. Always respond by providing updated scene prompts, not by explaining that you cannot edit images.]`
    }]
  },
  {
    role: 'model',
    parts: [{text: 'Understood. I will help modify scene prompts based on user feedback.'}]
  }
];
let pending = [];
let styleFile = null, adDescriptionFile = null;
let currentAbortController = null; // Still used by apiCall, but polling needs its own control
const generatedImages = {};
const lastGeneratedPrompts = {};
const lastGeneratedModels = {};
let activeJobPolling = true; // True if polling is active, false if paused by user
let currentPollingInfo = { jobId: null, step: 0, lastMessageElement: null };
let isButtonTransformed = false; // Track if button has been transformed to download mode

/* Clear all content and reset to fresh state */
function clearAllContent() {
  if (!confirm('Are you sure you want to clear all content? This will remove all prompts, images, and text.')) {
    return;
  }
  
  // Clear text areas
  qs('#adBriefText').value = '';
  qs('#adBriefText').disabled = false;
  qs('#adBriefText').placeholder = 'Describe your ad here or upload a brief...';
  
  qs('#styleText').value = '';
  qs('#styleText').disabled = false;
  qs('#styleText').placeholder = 'Enter visual style here or upload a file...';
  
  // Clear all prompts
  for (let i = 1; i <= 16; i++) {
    qs(`#p${i}`).value = '';
  }
  
  // Clear file references
  styleFile = null;
  adDescriptionFile = null;
  updateFileIndicator();
  
  // Clear generated images tracking
  Object.keys(generatedImages).forEach(key => delete generatedImages[key]);
  Object.keys(lastGeneratedPrompts).forEach(key => delete lastGeneratedPrompts[key]);
  Object.keys(lastGeneratedModels).forEach(key => delete lastGeneratedModels[key]);
  
  // Clear scenes grid
  qs('#scenesGrid').innerHTML = '';
  
  // Reset conversation to initial state
  convo.length = 2; // Keep only the system context messages
  
  // Clear messages
  qs('#msgs').innerHTML = '<div class="msg ai">Welcome! I\'ll help you create visual storyboards from your ad brief.<br><br>To get started:<br>1. Enter your ad description in the text field above (or upload a file)<br>2. Optionally add visual style details<br>3. Click "Generate Photos" to create your storyboard<br>4. Use "Regenerate All Scenes" to regenerate all existing images<br><br>I\'m here to help refine and adjust your visuals as needed.</div>';
  
  // Clear chat input
  qs('#chatIn').value = '';
  
  // Clear pending files
  pending = [];
  renderChips();
  
  // Clear localStorage states
  localStorage.removeItem('storyboardState');
  localStorage.removeItem('imageEditorState');
  
  // Reset button state
  isButtonTransformed = false;
  const genButton = qs('#genPrompts');
  if (genButton) {
    genButton.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i>&nbsp;Generate Photos';
    genButton.onclick = genPromptBundle;
    genButton.style.background = '';
    genButton.style.color = '';
    genButton.style.borderColor = '';
  }
  
  // Reset global state
  storedScenes = [];
  currentAbortController = null;
  activeJobPolling = true;
  currentPollingInfo = { jobId: null, step: 0, lastMessageElement: null };
  
  addMsg('All content has been cleared. Starting fresh!', 'ai');
}

/* Auto-save state whenever content changes */
function autoSaveState() {
  const storyboardState = {
    adBriefText: qs('#adBriefText').value,
    styleText: qs('#styleText').value,
    prompts: {},
    generatedImages: generatedImages,
    lastGeneratedPrompts: lastGeneratedPrompts,
    lastGeneratedModels: lastGeneratedModels,
    timestamp: Date.now()
  };
  
  // Save all prompts
  for (let i = 1; i <= 16; i++) {
    const prompt = qs(`#p${i}`).value;
    if (prompt) {
      storyboardState.prompts[i] = prompt;
    }
  }
  
  // Save conversation history (limited to last 20 messages to avoid storage limits)
  const recentConvo = convo.slice(-20);
  storyboardState.conversation = recentConvo;
  
  console.log('Auto-saving storyboard state:', storyboardState);
  
  // Store in localStorage
  localStorage.setItem('storyboardState', JSON.stringify(storyboardState));
}

/* State saving and restoration for navigation */
function saveStateAndNavigate(event) {
  event.preventDefault();
  
  // Use the auto-save function
  autoSaveState();
  
  // Navigate to image editor
  window.location.href = 'image-editor.html';
}

window.addEventListener('DOMContentLoaded', async () => {
  /* Initialize UI */
  initializeColumnResizing();

  /* Text input references */
  const adBriefTextarea = qs('#adBriefText');
  const styleTextarea = qs('#styleText');
  
  /* Initialize hidden prompts storage FIRST before trying to restore */
  const hiddenPromptsContainer = qs('#hiddenPrompts');
  for(let i=1;i<=16;i++){
    const hiddenTextarea = document.createElement('textarea');
    hiddenTextarea.id = `p${i}`;
    hiddenTextarea.style.display = 'none';
    hiddenPromptsContainer.appendChild(hiddenTextarea);
  }
  
  let hasRestoredPrompts = false; // Track if we restored prompts
  
  /* Check for saved state and restore if available */
  const savedState = localStorage.getItem('storyboardState');
  if (savedState) {
    try {
      const state = JSON.parse(savedState);
      console.log('Found saved storyboard state:', state);
      
      // Check if state is recent (within 24 hours)
      const stateAge = Date.now() - state.timestamp;
      if (stateAge < 24 * 60 * 60 * 1000) { // 24 hours in milliseconds
        console.log('State is recent, restoring...');
        
        // Restore text fields
        if (state.adBriefText) {
          adBriefTextarea.value = state.adBriefText;
          console.log('Restored ad brief text');
        }
        if (state.styleText) {
          styleTextarea.value = state.styleText;
          console.log('Restored style text');
        }
        
        // Restore prompts
        if (state.prompts) {
          console.log('Restoring prompts:', state.prompts);
          for (const [i, prompt] of Object.entries(state.prompts)) {
            const textarea = qs(`#p${i}`);
            if (textarea) {
              textarea.value = prompt;
              console.log(`Restored prompt ${i}`);
            }
          }
        }
        
        // Restore generated images tracking
        if (state.generatedImages) Object.assign(generatedImages, state.generatedImages);
        if (state.lastGeneratedPrompts) Object.assign(lastGeneratedPrompts, state.lastGeneratedPrompts);
        if (state.lastGeneratedModels) Object.assign(lastGeneratedModels, state.lastGeneratedModels);
        
        // Restore conversation history
        if (state.conversation && Array.isArray(state.conversation)) {
          // Add saved conversations to current convo (after system context)
          convo.push(...state.conversation.slice(2)); // Skip the first 2 system messages
        }
        
        // Check if we have prompts to display
        for (let i = 1; i <= 16; i++) {
          if (qs(`#p${i}`) && qs(`#p${i}`).value.trim()) {
            hasRestoredPrompts = true;
            break;
          }
        }
        
        if (hasRestoredPrompts) {
          // Display scenes without auto-generating
          displayScenesAndGenerate(false, false);
          
          // Restore images after scenes are displayed
          setTimeout(() => {
            console.log('Restoring saved images...');
            for (const [sceneNum, imageData] of Object.entries(state.generatedImages || {})) {
              if (imageData && imageData.images) {
                imageData.images.forEach(imgInfo => {
                  if (imgInfo && imgInfo.url && imgInfo.slot) {
                    const img = qs(`#img-${sceneNum}-${imgInfo.slot}`);
                    const dl = qs(`#dl-${sceneNum}-${imgInfo.slot}`);
                    const ph = qs(`#ph-${sceneNum}-${imgInfo.slot}`);
                    const spin = ph?.querySelector('.spin');
                    
                    if (img && imgInfo.url) {
                      console.log(`Restoring image for scene ${sceneNum}, slot ${imgInfo.slot}`);
                      img.src = imgInfo.url;
                      img.style.display = 'block';
                      if (dl) {
                        dl.style.display = 'block';
                        dl.onclick = () => downloadOne(imgInfo.url, `scene${sceneNum}_${imgInfo.slot}`, imageData.prompt || '');
                      }
                      if (ph) ph.style.background = 'transparent';
                      if (spin) spin.style.visibility = 'hidden';
                    }
                  }
                });
              }
            }
          }, 100); // Small delay to ensure DOM is ready
          
          // Show a message that state was restored
          addMsg('Welcome back! Your previous session has been restored.', 'ai');
        }
      } else {
        // State is too old, clear it
        localStorage.removeItem('storyboardState');
      }
    } catch (e) {
      console.error('Failed to restore state:', e);
      localStorage.removeItem('storyboardState');
    }
  }
  
  /* Initialize scenes grid with placeholder cards only if no state was restored */
  if (!hasRestoredPrompts) {
    initializeScenesGrid();
  }
  
  /* UI wiring */
  qs('#send').onclick = sendChat;
  qs('#pause').onclick = () => {
    activeJobPolling = false; // Stop any active polling loops
    if(currentAbortController) {
      currentAbortController.abort(); // Abort any current apiCall (like a check in progress)
      currentAbortController = null;
    }
    // Remove any "thinking" or "processing" messages related to polling
    if (currentPollingInfo.lastMessageElement && currentPollingInfo.lastMessageElement.parentNode) {
      currentPollingInfo.lastMessageElement.remove();
    }
    addMsg("Prompt generation paused by user.", "ai warn");
    console.log("Polling paused by user.");
  };
  qs('#genPrompts').onclick = genPromptBundle;
  qs('#regenerateAllImages').onclick = regenerateAllImages;
  qs('#attach').onclick = () => qs('#fileInput').click();
  qs('#fileInput').onchange = e => { pending = [...e.target.files]; renderChips(); };
  qs('#uploadStyleBtn').onclick = () => {
    if (styleFile) {
      if (confirm('Replace the current style file?')) {
        styleFile = null;
        styleTextarea.disabled = false;
        styleTextarea.placeholder = 'Enter visual style here or upload a file...';
        updateFileIndicator();
        qs('#styleInput').click();
      }
    } else {
      qs('#styleInput').click();
    }
  };
  qs('#uploadBriefBtn').onclick = () => {
    if (adDescriptionFile) {
      if (confirm('Replace the current brief file?')) {
        adDescriptionFile = null;
        adBriefTextarea.disabled = false;
        adBriefTextarea.placeholder = 'Describe your ad here or upload a brief...';
        updateFileIndicator();
        qs('#briefInput').click();
      }
    } else {
      qs('#briefInput').click();
    }
  };
  qs('#btnCheckpointMoved').onclick = () => qs('#checkpointInput').click();
  qs('#clearAllBtn').onclick = clearAllContent;
  
  // Save text content when user types
  adBriefTextarea.addEventListener('input', () => {
    if (adDescriptionFile && !adBriefTextarea.disabled) {
      adDescriptionFile = null;
      updateFileIndicator();
    }
  });
  
  styleTextarea.addEventListener('input', () => {
    if (styleFile && !styleTextarea.disabled) {
      styleFile = null;
      updateFileIndicator();
    }
  });
  
  qs('#styleInput').onchange = () => handleFile('style');
  qs('#briefInput').onchange = () => handleFile('brief');
  qs('#checkpointInput').onchange = () => handleCheckpoint();
  qs('#chatIn').addEventListener('keydown', e => { if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); sendChat(); }});
  
  /* Event delegation for scene regenerate buttons */
  document.addEventListener('click', (e) => {
    if (e.target.closest('.scene-regen-btn')) {
      const btn = e.target.closest('.scene-regen-btn');
      const sceneNum = btn.dataset.scene;
      const prompt = qs(`#p${sceneNum}`).value.trim();
      
      if (prompt) {
        generateSceneImages(sceneNum, prompt);
      } else {
        alert(`No prompt found for Scene ${sceneNum}`);
      }
    }
  });
  
  /* Handle paste events for images */
  qs('#chatIn').addEventListener('paste', async (e) => {
    const items = e.clipboardData.items;
    const imageFiles = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const extension = file.type.split('/')[1];
          const renamedFile = new File([file], `pasted-image-${timestamp}.${extension}`, { type: file.type });
          imageFiles.push(renamedFile);
        }
      }
    }
    
    if (imageFiles.length > 0) {
      pending.push(...imageFiles);
      renderChips();
      const count = imageFiles.length;
      const plural = count > 1 ? 's' : '';
      addMsg(`${count} image${plural} pasted and ready to send`, 'ai');
    }
  });
});

/* Simplified prompt generation function with async polling */
async function genPromptBundle() {
  // Reset button transformation flag for new generation
  isButtonTransformed = false;
  
  // Check for Ad Description - if file is uploaded, we'll use it directly
  let hasAdDescription = false;
  let adDescriptionText = '';
  
  if (adDescriptionFile) {
    hasAdDescription = true;
    // File will be included in the conversation
  } else {
    adDescriptionText = qs('#adBriefText').value.trim();
    hasAdDescription = !!adDescriptionText;
  }
  
  if (!hasAdDescription) {
    alert('Please provide an Ad Description (either upload a file or enter text)');
    return;
  }
  
  // Check for style - optional
  let styleText = '';
  if (!styleFile) {
    styleText = qs('#styleText').value.trim();
  }
  
  // Add user message
  addMsg('<em>Generate Photos</em> request sent.', 'user');
  
  // Add initial thinking message
  const thinkingMsg = addMsg('Analyzing brief and generating storyboard... this could take 2-3 minutes', 'ai thinking');
  
  // Disable generate button and show loading state
  const genPromptsBtn = qs('#genPrompts');
  genPromptsBtn.disabled = true;
  genPromptsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>&nbsp;Generating...';
  
  try {
    let initialData;
    
    // If files are uploaded, we need to use the chat endpoint
    if (adDescriptionFile || styleFile) {
      console.log('Using chat endpoint for file-based generation');
      
      // Build conversation for Gemini with files
      const parts = [];
      
      // Add text instruction
      parts.push({
        text: `Please analyze the following ad description${styleFile ? ' and visual style reference' : ''} and generate 8-10 detailed scene prompts for image generation.

${getFirstCallInstruction()}`
      });
      
      // Add ad description - either as file or text
      if (adDescriptionFile) {
        const fileTypeDisplay = getFileTypeDisplay(adDescriptionFile.type, adDescriptionFile.name);
        parts.push({ text: `\nAd Description (from uploaded ${fileTypeDisplay}):` });
        const b64 = await blobToB64(adDescriptionFile);
        parts.push({ inlineData: { mimeType: adDescriptionFile.type, data: b64 } });
      } else {
        parts.push({ text: `\nAd Description:\n${adDescriptionText}` });
      }
      
      // Add style if provided
      if (styleFile) {
        const fileTypeDisplay = getFileTypeDisplay(styleFile.type, styleFile.name);
        parts.push({ text: `\nVisual Style Reference (from uploaded ${fileTypeDisplay}):` });
        const b64 = await blobToB64(styleFile);
        parts.push({ inlineData: { mimeType: styleFile.type, data: b64 } });
        
        // Add special instructions for visual style files
        parts.push({ text: `\n\nIMPORTANT: The visual style file above should be carefully analyzed and incorporated into EVERY scene prompt. Extract key visual elements, color palettes, composition styles, lighting preferences, and any other stylistic details mentioned. Ensure all generated scenes maintain visual consistency with this style reference.` });
      } else if (styleText) {
        parts.push({ text: `\nVisual Style Elements:\n${styleText}` });
      } else {
        parts.push({ text: '\nVisual Style Elements:\nCinematic intimacy' });
      }
      
      // Make the API call
      const response = await apiCall('chat', 'POST', {
        convo: [{ role: 'user', parts }]
      });
      
      if (!response.reply) {
        throw new Error('No response from AI');
      }
      
      initialData = {
        prompts: response.reply,
        success: true
      };
      
    } else {
