    
    if (!initialData.prompts) {
      throw new Error('No initial prompts received from server');
    }
    
    // Update message
    const almostDoneMsg = addMsg('Almost done! We\'re just doing a final check...', 'ai thinking');
    
    // Step 2: Refinement (always use sync for refinement as it's faster)
    const response2 = await fetch('/.netlify/functions/generate-prompts-simple', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        initialPrompts: initialData.prompts,
        step: 'refine'
      })
    });
    
    let finalPrompts = initialData.prompts;
    
    if (response2.ok) {
      const refinedData = await response2.json();
      if (refinedData.prompts) {
        finalPrompts = refinedData.prompts;
      }
    } else {
      // If refinement fails, just use initial prompts
      addMsg('Note: Using initial prompts (refinement step encountered an issue)', 'ai warn');
    }
    
    // Remove thinking messages
    if (thinkingMsg && thinkingMsg.parentNode) {
      thinkingMsg.remove();
    }
    if (almostDoneMsg && almostDoneMsg.parentNode) {
      almostDoneMsg.remove();
    }
    
    // Process the prompts
    const scenes = extractScenesInternalSilent(finalPrompts);
    
    if (scenes.length === 0) {
      throw new Error('No valid scenes found in the generated prompts');
    }
    
    // Store prompts in hidden textareas
    for (let i = 1; i <= 16; i++) {
      const textarea = qs(`#p${i}`);
      if (i <= scenes.length && scenes[i - 1]) {
        textarea.value = scenes[i - 1].trim();
      } else {
        textarea.value = '';
      }
    }
    
    // Store the scenes for reuse
    storedScenes = scenes;
    
    // Display the scenes
    displayScenesAndGenerate(true);
    
    // Auto-save state after generating prompts
    autoSaveState();
    
    // Generate images for all scenes
    genAllScenes();
    
    // Check if there was a warning
    if (initialData.warning) {
      addMsg(`Note: ${initialData.warning}`, "ai warn");
    }
    
  } catch (error) {
    console.error('Error generating prompts:', error);
    
    // Remove thinking messages
    if (thinkingMsg && thinkingMsg.parentNode) {
      thinkingMsg.remove();
    }
    
    let errorMessage = 'Error generating prompts: ';
    
    if (error.name === 'AbortError') {
      errorMessage = '⏱️ Request timed out. The server is taking longer than expected. Please try again with a simpler brief, or check your internet connection.';
    } else if (error.message && error.message.includes('timeout')) {
      errorMessage = '⏱️ The AI service took longer than expected. This sometimes happens with complex prompts. Please try again, or try simplifying your ad brief.';
    } else if (error.message && error.message.includes('network')) {
      errorMessage = '🌐 Network connection failed. Please check your internet and try again.';
    } else if (error.message && error.message.includes('API key')) {
      errorMessage = '⚙️ Service configuration error. Please contact support.';
    } else {
      errorMessage += (error.message || 'An unexpected error occurred.');
    }
    
    addMsg(errorMessage, 'ai err');
  } finally {
    // Re-enable generate button
    genPromptsBtn.disabled = false;
    genPromptsBtn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i>&nbsp;Generate Photos';
    // Reset styling to original
    genPromptsBtn.style.background = '';
    genPromptsBtn.style.color = '';
    genPromptsBtn.style.borderColor = '';
  }
}

// Silent version of extractScenesInternal that doesn't look for DOM elements
function extractScenesInternalSilent(textToParse) {
  if(!textToParse) {
    console.error('No text provided to extract scenes from');
    return [];
  }
  
  const scenes = [];
  const lines = textToParse.split(/\r?\n/);
  let cur = 0, buf = [];
  const flush = () => {
    if(cur && cur <= 16) {
      scenes[cur - 1] = buf.join(' ').trim();
    }
    buf = [];
  };
  
  for(const l of lines){
    const m = l.match(/^Scene\s*(\d+)\s*[:\-]\s*(.*)$/i);
    if(m){
      flush();
      cur = +m[1];
      buf.push(m[2]);
    } else if(cur) {
      buf.push(l.trim());
    }
  }
  flush();
  
  return scenes;
}

/* Extract scenes internally from the latest AI response */
// Modified to potentially accept text directly, or default to current DOM scan
function extractScenesInternal(textToParse){
  let contentToParse = textToParse;
  if (!contentToParse) {
    const latestAIReply = [...document.querySelectorAll('.msg.ai:not(.thinking):not(.err):not(.warn)')].pop();
    if (latestAIReply) {
      // Prefer textContent for potentially cleaner text if marked.parse was used.
      contentToParse = latestAIReply.textContent || latestAIReply.innerText;
    }
  }

  if(!contentToParse) {
    addMsg('Could not find text to extract scenes from.', 'ai warn');
    return;
  }
  
  const lines = contentToParse.split(/\r?\n/);
  let cur = 0, buf = [];
  const flush = () => {
    if(cur && cur <= 16) qs(`#p${cur}`).value = buf.join(' ').trim();
    buf = [];
  };
  
  for(const l of lines){
    const m = l.match(/^Scene\s*(\d+)\s*[:\-]\s*(.*)$/i);
    if(m){
      flush();
      cur = +m[1];
      buf.push(m[2]);
    } else if(cur) {
      buf.push(l.trim());
    }
  }
  flush();
  
  // After extracting, display scenes and start generating images
  displayScenesAndGenerate();
}

