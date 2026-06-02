import type { TranscriptSegment } from '../shared/types';

export async function extractTranscript(videoId: string): Promise<TranscriptSegment[]> {
  try {
    // 1. Try to find ytInitialPlayerResponse in the script tags of the page
    let playerResponseText = '';
    const scripts = Array.from(document.querySelectorAll('script'));
    for (const script of scripts) {
      const content = script.textContent || '';
      if (content.includes('ytInitialPlayerResponse') && content.includes('captionTracks')) {
        playerResponseText = content;
        break;
      }
    }

    // 2. If not found in script tags, fetch the page HTML to get it
    if (!playerResponseText) {
      const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
      playerResponseText = await response.text();
    }

    // 3. Extract captionTracks section using regex
    const captionTracksRegex = /"captionTracks":\s*(\[[^\]]+\])/;
    const match = playerResponseText.match(captionTracksRegex);
    if (!match || match.length < 2) {
      throw new Error('No transcript tracks found for this video. If this is a music video or has transcripts disabled, transcripts may not be available.');
    }

    const captionTracks = JSON.parse(match[1]);
    if (!captionTracks || captionTracks.length === 0) {
      throw new Error('Transcript tracks are empty.');
    }

    // 4. Prefer English transcript, otherwise pick the first one
    let selectedTrack = captionTracks.find((track: any) => 
      track.languageCode === 'en' || track.languageCode === 'en-US'
    );
    if (!selectedTrack) {
      selectedTrack = captionTracks[0];
    }

    if (!selectedTrack || !selectedTrack.baseUrl) {
      throw new Error('No valid transcript track base URL found.');
    }

    // 5. Fetch transcript data (append fmt=json3 for structured JSON)
    const transcriptUrl = `${selectedTrack.baseUrl}&fmt=json3`;
    const transcriptResponse = await fetch(transcriptUrl);
    if (!transcriptResponse.ok) {
      throw new Error('Failed to fetch transcript from YouTube.');
    }

    const transcriptData = await transcriptResponse.json();
    if (!transcriptData.events || transcriptData.events.length === 0) {
      throw new Error('Transcript is empty.');
    }

    // 6. Map YouTube events to TranscriptSegments
    const segments: TranscriptSegment[] = [];
    for (const event of transcriptData.events) {
      if (!event.segs || event.segs.length === 0) continue;
      
      const text = event.segs
        .map((seg: any) => seg.utf8)
        .join('')
        .replace(/\n/g, ' ')
        .trim();
        
      if (!text || text === '\n') continue;

      segments.push({
        text,
        start: (event.tStartMs || 0) / 1000,
        duration: (event.dDurationMs || 0) / 1000,
      });
    }

    return segments;
  } catch (error) {
    console.error('[LearnTube] Transcript extraction error:', error);
    throw error;
  }
}
