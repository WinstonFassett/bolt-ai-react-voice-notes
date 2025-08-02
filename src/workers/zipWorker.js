// zipWorker.js - Web Worker for streaming zip creation
import JSZip from 'jszip';

// Initialize zip
const zip = new JSZip();
let fileCount = 0;
let totalFiles = 0;
let batchSize = 3;

// For iOS streaming approach
const fileChunks = new Map(); // Store chunks by fileId

// Handle messages from main thread
self.onmessage = async (event) => {
  const msg = event.data;
  
  switch (msg.type) {
    // iOS streaming handlers
    case 'startFile':
      // Start collecting chunks for a file
      fileChunks.set(msg.fileId, {
        chunks: [],
        filename: msg.filename,
        mimeType: msg.mimeType
      });
      break;
      
    case 'addChunk':
      // Add a chunk to a file being built
      if (fileChunks.has(msg.fileId)) {
        const fileData = fileChunks.get(msg.fileId);
        fileData.chunks.push(msg.chunk);
      } else {
        self.postMessage({
          type: 'error',
          error: `Received chunk for unknown file ID: ${msg.fileId}`
        });
      }
      break;
      
    case 'endFile':
      // Finalize a file from its chunks
      if (fileChunks.has(msg.fileId)) {
        try {
          const fileData = fileChunks.get(msg.fileId);
          // Create a blob from all chunks
          const blob = new Blob(fileData.chunks, { type: fileData.mimeType });
          
          // Add to zip
          zip.file(fileData.filename, blob);
          fileCount++;
          
          // Report progress
          self.postMessage({
            type: 'progress',
            message: `Added file ${fileCount}/${totalFiles} to zip`
          });
          
          // Clean up memory
          fileChunks.delete(msg.fileId);
        } catch (error) {
          self.postMessage({
            type: 'error',
            error: `Error finalizing file: ${error.toString()}`
          });
        }
      }
      break;
      
    case 'init':
      // Initialize the worker with a port for streaming
      const port = msg.port;
      
      // Set up the writer to stream data back to main thread
      const writer = new WritableStream({
        write(chunk) {
          // Send chunk back to main thread
          self.postMessage({
            type: 'data',
            data: chunk
          });
        },
        close() {
          self.postMessage({ type: 'complete' });
        },
        abort(err) {
          self.postMessage({ 
            type: 'error', 
            error: err.toString() 
          });
        }
      });
      
      // Store the writer for later use
      self.writer = writer;
      break;
      
    case 'configure':
      // Set configuration for the zip process
      totalFiles = msg.totalFiles || 0;
      batchSize = msg.batchSize || 3;
      break;
      
    case 'addFile':
      // Add a file to the zip
      try {
        zip.file(msg.filename, msg.data);
        fileCount++;
        
        // Report progress
        self.postMessage({
          type: 'progress',
          message: `Added file ${fileCount}/${totalFiles} to zip`
        });
      } catch (error) {
        self.postMessage({
          type: 'error',
          error: `Error adding file: ${error.toString()}`
        });
      }
      break;
      
    case 'finalize':
      // Generate the zip file as a stream
      try {
        self.postMessage({
          type: 'progress',
          message: 'Creating zip file...'
        });
        
        // Generate zip with streaming
        const zipStream = zip.generateInternalStream({
          type: 'uint8array',
          compression: 'DEFLATE',
          compressionOptions: {
            level: 6 // Balance between speed and compression
          },
          streamFiles: true
        });
        
        // Process the stream in chunks
        zipStream.on('data', (data, metadata) => {
          self.postMessage({
            type: 'data',
            data: data
          });
          
          // Update progress periodically
          if (metadata && metadata.percent) {
            self.postMessage({
              type: 'progress',
              message: `Creating zip: ${Math.round(metadata.percent)}% complete`
            });
          }
        });
        
        zipStream.on('end', () => {
          self.postMessage({
            type: 'progress',
            message: 'Zip creation complete!'
          });
          self.postMessage({ type: 'complete' });
        });
        
        zipStream.on('error', (error) => {
          self.postMessage({
            type: 'error',
            error: `Error generating zip: ${error.toString()}`
          });
        });
        
        // Start the stream
        zipStream.resume();
      } catch (error) {
        self.postMessage({
          type: 'error',
          error: `Error finalizing zip: ${error.toString()}`
        });
      }
      break;
  }
};

// Report that the worker is ready
self.postMessage({
  type: 'ready'
});