/* Display scenes and automatically generate images */
function displayScenesAndGenerate(showSuccessMessage = true, autoGenerate = true) {
  // Remove any "Almost done" thinking messages
  const thinkingMessages = document.querySelectorAll('.msg.ai.thinking');
  thinkingMessages.forEach(msg => {
    if (msg.textContent.includes('Almost done') || msg.textContent.includes('Analyzing brief')) {
      msg.remove();
    }
  });
  
  const scenesGrid = qs('#scenesGrid');
  scenesGrid.innerHTML = '';
  let sceneCount = 0;
  
  for(let i = 1; i <= 16; i++) {
    const prompt = qs(`#p${i}`).value.trim();
    if(prompt) {
      sceneCount++;
      const card = document.createElement('div');
      card.className = 'scene-wrapper';
      card.id = `scene-${i}`;
      card.style.opacity = '1';
      
      card.innerHTML = `
        <div class="scene-header" style="margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 14px; font-weight: 600; color: var(--primary-text);">Scene ${i}</span>
          <button class="scene-regen-btn" data-scene="${i}" style="background: transparent; border: 1px solid var(--border-color); border-radius: 50%; width: 24px; height: 24px; padding: 0; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s ease;"><i class="fas fa-sync-alt" style="font-size: 10px; color: var(--secondary-text);"></i></button>
        </div>
        <div class="images">
          <div class="ph" id="ph-${i}-1">
            <div class="spin" style="visibility: ${autoGenerate ? 'visible' : 'hidden'};"></div>
            <img id="img-${i}-1" class="img">
            <button id="dl-${i}-1" class="dl" style="display:none;"><i class="fas fa-download"></i></button>
          </div>
          <div class="ph" id="ph-${i}-2">
            <div class="spin" style="visibility: ${autoGenerate ? 'visible' : 'hidden'};"></div>
            <img id="img-${i}-2" class="img">
            <button id="dl-${i}-2" class="dl" style="display:none;"><i class="fas fa-download"></i></button>
          </div>
        </div>
      `;
      
      scenesGrid.appendChild(card);
      
      // Only generate images if autoGenerate is true
      if (autoGenerate) {
        // Generate images for this scene with staggered timing
        setTimeout(() => {
          generateSceneImages(i, prompt);
        }, (sceneCount-1) * 500);
      }
    }
  }
  
  if(sceneCount > 0 && showSuccessMessage) {
    // Don't transform button here - wait until images are generated
  } else if(sceneCount === 0) {
    addMsg('No scenes found to generate.', 'ai err');
  }
}

/* Regenerate specific scenes without rebuilding DOM */
function regenerateSpecificScenes(sceneNumbers) {
  sceneNumbers.forEach((sceneNum, index) => {
    const prompt = qs(`#p${sceneNum}`).value.trim();
    if (prompt) {
      // Check if scene card exists
      const sceneCard = qs(`#scene-${sceneNum}`);
      if (!sceneCard) {
        // Create the scene card if it doesn't exist
        const scenesGrid = qs('#scenesGrid');
        const card = document.createElement('div');
        card.className = 'scene-wrapper';
        card.id = `scene-${sceneNum}`;
        card.style.opacity = '1';
        
        card.innerHTML = `
          <div class="scene-header" style="margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 14px; font-weight: 600; color: var(--primary-text);">Scene ${sceneNum}</span>
            <button class="scene-regen-btn" data-scene="${sceneNum}" style="background: transparent; border: 1px solid var(--border-color); border-radius: 50%; width: 24px; height: 24px; padding: 0; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s ease;"><i class="fas fa-sync-alt" style="font-size: 10px; color: var(--secondary-text);"></i></button>
          </div>
          <div class="images">
            <div class="ph" id="ph-${sceneNum}-1">
              <div class="spin" style="visibility: visible;"></div>
              <img id="img-${sceneNum}-1" class="img">
              <button id="dl-${sceneNum}-1" class="dl" style="display:none;"><i class="fas fa-download"></i></button>
            </div>
            <div class="ph" id="ph-${sceneNum}-2">
              <div class="spin" style="visibility: visible;"></div>
              <img id="img-${sceneNum}-2" class="img">
              <button id="dl-${sceneNum}-2" class="dl" style="display:none;"><i class="fas fa-download"></i></button>
            </div>
          </div>
        `;
        
        // Insert in proper position
        let inserted = false;
        const existingCards = scenesGrid.querySelectorAll('.scene-wrapper');
        existingCards.forEach(existingCard => {
          const existingNum = parseInt(existingCard.id.replace('scene-', ''));
          if (existingNum > sceneNum && !inserted) {
            scenesGrid.insertBefore(card, existingCard);
            inserted = true;
          }
        });
        if (!inserted) {
          scenesGrid.appendChild(card);
        }
      }
      
      // Regenerate images with delay
      setTimeout(() => {
        generateSceneImages(sceneNum, prompt);
      }, index * 500);
    }
  });
}

/* Generate all scenes function - only generates new scenes */
function genAllScenes(){
  let hasPrompts = false;
  let newScenesCount = 0;
  
  for(let i=1;i<=16;i++){
    const p = qs(`#p${i}`).value.trim();
    if(p) {
      hasPrompts = true;
      // Check if this scene has already been generated
      const lastPrompt = lastGeneratedPrompts[i];
      
      // Only generate if: never generated or prompt changed
      // (model comparison no longer applies since we always use both models)
      if (!lastPrompt || lastPrompt !== p) {
        newScenesCount++;
        setTimeout(() => {
          generateSceneImages(i, p);
        }, (newScenesCount-1) * 500);
      }
    }
  }
  
  if(!hasPrompts) {
    alert('No prompts found. Please generate prompts first.');
  } else if(newScenesCount === 0) {
    addMsg('No new scenes to generate. All current scenes have been generated with the current prompts.', 'ai');
  } else {
    addMsg(`Generating images for ${newScenesCount} scene${newScenesCount > 1 ? 's' : ''}...`, 'ai');
  }
}

/* Regenerate all images function - regenerates all existing images */
function regenerateAllImages(){
  let hasImages = false;
  let regenCount = 0;
  
  for(let i=1;i<=16;i++){
    const p = qs(`#p${i}`).value.trim();
    // Check if this scene has been generated before
    if(p && lastGeneratedPrompts[i]) {
      hasImages = true;
      regenCount++;
      setTimeout(() => {
        generateSceneImages(i, p);
      }, (regenCount-1) * 500);
    }
  }
  
  if(!hasImages) {
    alert('No images to regenerate. Please generate some images first.');
  } else {
    addMsg(`Regenerating ${regenCount} scene${regenCount > 1 ? 's' : ''}...`, 'ai');
  }
}

