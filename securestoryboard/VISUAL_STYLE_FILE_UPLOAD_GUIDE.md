# Visual Style Elements - File Upload Guide

## Overview
The Visual Style Elements feature now supports a wide variety of document formats to help you provide style references for your image generation. You can upload style guides, brand guidelines, mood boards descriptions, or any document containing visual style information.

## Supported File Formats

### Document Formats
- **PDF** (.pdf) - Perfect for brand guidelines, style guides, and visual references
- **Microsoft Word** (.doc, .docx) - Great for detailed style documents with formatting
- **Plain Text** (.txt) - Simple text descriptions of visual styles
- **Rich Text Format** (.rtf) - Formatted text documents
- **OpenDocument Text** (.odt) - Open source document format
- **Markdown** (.md) - Structured text with formatting
- **CSV** (.csv) - Structured data like color palettes or style attributes
- **JSON** (.json) - Structured style configuration data
- **XML** (.xml) - Structured markup for style definitions

### File Size Limit
- Maximum file size: **10MB**
- This is sufficient for most documents including those with embedded images

## How It Works

### 1. Upload Process
- Click the upload button (📤) next to "VISUAL STYLE ELEMENTS"
- Select your style reference file
- The file will be analyzed when you click "Generate Photos"

### 2. AI Analysis
When you upload a visual style file, the AI will:
- Extract key visual elements mentioned in the document
- Identify color palettes, moods, and atmospheres
- Note composition styles and framing preferences
- Capture lighting and photography style directions
- Understand brand personality and visual tone

### 3. Integration with Photo Generation
The visual style information is incorporated into EVERY scene prompt to ensure:
- Visual consistency across all generated images
- Adherence to brand guidelines
- Maintenance of the desired aesthetic throughout the storyboard

## Best Practices

### What to Include in Style Files
1. **Color Information**
   - Brand colors with hex codes or descriptions
   - Color mood and atmosphere preferences
   - Color combinations to use or avoid

2. **Visual Style Details**
   - Photography style (e.g., candid, staged, documentary)
   - Lighting preferences (natural, dramatic, soft, etc.)
   - Composition guidelines (rule of thirds, centered, dynamic)

3. **Mood and Tone**
   - Emotional qualities (warm, professional, playful)
   - Energy levels (calm, energetic, contemplative)
   - Brand personality traits

4. **Technical Specifications**
   - Preferred angles and perspectives
   - Depth of field preferences
   - Any specific visual techniques

### Example Content for Style Files

#### For a PDF/Word Brand Guide:
```
Brand Visual Style Guide

Colors:
- Primary: Deep Blue (#003366)
- Secondary: Warm Gold (#FFD700)
- Accent: Soft Gray (#F5F5F5)

Photography Style:
- Natural lighting preferred
- Candid, authentic moments
- Shallow depth of field for portraits
- Wide establishing shots for context

Mood:
- Professional yet approachable
- Modern and clean aesthetic
- Emphasis on human connection
```

#### For a Text/Markdown File:
```
Visual Style: Modern Minimalist

- Clean, uncluttered compositions
- Lots of negative space
- Neutral color palette with one bold accent
- Natural lighting only
- Focus on geometric shapes and lines
- People should appear relaxed and natural
- Avoid busy backgrounds
```

## Tips for Best Results

1. **Be Specific**: The more detailed your style guide, the better the AI can match your vision

2. **Include Examples**: Describe specific visual examples or references when possible

3. **Prioritize Key Elements**: Start with the most important style elements

4. **Use Consistent Terminology**: Use industry-standard terms for photography and design

5. **Combine with Text Input**: You can upload a file AND type additional style notes in the text field

## Integration with Ad Brief

The visual style elements work in conjunction with your ad brief to create cohesive storyboards:
- The ad brief defines WHAT happens in each scene
- The visual style defines HOW it should look

Both inputs are analyzed together to generate scene prompts that tell your story with your desired visual aesthetic.

## Troubleshooting

### File Not Uploading
- Check file size (must be under 10MB)
- Ensure file extension is supported
- Try converting to PDF or TXT if having issues

### Style Not Being Applied
- Make sure to click "Generate Photos" after uploading
- Check that your style descriptions are clear and specific
- Try adding more detail about visual preferences

### Different Styles Needed for Different Scenes
- Use the chat feature after generation to modify specific scenes
- Example: "Make scene 3 have a more dramatic lighting style"

## Examples of Successful Style Integration

### Corporate Video Style
Upload a PDF with brand guidelines → AI generates scenes with consistent corporate branding, professional lighting, and on-brand color schemes

### Lifestyle Campaign Style
Upload a Word doc describing casual, sunny, outdoor aesthetics → AI creates scenes with natural lighting, relaxed compositions, and outdoor settings

### Artistic Project Style
Upload a text file with experimental visual concepts → AI produces scenes with creative angles, unique color grading, and artistic compositions

Remember: The visual style file is your opportunity to ensure every generated image matches your creative vision and brand requirements!
