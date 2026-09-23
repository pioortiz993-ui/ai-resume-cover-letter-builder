import worker from '../dist/server/index.js';

export default {
  fetch(request) {
    return worker.fetch(request, {
      GEMINI_API_KEY: process.env.GEMINI_API_KEY
    });
  }
};