/* Generate images for a specific scene */
async function generateSceneImages(n, p) {
  // Use Imagen 4 for first column, Imagen 3 for second column
  const models = ['imagen4', 'imagen3'];
  
  // Show spinners
  spin(n,1,true);
  spin(n,2,true);
  
  lastGeneratedPrompts[n] = p;
  // Store both models used
  lastGeneratedModels[n] = 'imagen4,imagen3';
  
  try{
    // Generate images with different models for each slot
    const promises = models.map((model, index) => 
      apiCall('generate-images', 'POST', { 
        prompt: p, 
        model: model, 
        num_images: 1, 
        aspect_ratio: '16:9'
      })
    );
    
    const results = await Promise.all(promises);
    
    // Initialize or update generatedImages entry for this scene
    if (!generatedImages[n]) {
      generatedImages[n] = {
        prompt: p,
        images: []
      };
    }
    generatedImages[n].prompt = p;
    generatedImages[n].images = [];
    
    results.forEach((result, index) => {
      const slot = index + 1;
      const u = result.images?.[0]?.url;
      if(u) {
        show(n, slot, u, p);
        
        // Store image info in generatedImages
        generatedImages[n].images.push({
          slot: slot,
          url: u,
          model: models[index]
        });
        
        // Transform button after first successful image generation
        if (!isButtonTransformed) {
          isButtonTransformed = true;
          const genButton = qs('#genPrompts');
          if (genButton) {
            genButton.innerHTML = '<i class="fas fa-download"></i>&nbsp;Download All & Save Checkpoint';
            genButton.onclick = downloadAll;
            // Apply dark grey styling
            genButton.style.background = '#495057'; // Dark grey background
            genButton.style.color = '#ffffff'; // White text
            genButton.style.borderColor = '#495057'; // Dark grey border
          }
        }
      } else {
        err(n, slot, 'No image URL returned');
      }
    });
    
    // Auto-save state after successfully generating images
    autoSaveState();
  }catch(e){
    console.error('Image generation error:', e);
    const errorMsg = e.message || 'Network error';
    err(n,1,errorMsg);
    err(n,2,errorMsg);
  }
}

/* Handle file upload */
async function handleFile(type){
  const inp = type === 'style' ? qs('#styleInput') : qs('#briefInput');
  const file = inp.files[0];
  if(!file) return;
  
  // Ensure correct MIME type for common files
  let mimeType = file.type;
  if (!mimeType || mimeType === 'application/octet-stream') {
    // Determine MIME type from file extension
    const ext = file.name.split('.').pop().toLowerCase();
    switch(ext) {
      case 'pdf':
        mimeType = 'application/pdf';
        break;
      case 'doc':
        mimeType = 'application/msword';
        break;
      case 'docx':
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      case 'txt':
        mimeType = 'text/plain';
        break;
      case 'rtf':
        mimeType = 'application/rtf';
        break;
      case 'odt':
        mimeType = 'application/vnd.oasis.opendocument.text';
        break;
      case 'md':
        mimeType = 'text/markdown';
        break;
      case 'csv':
        mimeType = 'text/csv';
        break;
      case 'json':
        mimeType = 'application/json';
        break;
      case 'xml':
        mimeType = 'application/xml';
        break;
      default:
        mimeType = 'application/octet-stream';
    }
  }
  
  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    alert(`File is too large. Maximum size is 10MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`);
    return;
  }
  
  const b64 = await blobToB64(file);
  
  // Create a more descriptive message for the conversation
  const fileInfo = `${type === 'style' ? 'Visual Style' : 'Ad Brief'} file: "${file.name}" (${(file.size / 1024).toFixed(1)}KB)`;
  
  convo.push({role: 'user', parts: [{text: `[${fileInfo} uploaded]`}, {inlineData: {mimeType: mimeType, data: b64}}]});
  addMsg(`<em>${escape(file.name)}</em> uploaded as ${type === 'style' ? 'visual style reference' : 'ad brief'}.`, 'user');
  
  // Provide more informative feedback
  const fileTypeDisplay = getFileTypeDisplay(mimeType, file.name);
  addMsg(`Received ${fileTypeDisplay}. This will be used when generating photos.`, 'ai');
  convo.push({role: 'model', parts: [{text: `Received ${fileTypeDisplay}. I'll analyze this when generating the storyboard.`}]});
  
  // Store the file with the corrected MIME type
  const fileWithCorrectType = new File([file], file.name, { type: mimeType });
  
  // Read text content for text-based files
  let fileText = null;
  const textFormats = ['text/plain', 'text/markdown', 'text/csv', 'application/json', 'application/xml'];
  if (textFormats.includes(mimeType) || file.name.match(/\.(txt|md|csv|json|xml)$/i)) {
    try {
      fileText = await fileWithCorrectType.text();
    } catch (e) {
      console.warn('Could not read text content from file:', e);
    }
  }
  
  if(type === 'style'){
    styleFile = fileWithCorrectType;
    if (fileText) styleFile.text = fileText; // Store text content if available
    updateFileIndicator();
    // Disable text input when file is uploaded
    qs('#styleText').disabled = true;
    qs('#styleText').placeholder = `Style file uploaded: ${file.name}`;
  }else{
    adDescriptionFile = fileWithCorrectType;
    if (fileText) adDescriptionFile.text = fileText; // Store text content if available
    updateFileIndicator();
    // Disable text input when file is uploaded
    qs('#adBriefText').disabled = true;
    qs('#adBriefText').placeholder = `Brief file uploaded: ${file.name}`;
  }
}

/* Helper function to get friendly file type display */
function getFileTypeDisplay(mimeType, fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  const typeMap = {
    'application/pdf': 'PDF document',
    'application/msword': 'Word document',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word document',
    'text/plain': 'text file',
    'application/rtf': 'RTF document',
    'application/vnd.oasis.opendocument.text': 'OpenDocument text',
    'text/markdown': 'Markdown file',
    'text/csv': 'CSV file',
    'application/json': 'JSON file',
    'application/xml': 'XML file'
  };
  return typeMap[mimeType] || `${ext.toUpperCase()} file`;
}

