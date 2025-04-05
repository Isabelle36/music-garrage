'use client';

import { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { parseStringPromise } from 'xml2js';
import { unzipSync, strFromU8 } from 'fflate';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';

const whiteKeys = [
  { note: 'C4', label: 'C' },
  { note: 'D4', label: 'D' },
  { note: 'E4', label: 'E' },
  { note: 'F4', label: 'F' },
  { note: 'G4', label: 'G' },
  { note: 'A4', label: 'A' },
  { note: 'B4', label: 'B' },
  { note: 'C5', label: 'C' },
];

const blackKeys = [
  { note: 'C#4', label: 'C#' },
  { note: 'D#4', label: 'D#' },
  { note: 'F#4', label: 'F#' },
  { note: 'G#4', label: 'G#' },
  { note: 'A#4', label: 'A#' },
];

export default function Piano() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeKeys, setActiveKeys] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [parsedNotes, setParsedNotes] = useState([]);
  const synthRef = useRef(null);
  const sheetContainerRef = useRef(null);
  const osmdRef = useRef(null);
  const timeoutsRef = useRef([]);

  useEffect(() => {
    const startTone = async () => {
      await Tone.start();
      synthRef.current = new Tone.PolySynth(Tone.Synth).toDestination();
    };
    startTone();
  }, []);

  const playNote = (note) => {
    if (!synthRef.current) return;
    
    setActiveKeys((prev) => [...prev, note]);
    synthRef.current.triggerAttackRelease(note, '8n');
    setTimeout(() => {
      setActiveKeys((prev) => prev.filter(key => key !== note));
    }, 200);
  };

  const playChord = (notes) => {
    if (!synthRef.current) return;
    
    setActiveKeys(notes);
    synthRef.current.triggerAttackRelease(notes, '8n');
    setTimeout(() => {
      setActiveKeys([]);
    }, 200);
  };

  const handleChatSubmit = async () => {
    if (!userInput.trim()) return;

    setChatMessages(prev => [...prev, { role: 'user', content: userInput }]);
    setUserInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userInput }),
      });

      const data = await response.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const stopPlayback = () => {
    if (synthRef.current) {
      synthRef.current.releaseAll();
    }
    setActiveKeys([]);
    clearTimeouts();
  };

  const parseMusicXML = async (xml) => {
    try {
      const parsed = await parseStringPromise(xml);
      const root = parsed['score-partwise'] || parsed['score-timewise'];

      if (!root) {
        throw new Error('Invalid MusicXML');
      }

      const parts = root.part || [];
      const noteList = [];

      parts.forEach((part) => {
        const measures = part.measure || [];
        measures.forEach((measure) => {
          const notes = measure.note || [];
          notes.forEach((note) => {
            if (note.rest) return;
            const pitch = note.pitch?.[0];
            if (!pitch) return;

            const step = pitch.step?.[0];
            const octave = pitch.octave?.[0];
            const alter = pitch.alter?.[0];
            const accidental = alter === '1' ? '#' : alter === '-1' ? 'b' : '';

            const noteName = `${step}${accidental}${octave}`;
            let duration = '4n';
            
            const type = note.type?.[0];
            if (type === 'whole') duration = '1n';
            else if (type === 'half') duration = '2n';
            else if (type === 'quarter') duration = '4n';
            else if (type === 'eighth') duration = '8n';
            else if (type === '16th') duration = '16n';

            noteList.push({ pitch: noteName, duration });
          });
        });
      });

      setParsedNotes(noteList);
      console.log('Parsed Notes:', noteList);
    } catch (err) {
      console.error('Failed to parse MusicXML:', err);
    }
  };

  const renderSheetMusic = async (xmlString) => {
    if (!sheetContainerRef.current) return;

    if (!osmdRef.current) {
      osmdRef.current = new OpenSheetMusicDisplay(sheetContainerRef.current);
    }

    try {
      await osmdRef.current.load(xmlString);
      osmdRef.current.render();
    } catch (err) {
      console.error('OSMD render error:', err);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setLoading(true);
    const fileExt = selectedFile.name.split('.').pop().toLowerCase();
    let musicXMLText = '';

    try {
      if (fileExt === 'mxl') {
        const buffer = await selectedFile.arrayBuffer();
        const zip = unzipSync(new Uint8Array(buffer));
        
        const containerPath = 'META-INF/container.xml';
        if (zip[containerPath]) {
          const containerXml = strFromU8(zip[containerPath]);
          const parser = new DOMParser();
          const containerDoc = parser.parseFromString(containerXml, 'application/xml');
          const rootfileElement = containerDoc.querySelector('rootfile');
          const fullPath = rootfileElement?.getAttribute('full-path');

          if (fullPath && zip[fullPath]) {
            musicXMLText = strFromU8(zip[fullPath]);
          }
        } else {
          const xmlFileName = Object.keys(zip).find(name => name.toLowerCase().endsWith('.xml'));
          if (!xmlFileName) throw new Error('No .xml found in MXL file.');
          musicXMLText = strFromU8(zip[xmlFileName]);
        }
      } else {
        musicXMLText = await selectedFile.text();
      }

      await renderSheetMusic(musicXMLText);
      await parseMusicXML(musicXMLText);
    } catch (err) {
      console.error('Upload error:', err);
    }

    setLoading(false);
  };

  const playAllNotes = async () => {
    if (!synthRef.current || !parsedNotes.length) return;
    
    stopPlayback();
    let now = Tone.now();
    let delay = 0;

    parsedNotes.forEach(({ pitch, duration }) => {
      let durationInSeconds = 0.5;
      if (duration === '1n') durationInSeconds = 2;
      else if (duration === '2n') durationInSeconds = 1;
      else if (duration === '4n') durationInSeconds = 0.5;
      else if (duration === '8n') durationInSeconds = 0.25;
      else if (duration === '16n') durationInSeconds = 0.125;

      const highlightTimeout = setTimeout(() => {
        setActiveKeys([pitch]);
      }, delay * 1000);
      timeoutsRef.current.push(highlightTimeout);

      const releaseTimeout = setTimeout(() => {
        setActiveKeys([]);
      }, (delay + durationInSeconds) * 1000);
      timeoutsRef.current.push(releaseTimeout);

      synthRef.current.triggerAttackRelease(pitch, duration, now + delay);
      delay += durationInSeconds;
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-900 p-6 text-white">
      <h1 className="text-3xl font-bold mb-8 text-center">Piano Play 🎹</h1>

      <div className="flex w-full max-w-6xl gap-6">
        <Card className="w-1/4 min-w-[200px] h-[auto] bg-zinc-800/50 backdrop-blur-md text-white shadow-xl">
          <CardContent className="p-4 flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Upload Sheet</h2>
            <input
              type="file"
              accept=".mxl,.musicxml,.xml"
              className="bg-zinc-700/50 cursor-pointer text-sm p-1 rounded"
              onChange={(e) => setSelectedFile(e.target.files[0])}
            />
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || loading}
              className="bg-zinc-600 text-white hover:bg-zinc-500"
            >
              {loading ? 'Loading...' : 'Upload Sheet'}
            </Button>
            {parsedNotes.length > 0 && (
              <div className="flex flex-col gap-2 mt-2">
                <Button 
                  onClick={playAllNotes}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  ▶️ Play Sheet Music
                </Button>
                <Button 
                  onClick={stopPlayback}
                  className="bg-red-600 hover:bg-red-500 text-white"
                >
                  ⏹ Stop
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex-1 flex flex-col items-center gap-4">
          <div className="relative flex flex-col items-center bg-zinc-800/50 backdrop-blur-md rounded-xl p-4 shadow-md">
            <div className="flex gap-1 mb-1 relative left-4">
              {blackKeys.map((key) => (
                <Button
                  key={key.note}
                  className={`w-8 h-24 bg-zinc-900 cursor-pointer rounded-sm border border-zinc-700 hover:bg-zinc-800 
                    ${activeKeys.includes(key.note) ? 'bg-yellow-300' : ''} 
                    text-white text-xs z-10`}
                  onClick={() => playNote(key.note)}
                >
                  {key.label}
                </Button>
              ))}
            </div>
            
            <div className="flex gap-1">
              {whiteKeys.map((key) => (
                <Button
                  key={key.note}
                  className={`w-12 h-32 cursor-pointer rounded-sm border border-zinc-700 
                    ${activeKeys.includes(key.note) ? 'bg-yellow-300' : 'bg-white'} 
                    text-black hover:bg-zinc-200 text-sm`}
                  onClick={() => playNote(key.note)}
                >
                  {key.label}
                </Button>
              ))}
            </div>
          </div>

          <div
            ref={sheetContainerRef}
            className="w-full bg-white rounded-lg p-4 min-h-[200px]"
          ></div>
        </div>

        <Card className="w-1/4 min-w-[250px] h-[500px] bg-zinc-800/50 backdrop-blur-md text-white shadow-xl">
          <CardContent className="p-4 flex flex-col h-full">
            <h2 className="text-lg font-semibold mb-2">AI Chat</h2>
            <div className="flex-1 overflow-auto mb-4 space-y-4">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`p-2 rounded ${
                    msg.role === 'user' ? 'bg-zinc-700/50 ml-4' : 'bg-zinc-600/50 mr-4'
                  }`}
                >
                  {msg.content}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Ask about music theory..."
                className="flex-1 bg-zinc-700/50 rounded p-2 text-white"
                onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
              />
              <Button
                onClick={handleChatSubmit}
                disabled={loading}
                className="bg-yellow-400 text-black hover:bg-yellow-300"
              >
                {loading ? '...' : 'Send'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
