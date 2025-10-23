/**
 * Determine MIME type from file information
 * @param {Object} file - File object with name and optionally mimeType/type properties
 * @returns {string} - Determined MIME type
 */
function determineMimeType(file) {
  // Check if MIME type is already properly set
  let mimeType = file.mimeType || file.type;
  
  if (mimeType && mimeType !== 'application/octet-stream') {
    return mimeType;
  }
  
  // Try to determine from file name
  const fileName = file.name || '';
  const ext = fileName.split('.').pop().toLowerCase();
  
  const mimeTypes = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif'
  };
  
  if (mimeTypes[ext]) {
    return mimeTypes[ext];
  }
  
  // Default to text/plain for unknown text-like files
  console.warn(`Unknown file type for file: ${fileName}, using text/plain`);
  return 'text/plain';
}

module.exports = {
  determineMimeType
};