/* Handle checkpoint JSON upload and restoration */
async function handleCheckpoint() {
  const inp = qs('#checkpointInput');
  const file = inp.files[0];
  if (!file) return;
  
  addMsg(`<em>${escape(file.name)}</em> checkpoint uploaded. Processing...`, 'user');
  
  try {
    const text = await file.text();
    const checkpoint = JSON.parse(text);
    
    // Validate checkpoint format
    if (!checkpoint.version || !checkpoint.scenes) {
      throw new Error('Invalid checkpoint file format');
    }
    
    // Clear existing data
    for(let i = 1; i <= 16; i++) {
      qs(`#p${i}`).value = '';
    }
    
    // Restore prompts and update generatedImages
    Object.keys(checkpoint.scenes).forEach(sceneKey => {
      const scene = checkpoint.scenes[sceneKey];
      const sceneNum = scene.number;
      
      // Restore prompt
      if (scene.prompt) {
        qs(`#p${sceneNum}`).value = scene.prompt;
      }
      
      // Restore image data to generatedImages object
      if (scene.images && scene.images.length > 0) {
        generatedImages[sceneNum.toString()] = {
          prompt: scene.prompt,
          images: scene.images
        };
        
        // Display images if URLs are accessible
        scene.images.forEach(imgData => {
          const img = qs(`#img-${sceneNum}-${imgData.slot}`);
          const dl = qs(`#dl-${sceneNum}-${imgData.slot}`);
          const ph = qs(`#ph-${sceneNum}-${imgData.slot}`);
          
          if (img && imgData.url) {
            img.src = imgData.url;
            img.style.display = 'block';
            dl.style.display = 'block';
            ph.style.background = 'transparent';
            dl.onclick = () => downloadOne(imgData.url, `scene${sceneNum}_${imgData.slot}`, scene.prompt);
          }
        });
      }
    });
    
    // Also restore the full generatedImages object if available
    if (checkpoint.generatedImages) {
      Object.assign(generatedImages, checkpoint.generatedImages);
    }
    
    // Create summary message
    let summaryMsg = '<strong>Checkpoint Restored Successfully!</strong><br><br>';
    summaryMsg += `Checkpoint created: ${new Date(checkpoint.created).toLocaleString()}<br><br>`;
    summaryMsg += 'The following scenes have been loaded:<br>';
    
    Object.keys(checkpoint.scenes).forEach(sceneKey => {
      const scene = checkpoint.scenes[sceneKey];
      const preview = scene.prompt.substring(0, 60);
      summaryMsg += `<br>• <strong>Scene ${scene.number}:</strong> ${escape(preview)}...`;
      if (scene.images && scene.images.length > 0) {
        summaryMsg += ` (${scene.images.length} images)`;
      }
    });
    
    summaryMsg += '<br><br>All prompts and images are now available for reference in the chat.';
    addMsg(summaryMsg, 'ai');
    
    // Update conversation with all scene data for chat reference
    let contextText = 'Checkpoint restored with the following scenes:\n\n';
    Object.keys(checkpoint.scenes).forEach(sceneKey => {
      const scene = checkpoint.scenes[sceneKey];
      contextText += `Scene ${scene.number}:\n${scene.prompt}\n\n`;
    });
    
    convo.push({
      role: 'user',
      parts: [{text: `[Checkpoint JSON uploaded - all scenes and prompts restored]\n\n${contextText}`}]
    });
    convo.push({
      role: 'model',
      parts: [{text: summaryMsg}]
    });
    
    // Restore file references if mentioned
    if (checkpoint.styleFile) {
      addMsg(`Note: Original style file was "${escape(checkpoint.styleFile.name)}"`, 'ai');
    }
    if (checkpoint.adDescriptionFile) {
      addMsg(`Note: Original ad description file was "${escape(checkpoint.adDescriptionFile.name)}"`, 'ai');
    }
    
    // Display the restored scenes
    displayRestoredScenes();
    
  } catch (e) {
    addMsg('Error processing checkpoint: ' + e.message, 'ai err');
    console.error('Checkpoint restore error:', e);
  }
}

/* Display restored scenes from checkpoint */
function displayRestoredScenes() {
  const scenesGrid = qs('#scenesGrid');
  scenesGrid.innerHTML = '';
  
  for(let i = 1; i <= 16; i++) {
    const prompt = qs(`#p${i}`).value.trim();
    if(prompt) {
      const card = document.createElement('div');
      card.className = 'scene-wrapper';
      card.id = `scene-${i}`;
      card.style.opacity = '1';
      
      card.innerHTML = `
        <div class="scene-header" style="margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 14px; font-weight: 600; color: var(--primary-text);">Scene ${i}</span>
          <button class="scene-regen-btn" data-scene="${i}" style="background: transparent; border: 1px solid var(--border-color); border-radius: 50%; width: 24px; height: 24px; padding: 0; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s ease;"><i class="fas fa-sync-alt" style="font-size: 10px; color: var(--secondary-text);"></i></button>
        </div>
        <div class="images">
          <div class="ph" id="ph-${i}-1">
            <div class="spin"></div>
            <img id="img-${i}-1" class="img">
            <button id="dl-${i}-1" class="dl" style="display:none;"><i class="fas fa-download"></i></button>
          </div>
          <div class="ph" id="ph-${i}-2">
            <div class="spin"></div>
            <img id="img-${i}-2" class="img">
            <button id="dl-${i}-2" class="dl" style="display:none;"><i class="fas fa-download"></i></button>
          </div>
        </div>
      `;
      
      scenesGrid.appendChild(card);
    }
  }
}

