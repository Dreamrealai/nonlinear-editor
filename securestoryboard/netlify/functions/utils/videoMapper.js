// Shared utility to map Video Intelligence annotationResults to simplified structure

function mapAnnotationResults(annotationResults, originalFileName) {
  let mapped = {
    originalFileName,
    products: "Analysis for products pending detailed mapping.",
    hook: "Hook detection pending detailed mapping.",
    summary: "Scene summary pending detailed mapping.",
    dialogue: [],
    music: "Music analysis pending more specific features.",
    visualStyle: "Visual style elements pending detailed mapping.",
    labels: [],
    shots: [],
    explicitContent: "No explicit content detected or N/A."
  };
  if (!annotationResults) return mapped;

  if (annotationResults.segmentLabelAnnotations) {
    mapped.labels = annotationResults.segmentLabelAnnotations.map(label => {
      return {
        description: label.entity.description,
        category: label.categoryEntities.map(cat => cat.description).join(', '),
        confidence: label.segments.reduce((acc, seg) => Math.max(acc, seg.confidence), 0)
      };
    }).slice(0, 10);
  }
  if (annotationResults.shotAnnotations) {
    mapped.shots = annotationResults.shotAnnotations.map(shot => ({
      startTime: shot.startTimeOffset ? shot.startTimeOffset.seconds + (shot.startTimeOffset.nanos / 1e9) + 's' : 'N/A',
      endTime: shot.endTimeOffset ? shot.endTimeOffset.seconds + (shot.endTimeOffset.nanos / 1e9) + 's' : 'N/A'
    })).slice(0,10);
    mapped.summary = `Video contains ${mapped.shots.length} key shots.`;
  }
  if (annotationResults.textAnnotations) {
    mapped.dialogue = annotationResults.textAnnotations.map(t => t.text).filter(Boolean);
  }
  if (annotationResults.explicitAnnotation) {
    const frames = annotationResults.explicitAnnotation.frames.filter(f => f.pornographyLikelihood !== 'VERY_UNLIKELY');
    if (frames.length) mapped.explicitContent = `Potential explicit content in ${frames.length} frames.`;
  }
  return mapped;
}

module.exports = { mapAnnotationResults }; 