/* Send chat */
async function sendChat(){
  const txt = qs('#chatIn').value.trim();
  if(!txt && !pending.length) return;
  
  // Enhanced scene pattern to catch more variations
  const scenePatterns = [
    /(?:scene|Scene|SCENE)\s*#?(\d+)/gi,
    /(?:scene|Scene|SCENE)(\d+)/gi,
    /#(\d+)\s*(?:scene|Scene|SCENE)/gi,
    /(?:image|Image|IMAGE)\s*#?(\d+)/gi,
    /^(\d+):/gm,  // Shorthand: "1:", "2:", "3:", etc.
    /(?:first|1st)\s+(?:scene|Scene|SCENE)/gi,
    /(?:second|2nd)\s+(?:scene|Scene|SCENE)/gi,
    /(?:third|3rd)\s+(?:scene|Scene|SCENE)/gi,
    /(?:fourth|4th)\s+(?:scene|Scene|SCENE)/gi,
    /(?:fifth|5th)\s+(?:scene|Scene|SCENE)/gi,
    /(?:sixth|6th)\s+(?:scene|Scene|SCENE)/gi,
    /(?:seventh|7th)\s+(?:scene|Scene|SCENE)/gi,
    /(?:eighth|8th)\s+(?:scene|Scene|SCENE)/gi,
    /(?:ninth|9th)\s+(?:scene|Scene|SCENE)/gi,
    /(?:tenth|10th)\s+(?:scene|Scene|SCENE)/gi,
    /(?:scene|Scene|SCENE)\s+(?:one|1)/gi,
    /(?:scene|Scene|SCENE)\s+(?:two|2)/gi,
    /(?:scene|Scene|SCENE)\s+(?:three|3)/gi,
    /(?:scene|Scene|SCENE)\s+(?:four|4)/gi,
    /(?:scene|Scene|SCENE)\s+(?:five|5)/gi,
    /(?:scene|Scene|SCENE)\s+(?:six|6)/gi,
    /(?:scene|Scene|SCENE)\s+(?:seven|7)/gi,
    /(?:scene|Scene|SCENE)\s+(?:eight|8)/gi,
    /(?:scene|Scene|SCENE)\s+(?:nine|9)/gi,
    /(?:scene|Scene|SCENE)\s+(?:ten|10)/gi,
    /(?:all|All|ALL)\s+(?:scenes|Scenes|SCENES)/gi,
    /(?:every|Every|EVERY)\s+(?:scene|Scene|SCENE)/gi
  ];
  
  const referencedScenes = new Set();
  const isAllScenes = /(?:all|All|ALL|every|Every|EVERY)\s+(?:scenes?|Scenes?|SCENES?)/i.test(txt);
  
  // Map ordinal/word numbers to digits
  const ordinalMap = {
    'first': 1, '1st': 1, 'one': 1,
    'second': 2, '2nd': 2, 'two': 2,
    'third': 3, '3rd': 3, 'three': 3,
    'fourth': 4, '4th': 4, 'four': 4,
    'fifth': 5, '5th': 5, 'five': 5,
    'sixth': 6, '6th': 6, 'six': 6,
    'seventh': 7, '7th': 7, 'seven': 7,
    'eighth': 8, '8th': 8, 'eight': 8,
    'ninth': 9, '9th': 9, 'nine': 9,
    'tenth': 10, '10th': 10, 'ten': 10
  };
  
  // Parse scene references
  for (const pattern of scenePatterns) {
    const matches = txt.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        const sceneNum = parseInt(match[1]);
        if (sceneNum >= 1 && sceneNum <= 16) {
          referencedScenes.add(sceneNum);
        }
      } else {
        // Check for ordinal references
        const ordinalMatch = match[0].match(/(?:first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|sixth|6th|seventh|7th|eighth|8th|ninth|9th|tenth|10th|one|two|three|four|five|six|seven|eight|nine|ten)/i);
        if (ordinalMatch) {
          const num = ordinalMap[ordinalMatch[0].toLowerCase()];
          if (num) referencedScenes.add(num);
        }
      }
    }
  }
  
  // If "all scenes" is mentioned, add all scenes that have prompts
  if (isAllScenes) {
    for (let i = 1; i <= 16; i++) {
      if (qs(`#p${i}`).value.trim()) {
        referencedScenes.add(i);
      }
    }
  }
  
  const uniqueScenes = Array.from(referencedScenes);
  
  let html = escape(txt);
  if(pending.length) html += `<ul>${pending.map(f => `<li>${escape(f.name)}</li>`).join('')}</ul>`;
  if(uniqueScenes.length > 0) {
    html += `<br><em>Analyzing Scene${uniqueScenes.length > 1 ? 's' : ''}: ${uniqueScenes.join(', ')}</em>`;
  }
  addMsg(html, 'user');
  
  const parts = [{text: txt}];
  
  // Handle manually attached files
  for(const file of pending) {
    const b64 = await blobToB64(file);
    parts.push({inlineData: {mimeType: file.type || 'application/octet-stream', data: b64}});
  }
  
  // Add referenced scene images and prompts
  for (const sceneNum of uniqueScenes) {
    const prompt = qs(`#p${sceneNum}`).value.trim();
    if (prompt) {
      // Add the prompt text
      parts.push({
        text: `\n[Scene ${sceneNum} Current Prompt]: ${prompt}\n`
      });
      
      // Add the first image if it exists (for analysis)
      const img = qs(`#img-${sceneNum}-1`);
      if (img && img.src) {
        try {
          const response = await fetch(img.src);
          const blob = await response.blob();
          const b64 = await blobToB64(blob);
          
          parts.push({
            text: `\n[Current Image from Scene ${sceneNum}]`
          });
          parts.push({
            inlineData: {
              mimeType: blob.type || 'image/png',
              data: b64
            }
          });
        } catch (e) {
          console.error(`Failed to fetch image for Scene ${sceneNum}:`, e);
        }
      }
    }
  }
  
  // STEP 1: Ask Gemini to determine which scenes should actually be changed
  let approvedScenesToChange = [];
  if (uniqueScenes.length > 0) {
    const analysisPrompt = `SCENE CHANGE ANALYSIS:
    
User Request: "${txt}"
Referenced Scenes: ${uniqueScenes.join(', ')}
    
Please analyze this user request carefully and determine ONLY the scenes that should actually be modified based on their specific feedback. 
    
Rules:
- If they mention a specific scene number (like "scene 2" or "2:"), usually only that scene should be changed
- If they say "all scenes" explicitly, then all scenes with content should be changed
- If they mention general feedback without specific scenes, determine which scenes are most relevant
- Be VERY conservative - when in doubt, change fewer scenes rather than more
- Consider the context and intent of the user's request
    
Respond with ONLY a comma-separated list of scene numbers that should be changed. Nothing else.
Examples: "2" or "1,3,5" or "2,4"`;

    const analysisWait = addMsg('Analyzing which scenes need changes...', 'ai thinking');
    
    try {
      const analysisResult = await apiCall('chat', 'POST', { 
        convo: [
          { role: 'user', parts: [{ text: analysisPrompt }] }
        ] 
      });
      
      if (analysisResult && analysisResult.reply) {
        // Parse the approved scenes from the response
        const sceneMatches = analysisResult.reply.match(/\d+/g);
        if (sceneMatches) {
          approvedScenesToChange = sceneMatches.map(n => parseInt(n)).filter(n => n >= 1 && n <= 16);
        }
        
        console.log('Gemini approved scenes to change:', approvedScenesToChange);
        const sceneWord = approvedScenesToChange.length === 1 ? 'scene' : 'scenes';
        addMsg(`Determined that ${sceneWord} ${approvedScenesToChange.join(', ')} should be modified.`, 'ai');
      }
      
      analysisWait.remove();
      
    } catch (e) {
      analysisWait.remove();
      console.error('Scene analysis failed:', e);
      // Fallback to original referenced scenes if analysis fails
      approvedScenesToChange = uniqueScenes;
    }
  }
  
  // STEP 2: Only proceed with scene modification if we have approved scenes
  if (approvedScenesToChange.length === 0) {
    // No scene changes needed, treat as regular chat
    convo.push({role: 'user', parts});
    pending = [];
    renderChips();
    qs('#chatIn').value = '';
    
    const wait = addMsg('Processing your message...', 'ai thinking');
    
    try {
      const result = await apiCall('chat', 'POST', { convo: convo });
      wait.remove();
      
      if(result.reply) {
        addMsg(marked.parse(result.reply), 'ai');
        convo.push({role: 'model', parts: [{text: result.reply}]});
      } else {
        addMsg('No response received from AI. Please try again.', 'ai err');
      }
    } catch (e) {
      wait.remove();
      addMsg('Chat Error: ' + e.message, 'ai err');
      console.error('Chat error:', e);
    }
    return;
  }
  
  // Add instruction for the AI to modify prompts - ONLY for approved scenes
  parts.push({
    text: `\n[INSTRUCTION: Based on the user's feedback, please analyze ONLY the approved scenes (${approvedScenesToChange.join(', ')}) and provide ONLY the updated prompts for those specific scenes that need changes. Format your response with updated prompts as "Scene X: [updated prompt]" for each scene that needs changes. Keep all prompts detailed (200+ words) and self-contained. Do NOT add new scenes unless explicitly requested. Do NOT remove or modify scenes that were not approved. Only modify the approved scenes: ${approvedScenesToChange.join(', ')}.

IMPORTANT: You are modifying text prompts that will be used to generate new images. You are NOT directly editing images. When the user asks to "change" something in a scene, they want you to rewrite the prompt for that scene to include their requested changes.]`
  });
  
  convo.push({role: 'user', parts});
  pending = [];
  renderChips();
  qs('#chatIn').value = '';
  
  const wait = addMsg('Processing your feedback...', 'ai thinking');
  
  try {
    const result = await apiCall('chat', 'POST', { convo: convo });
    wait.remove();
    
    if(result.reply) {
      // Check if Gemini is giving a "can't edit images" response
      const cantEditPatterns = [
        /cannot directly edit images/i,
        /don't have access to image manipulation/i,
        /text-based AI.*cannot.*edit.*image/i,
        /can't.*change.*person.*visual scene/i,
        /cannot.*modify.*specific visuals/i,
        /To achieve this.*would need.*AI Image Generator/i
      ];
      
      const isRefusalResponse = cantEditPatterns.some(pattern => pattern.test(result.reply));
      
      if (isRefusalResponse) {
        // Gemini misunderstood - retry with clearer instructions
        console.log('Detected image editing refusal - retrying with clearer prompt modification instructions');
        
        // Remove the refusal message
        wait.remove();
        
        // Add a thinking message
        const retryWait = addMsg('Let me help you modify the scene prompts...', 'ai thinking');
        
        // Retry with very explicit instructions
        const retryParts = [
          ...parts.slice(0, -1), // Original parts without the last instruction
          {
            text: `\n[CRITICAL INSTRUCTION: The user wants you to MODIFY THE TEXT PROMPTS for the scenes, not edit actual images. 

User's request: "${txt}"
Scenes to modify: ${approvedScenesToChange.join(', ')}

Please provide the UPDATED TEXT PROMPTS for each scene mentioned. These prompts will be used to generate NEW images that incorporate the user's requested changes.

For example, if the user says "change the girl in scene 1 to be asian", you should provide:
Scene 1: [The full updated prompt with an Asian girl instead of whatever was there before]

Do NOT explain that you cannot edit images. Simply provide the updated prompts with the requested changes incorporated.]`
          }
        ];
        
        // Retry the API call
        const retryResult = await apiCall('chat', 'POST', { 
          convo: [...convo.slice(0, -1), {role: 'user', parts: retryParts}]
        });
        
        retryWait.remove();
        
        if (retryResult && retryResult.reply) {
          result.reply = retryResult.reply;
          // Continue processing with the retry result
        } else {
          addMsg('I understand you want to modify the scenes. Let me update the prompts for you...', 'ai');
          return;
        }
      }
      
      // Check if the response contains scene updates
      const responseText = result.reply;
      const lines = responseText.split(/\r?\n/);
      const updatedScenes = {};
      let foundSceneUpdates = false;
      
      // Parse scene updates from the response
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/^Scene\s*(\d+)\s*[:\-]\s*(.*)$/i);
        if (match) {
          const sceneNum = parseInt(match[1]);
          const promptStart = match[2];
          if (sceneNum >= 1 && sceneNum <= 16 && promptStart) {
            // VALIDATION: Only allow scenes that were approved to be changed
            if (approvedScenesToChange.includes(sceneNum)) {
              // Found a scene, collect the full prompt
              let fullPrompt = promptStart;
              let lineIndex = i + 1;
              
              // Continue collecting lines until we hit another scene or end
              while (lineIndex < lines.length) {
                const nextLine = lines[lineIndex];
                if (nextLine.match(/^Scene\s*\d+\s*[:\-]/i)) break;
                if (nextLine.trim()) fullPrompt += ' ' + nextLine.trim();
                lineIndex++;
              }
              
              updatedScenes[sceneNum] = fullPrompt.trim();
              foundSceneUpdates = true;
            } else {
              console.log(`Blocked unauthorized scene update for Scene ${sceneNum} - not in approved list`);
            }
          }
        }
      }
      
      if (foundSceneUpdates) {
        // Store old prompts before updating
        const oldPrompts = {};
        for (const sceneNum of Object.keys(updatedScenes)) {
          oldPrompts[sceneNum] = qs(`#p${sceneNum}`).value || '';
        }
        
        // Ask Gemini to summarize the actual changes
        let changesSummary = '';
        try {
          const summaryPrompt = `Please analyze these scene prompt changes and provide a 1-3 sentence summary of the KEY changes made:

User's request: "${txt}"

Changes made:`;
          
          for (const [sceneNum, newPrompt] of Object.entries(updatedScenes)) {
            summaryPrompt += `\n\nScene ${sceneNum}:\nOLD: ${oldPrompts[sceneNum]}\nNEW: ${newPrompt}`;
          }
          
          summaryPrompt += `\n\nProvide ONLY a brief 1-3 sentence summary of the actual changes made (e.g., "changed the character from a woman to a man in scene 2" or "added dramatic sunset lighting to scenes 1 and 3"). Do not include any other text.`;
          
          const summaryResult = await apiCall('chat', 'POST', {
            convo: [{ role: 'user', parts: [{ text: summaryPrompt }] }]
          });
          
          if (summaryResult && summaryResult.reply) {
            changesSummary = summaryResult.reply.trim();
            // Clean up the summary - remove any leading "I've" or similar
            changesSummary = changesSummary.replace(/^(I've |I have |We've |We have )/i, '');
            // Make it lowercase first letter if needed
            changesSummary = changesSummary.charAt(0).toLowerCase() + changesSummary.slice(1);
          }
        } catch (e) {
          console.error('Failed to generate changes summary:', e);
          // Fallback to generic message if summary generation fails
          changesSummary = `made the requested changes to ${Object.keys(updatedScenes).length === 1 ? 'the scene' : 'the scenes'}`;
        }
        
        // Don't show the raw response with prompts
        const sceneCount = Object.keys(updatedScenes).length;
        const sceneWord = sceneCount === 1 ? 'scene' : 'scenes';
        addMsg(`I've updated the ${sceneWord} based on your feedback. I've ${changesSummary}. Regenerating the modified ${sceneWord} now...`, 'ai');
        
        // STEP 3: Final validation - only update prompts for approved scenes
        const scenesToRegenerate = [];
        for (const [sceneNum, newPrompt] of Object.entries(updatedScenes)) {
          const sceneNumber = parseInt(sceneNum);
          
          // FINAL CHECK: Ensure this scene was approved for changes
          if (approvedScenesToChange.includes(sceneNumber)) {
            const oldPrompt = qs(`#p${sceneNumber}`).value;
            if (oldPrompt !== newPrompt) {
              qs(`#p${sceneNumber}`).value = newPrompt;
              scenesToRegenerate.push(sceneNumber);
              console.log(`Updated prompt for approved Scene ${sceneNumber}`);
            }
          } else {
            console.log(`Blocked final update for Scene ${sceneNumber} - not in approved list`);
          }
        }
        
        // CONSERVATIVE: Only clear scenes if explicitly "all scenes" was mentioned AND there are approved scenes to clear
        if (isAllScenes && approvedScenesToChange.length > 0) {
          for (let i = 1; i <= 16; i++) {
            if (qs(`#p${i}`).value && !approvedScenesToChange.includes(i)) {
              // Only clear if it wasn't in the approved list
              qs(`#p${i}`).value = '';
            }
          }
        }
        
        // Regenerate only the validated scenes
        if (scenesToRegenerate.length > 0) {
          // Use the new function that doesn't rebuild the DOM
          regenerateSpecificScenes(scenesToRegenerate);
          
          const sceneWord = scenesToRegenerate.length === 1 ? 'scene' : 'scenes';
          addMsg(`Regenerating ${sceneWord} ${scenesToRegenerate.join(', ')}`, 'ai');
          
          // Auto-save state after scene updates
          autoSaveState();
        } else {
          addMsg('No changes were needed for the existing scenes.', 'ai');
        }
        
        // Update conversation with hidden prompt updates
        convo.push({role: 'model', parts: [{text: `[Scene updates applied to approved scenes: ${Object.keys(updatedScenes).join(', ')}]`}]});
      } else {
        // Show the response if it's not scene updates
        addMsg(marked.parse(result.reply), 'ai');
        convo.push({role: 'model', parts: [{text: result.reply}]});
      }
    } else {
      addMsg('No response received from AI. Please try again.', 'ai err');
    }
  } catch (e) {
    wait.remove();
    addMsg('Chat Error: ' + e.message, 'ai err');
    console.error('Chat error:', e);
  }
}

/* Download helpers */
async function downloadOne(u, f, p){
  try{
    const b = await(await fetch(u)).blob();
    // Extract scene and slot from filename
    const match = f.match(/scene(\d+)_(\d+)/);
    if(match) {
      const [, scene, slot] = match;
      const summary = createPromptSummary(p);
      // Use column-first naming: column1_scene01_summary.png
      const newName = `column${slot}_scene${scene.padStart(2,'0')}_${summary}.png`;
      saveBlob(await embedPrompt(b,p),newName);
    } else {
      saveBlob(await embedPrompt(b,p),`${f}.png`);
    }
  }catch{
    saveURL(u,`${f}.png`);
  }
}

/* Helper to create a short summary from prompt */
function createPromptSummary(prompt) {
  if (!prompt) return 'no-prompt';
  // Remove common words and punctuation, get first 5 meaningful words
  const words = prompt.toLowerCase()
    .replace(/[.,!?;:()\[\]{}"']/g, '') // Remove punctuation
    .split(/\s+/) // Split by whitespace
    .filter(word => word.length > 2 && !['the', 'and', 'for', 'with', 'from', 'into', 'over', 'under', 'through'].includes(word))
    .slice(0, 5);
  return words.join('-') || 'image';
}

async function downloadAll(){
  const imgs = [...document.querySelectorAll('.img')].filter(i => i.src);
  if(!imgs.length) return alert('No images');
  
  const zip = new JSZip();
  const meta = {
    generated: new Date().toISOString(),
    scenes: {},
    totalImages: 0
  };
  
  // Create PDF document
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // PDF styling
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (2 * margin);
  let yPosition = margin;
  
  // Add title page
  pdf.setFontSize(24);
  pdf.setFont(undefined, 'bold');
  pdf.text('Image Storyboard', pageWidth / 2, 40, { align: 'center' });
  
  pdf.setFontSize(12);
  pdf.setFont(undefined, 'normal');
  pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 55, { align: 'center' });
  
  // Count total scenes with content
  let scenesWithContent = 0;
  for(let i=1;i<=16;i++){
    const prompt = qs(`#p${i}`)?.value;
    if(prompt && prompt.trim()) scenesWithContent++;
  }
  
  pdf.text(`Total Scenes: ${scenesWithContent}`, pageWidth / 2, 65, { align: 'center' });
  pdf.text(`Total Images: ${imgs.length}`, pageWidth / 2, 72, { align: 'center' });
  
  // Process all images and organize by scene
  const sceneData = {};
  
  for(const img of imgs){
    const[,s,i] = img.id.match(/img-(\d+)-(\d+)/);
    const pr = qs(`#p${s}`).value || '';
    const summary = createPromptSummary(pr);
    
    if (!sceneData[s]) {
      sceneData[s] = {
        prompt: pr,
        summary: summary,
        images: []
      };
    }
    
    try{
      const b = await(await fetch(img.src)).blob();
      // Create filename that sorts by column (slot) first, then scene
      const fn = `column${i}_scene${s.padStart(2,'0')}_${summary}.png`;
      
      // Add to zip with embedded prompt
      zip.file(fn, await embedPrompt(b,pr));
      
      // Convert to base64 for PDF
      const b64 = await blobToB64(b);
      const dataUrl = `data:${b.type};base64,${b64}`;
      
      sceneData[s].images.push({
        slot: parseInt(i),
        dataUrl: dataUrl,
        filename: fn
      });
      
      // Update metadata
      if (!meta.scenes[`scene_${s}`]) {
        meta.scenes[`scene_${s}`] = {
          prompt: pr,
          promptSummary: summary,
          images: []
        };
      }
      meta.scenes[`scene_${s}`].images.push({
        filename: fn,
        slot: parseInt(i),
        url: img.src
      });
      meta.totalImages++;
    }catch(e){
      console.error(`Failed to process image scene${s}_${i}:`, e);
    }
  }
  
  // Add scenes to PDF
  for(let sceneNum=1;sceneNum<=16;sceneNum++){
    const data = sceneData[sceneNum.toString()];
    if (!data || !data.prompt) continue;
    
    // Start new page for each scene
    pdf.addPage();
    yPosition = margin;
    
    // Scene header
    pdf.setFontSize(18);
    pdf.setFont(undefined, 'bold');
    pdf.text(`Scene ${sceneNum}`, margin, yPosition);
    yPosition += 10;
    
    // Prompt summary
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'italic');
    pdf.text(`Summary: ${data.summary}`, margin, yPosition);
    yPosition += 10;
    
    // Full prompt
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    pdf.text('Prompt:', margin, yPosition);
    yPosition += 6;
    
    // Wrap long prompt text
    const promptLines = pdf.splitTextToSize(data.prompt, contentWidth);
    for (const line of promptLines) {
      if (yPosition > pageHeight - margin - 10) {
        pdf.addPage();
        yPosition = margin;
      }
      pdf.text(line, margin, yPosition);
      yPosition += 5;
    }
    
    yPosition += 10;
    
    // Add images
    if (data.images && data.images.length > 0) {
      // Sort images by slot
      data.images.sort((a, b) => a.slot - b.slot);
      
      // Calculate image dimensions (maintaining 16:9 aspect ratio)
      const imgWidth = (contentWidth - 10) / 2; // Two images side by side with gap
      const imgHeight = imgWidth * 9 / 16;
      
      // Check if images fit on current page
      if (yPosition + imgHeight > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }
      
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text('Generated Images:', margin, yPosition);
      yPosition += 8;
      
      // Add images side by side
      let xPosition = margin;
      data.images.forEach((img, index) => {
        try {
          pdf.addImage(img.dataUrl, 'PNG', xPosition, yPosition, imgWidth, imgHeight);
          
          // Add image label
          pdf.setFontSize(8);
          pdf.setFont(undefined, 'normal');
          pdf.text(`Slot ${img.slot}`, xPosition + imgWidth/2, yPosition + imgHeight + 5, { align: 'center' });
          
          xPosition += imgWidth + 10;
        } catch (e) {
          console.error(`Failed to add image to PDF:`, e);
        }
      });
    }
  }
  
  // Create a comprehensive prompts document
  let promptsDoc = 'IMAGE STORYBOARD PROMPTS\n';
  promptsDoc += '======================\n\n';
  promptsDoc += `Generated: ${new Date().toLocaleString()}\n`;
  promptsDoc += `Total Images: ${meta.totalImages}\n\n`;
  
  // Add all prompts organized by scene
  for(let i=1;i<=16;i++){
    const prompt = qs(`#p${i}`)?.value;
    if(prompt && prompt.trim()){
      promptsDoc += `SCENE ${i}\n`;
      promptsDoc += '-'.repeat(50) + '\n';
      promptsDoc += `Summary: ${createPromptSummary(prompt)}\n\n`;
      promptsDoc += `Full Prompt:\n${prompt}\n\n`;
      
      // List generated images for this scene
      if(meta.scenes[`scene_${i}`]){
        promptsDoc += `Generated Images:\n`;
        meta.scenes[`scene_${i}`].images.forEach(img => {
          promptsDoc += `  - ${img.filename}\n`;
        });
      }
      promptsDoc += '\n\n';
    }
  }
  
  // Add files to zip
  zip.file('prompts_detailed.txt', promptsDoc);
  zip.file('metadata.json', JSON.stringify(meta, null, 2));
  
  // Add PDF to zip
  const pdfBlob = pdf.output('blob');
  zip.file('storyboard_complete.pdf', pdfBlob);
  
  // Create checkpoint JSON file with all data needed for restoration
  const checkpoint = {
    version: '1.0',
    created: new Date().toISOString(),
    tool: 'Image Storyboard Creator',
    scenes: {},
    styleFile: styleFile ? {name: styleFile.name, type: styleFile.type} : null,
    adDescriptionFile: adDescriptionFile ? {name: adDescriptionFile.name, type: adDescriptionFile.type} : null,
    generatedImages: generatedImages
  };
  
  // Add all prompts to checkpoint
  for(let i = 1; i <= 16; i++) {
    const prompt = qs(`#p${i}`)?.value;
    if (prompt && prompt.trim()) {
      checkpoint.scenes[`scene_${i}`] = {
        number: i,
        prompt: prompt,
        images: []
      };
      
      // Add image data if available
      if (generatedImages[i.toString()]) {
        checkpoint.scenes[`scene_${i}`].images = generatedImages[i.toString()].images;
      }
    }
  }
  
  // Save checkpoint JSON
  const checkpointBlob = new Blob([JSON.stringify(checkpoint, null, 2)], {type: 'application/json'});
  zip.file('savedCheckpoint.json', checkpointBlob);
  
  // Generate and save zip
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0,19);
  saveBlob(await zip.generateAsync({type:'blob'}), `storyboard_images_${timestamp}.zip`);
}

function saveBlob(b,f){const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=f;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2e3);}
function saveURL(u,f){const a=document.createElement('a');a.href=u;a.download=f;a.target='_blank';a.click();}

async function embedPrompt(blob,p){
  try{
    if(blob.type==='image/png'){
      const ab=new Uint8Array(await blob.arrayBuffer()),c=PNGChunksExtract(ab);
      c.splice(-1,0,PNGChunkText.encode('prompt',p));
      return new Blob([PNGChunksEncode(c)],{type:'image/png'});
    }
    const b64=await blobToB64(blob),ex={'Exif':{[piexif.ExifIFD.UserComment]:piexif.encodeUnicode(p)}};
    return dURL2Blob(piexif.insert(piexif.dump(ex),b64));
  }catch{
    return blob;
  }
}

function dURL2Blob(u){
  const[h,b]=u.split(','),m=h.match(/:(.*?);/)[1],bin=atob(b);
  const arr=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);
  return new Blob([arr],{type:m});
}
