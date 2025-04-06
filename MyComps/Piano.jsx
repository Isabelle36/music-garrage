"use client";

import { useState, useEffect, useRef } from "react";
import * as Tone from "tone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { parseStringPromise } from "xml2js";
import { unzipSync, strFromU8 } from "fflate";
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";

const whiteKeys = [
  { note: "C4", label: "C" },
  { note: "D4", label: "D" },
  { note: "E4", label: "E" },
  { note: "F4", label: "F" },
  { note: "G4", label: "G" },
  { note: "A4", label: "A" },
  { note: "B4", label: "B" },
  { note: "C5", label: "C" },
];

const blackKeys = [
  { note: "C#4", label: "C#" },
  { note: "D#4", label: "D#" },
  { note: "F#4", label: "F#" },
  { note: "G#4", label: "G#" },
  { note: "A#4", label: "A#" },
];

const noteNames = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

export default function Piano() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeKeys, setActiveKeys] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [parsedNotes, setParsedNotes] = useState([]);
  const [musicXMLText, setMusicXMLText] = useState("");
  const [tempo, setTempo] = useState(120);
  const [isMetronomeOn, setIsMetronomeOn] = useState(false);
  const synthRef = useRef(null);
  const metronomeRef = useRef(null);
  const sheetContainerRef = useRef(null);
  const osmdRef = useRef(null);
  const timeoutsRef = useRef([]);
  const chatContainerRef = useRef(null);
  const [uniqueChords, setUniqueChords] = useState([]);
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);

  useEffect(() => {
    let synth = null;
    const startTone = async () => {
      try {
        await Tone.start();
        synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: "triangle" },
          envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 },
        }).toDestination();
        synthRef.current = synth;

        const metronomeSynth = new Tone.Synth({
          oscillator: { type: "square" },
          envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
          volume: -10,
        }).toDestination();
        metronomeRef.current = metronomeSynth;
      } catch (err) {
        console.error("Failed to initialize Tone.js:", err);
      }
    };
    startTone();

    return () => {
      if (synthRef.current) synthRef.current.dispose();
      if (metronomeRef.current) metronomeRef.current.dispose();
      clearTimeouts();
      Tone.Transport.stop();
      Tone.Transport.cancel();
    };
  }, []);

  useEffect(() => {
    const id = Tone.Transport.scheduleRepeat((time) => {
      if (metronomeRef.current) {
        metronomeRef.current.triggerAttackRelease("C5", "32n", time);
      }
    }, "4n");

    return () => {
      Tone.Transport.clear(id);
    };
  }, []);

  useEffect(() => {
    Tone.Transport.bpm.value = tempo;
  }, [tempo]);

  useEffect(() => {
    return () => {
      if (osmdRef.current) {
        osmdRef.current.clear();
        osmdRef.current = null;
      }
    };
  }, []);

  const toggleMetronome = () => {
    if (!isMetronomeOn) {
      Tone.Transport.start();
    } else {
      Tone.Transport.stop();
    }
    setIsMetronomeOn(!isMetronomeOn);
  };

  const handleTempoChange = (e) => {
    const newTempo = parseInt(e.target.value);
    if (!isNaN(newTempo) && newTempo >= 40 && newTempo <= 208) {
      setTempo(newTempo);
    }
  };

  const initializeAudio = async () => {
    if (isAudioInitialized) return;

    try {
      await Tone.start();
      const synth = new Tone.Synth({
        volume: -6,
        oscillator: {
          type: "sine",
        },
      }).toDestination();
      synthRef.current = synth;
      setIsAudioInitialized(true);
    } catch (err) {
      console.error("Failed to initialize audio:", err);
    }
  };

  const playNote = async (note) => {
    try {
      if (!isAudioInitialized) {
        await initializeAudio();
      }

      if (!synthRef.current) return;

      setActiveKeys((prev) => [...prev, note]);
      synthRef.current.triggerAttackRelease(note, "8n");
      setTimeout(() => {
        setActiveKeys((prev) => prev.filter((key) => key !== note));
      }, 200);
    } catch (err) {
      console.error("Error playing note:", err);
    }
  };

  const playChord = (notes) => {
    if (!synthRef.current) {
      console.warn("Synth not initialized");
      initializeAudio();
      return;
    }
    try {
      setActiveKeys(notes);
      if (synthRef.current.triggerAttackRelease) {
        synthRef.current.triggerAttackRelease(notes, "1n", Tone.now());
      } else {
        console.warn("Synth doesn't support polyphony for chords.");
        if (notes.length > 0)
          synthRef.current.triggerAttackRelease(notes[0], "8n", Tone.now());
      }

      setTimeout(() => {
        setActiveKeys((prev) => prev.filter((k) => !notes.includes(k)));
      }, 1000);
    } catch (err) {
      console.error("Error playing chord:", err);
    }
  };

  const handleChatSubmit = async () => {
    if (!userInput.trim() || loading) return;
  
    setLoading(true);
    const currentInput = userInput;
    const currentXML = musicXMLText;
    setUserInput("");
  
    const userMessage = { role: "user", content: currentInput };
    setChatMessages((prev) => [...prev, userMessage]);
  
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          message: currentInput,
          musicXML: currentXML,
        }),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.error || `API Error: ${response.statusText}`);
      }
  
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
        },
      ]);
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry, I encountered an error: ${error.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleChordClick = async (chord) => {
    if (loading) return;
  
    setLoading(true);
  
    const userMessage = {
      role: "user",
      content: `How do I play the chord ${chord}?`,
    };
    setChatMessages((prev) => [...prev, userMessage]);
  
    // Scroll to the top of the page
    window.scrollTo({ top: 0, behavior: "smooth" });
  
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          message: `How do I play the chord ${chord}? Tell me the notes and how to position my fingers on a piano keyboard.`,
          musicXML: musicXMLText,
          chord: chord,
        }),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.error || `API Error: ${response.statusText}`);
      }
  
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
        },
      ]);
    } catch (error) {
      console.error("Chord click error:", error);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry, I encountered an error asking about ${chord}: ${error.message}`,
        },
      ]);
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
      synthRef.current.dispose();

      const newSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: {
          type: "triangle",
        },
        envelope: {
          attack: 0.005,
          decay: 0.1,
          sustain: 0.3,
          release: 1,
        },
      }).toDestination();
      synthRef.current = newSynth;
    }
    setActiveKeys([]);
    clearTimeouts();
  };

  const parseMusicXML = async (xml) => {
    try {
      const parsed = await parseStringPromise(xml);
      const root = parsed["score-partwise"] || parsed["score-timewise"];

      if (!root) {
        throw new Error("Invalid MusicXML");
      }

      const parts = root.part || [];
      const noteList = [];
      const chordSet = new Set(); // Use a Set to store unique chords

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
            const accidental = alter === "1" ? "#" : alter === "-1" ? "b" : "";

            const noteName = `${step}${accidental}${octave}`;
            let duration = "4n";

            const type = note.type?.[0];
            if (type === "whole") duration = "1n";
            else if (type === "half") duration = "2n";
            else if (type === "quarter") duration = "4n";
            else if (type === "eighth") duration = "8n";
            else if (type === "16th") duration = "16n";

            noteList.push({ pitch: noteName, duration });

            // Add the chord to the Set
            chordSet.add(noteName);
          });
        });
      });

      setParsedNotes(noteList);
      setUniqueChords(Array.from(chordSet)); // Convert Set to Array
      console.log("Parsed Notes:", noteList);
      console.log("Unique Chords:", Array.from(chordSet));
    } catch (err) {
      console.error("Failed to parse MusicXML:", err);
      setParsedNotes([]);
      setUniqueChords([]);
      throw err;
    }
  };

  const renderSheetMusic = async (xmlString) => {
    if (!sheetContainerRef.current) return;

    if (osmdRef.current) {
      try {
        osmdRef.current.clear();
      } catch (e) {
        console.warn("Error clearing previous OSMD instance:", e);
      }
      osmdRef.current = null;
    }

    const currentOSMDInstance = new OpenSheetMusicDisplay(
      sheetContainerRef.current,
      {
        backend: "svg",
        drawTitle: false,
        drawSubtitle: false,
        drawComposer: false,
        drawPartNames: true,
        drawMeasureNumbers: true,
        autoResize: false,
      }
    );
    osmdRef.current = currentOSMDInstance;

    try {
      await currentOSMDInstance.load(xmlString);
      currentOSMDInstance.render();
      console.log("OSMD Rendered successfully");
    } catch (err) {
      console.error("Error rendering sheet music:", err);
      if (sheetContainerRef.current) {
        sheetContainerRef.current.innerHTML = `<p class="text-red-500">Render Error: ${
          err.message || err
        }</p>`;
      }
      throw err;
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setParsedNotes([]);
    setMusicXMLText("");

    let rawXML = "";

    try {
      const fileExt = selectedFile.name.split(".").pop().toLowerCase();
      if (fileExt === "mxl") {
        const buffer = await selectedFile.arrayBuffer();
        const zip = unzipSync(new Uint8Array(buffer));

        const containerPath = "META-INF/container.xml";
        let rootFilePath = "";

        if (zip[containerPath]) {
          const containerXml = strFromU8(zip[containerPath]);
          const parser = new DOMParser();
          const containerDoc = parser.parseFromString(
            containerXml,
            "application/xml"
          );
          rootFilePath =
            containerDoc.querySelector("rootfile")?.getAttribute("full-path") ||
            "";
        }

        if (rootFilePath && zip[rootFilePath]) {
          rawXML = strFromU8(zip[rootFilePath]);
        } else {
          const xmlFileName = Object.keys(zip).find(
            (name) =>
              (name.toLowerCase().endsWith(".xml") ||
                name.toLowerCase().endsWith(".musicxml")) &&
              !name.toLowerCase().startsWith("meta-inf/")
          );
          if (!xmlFileName)
            throw new Error("No suitable MusicXML file found in MXL.");
          rawXML = strFromU8(zip[xmlFileName]);
        }
      } else if (fileExt === "xml" || fileExt === "musicxml") {
        rawXML = await selectedFile.text();
      } else {
        throw new Error(
          "Unsupported file type. Please upload .mxl, .xml, or .musicxml"
        );
      }

      setMusicXMLText(rawXML);

      await renderSheetMusic(rawXML);
      await parseMusicXML(rawXML);
    } catch (err) {
      console.error("Upload/Processing error:", err);
      setMusicXMLText("");
      setParsedNotes([]);
      if (sheetContainerRef.current) {
        if (osmdRef.current) {
          try {
            osmdRef.current.clear();
          } catch (e) {}
          osmdRef.current = null;
        }
        sheetContainerRef.current.innerHTML = `<p class="text-red-500">Error: ${
          err.message || "Failed to process file."
        }</p>`;
      }
    } finally {
      setLoading(false);
    }
  };

  const playAllNotes = async () => {
    if (!synthRef.current || !parsedNotes.length) return;

    stopPlayback();

    try {
      if (Tone.context.state !== "running") {
        await Tone.start();
        console.log("Audio context started for playback.");
      }

      const now = Tone.now();
      let currentTime = now;

      const getToneDuration = (durationString, isDotted) => {
        let baseDuration;
        switch (durationString) {
          case "1n":
            baseDuration = Tone.Time("1n").toSeconds();
            break;
          case "2n":
            baseDuration = Tone.Time("2n").toSeconds();
            break;
          case "4n":
            baseDuration = Tone.Time("4n").toSeconds();
            break;
          case "8n":
            baseDuration = Tone.Time("8n").toSeconds();
            break;
          case "16n":
            baseDuration = Tone.Time("16n").toSeconds();
            break;
          case "32n":
            baseDuration = Tone.Time("32n").toSeconds();
            break;
          default:
            baseDuration = Tone.Time("4n").toSeconds();
        }
        return isDotted ? baseDuration * 1.5 : baseDuration;
      };

      parsedNotes.forEach(({ pitch, duration, dotted }) => {
        const noteDurationSeconds = getToneDuration(duration, dotted);
        const attackTime = currentTime;
        const playDuration = noteDurationSeconds * 0.9;
        const releaseTime = currentTime + playDuration;

        synthRef.current.triggerAttackRelease(pitch, playDuration, attackTime);

        const attackDelayMs = Math.max(0, (attackTime - Tone.now()) * 1000);
        const releaseDelayMs = Math.max(0, (releaseTime - Tone.now()) * 1000);

        timeoutsRef.current.push(
          setTimeout(() => {
            setActiveKeys((prev) => [...prev, pitch]);
          }, attackDelayMs)
        );

        timeoutsRef.current.push(
          setTimeout(() => {
            setActiveKeys((prev) => prev.filter((key) => key !== pitch));
          }, releaseDelayMs)
        );

        currentTime += noteDurationSeconds;
      });

      const finalClearDelayMs = Math.max(0, (currentTime - Tone.now()) * 1000);
      timeoutsRef.current.push(
        setTimeout(() => {
          setActiveKeys([]);
        }, finalClearDelayMs + 200)
      );
    } catch (err) {
      console.error("Error during playback:", err);
      setActiveKeys([]);
    }
  };

  const getNoteValue = (noteName) => {
    return noteNames.indexOf(noteName.toUpperCase());
  };
  const getNoteName = (value) => {
    return noteNames[value % 12];
  };
  const getNotesForChord = (chordName) => {
    if (!chordName) return [];
    chordName = chordName.trim();
    let rootNoteName = "";
    let modifier = "";
    let quality = "major";
    if (
      chordName.length > 1 &&
      (chordName[1] === "#" || chordName[1] === "b")
    ) {
      rootNoteName = chordName.substring(0, 2);
      modifier = chordName.substring(2);
    } else {
      rootNoteName = chordName.substring(0, 1);
      modifier = chordName.substring(1);
    }
    if (
      modifier.toLowerCase().startsWith("m") &&
      !modifier.toLowerCase().startsWith("maj")
    ) {
      quality = "minor";
    }
    if (rootNoteName.endsWith("b")) {
      const noteVal = getNoteValue(rootNoteName[0]);
      if (noteVal !== -1) {
        rootNoteName = getNoteName(noteVal - 1 + 12);
      } else {
        console.warn(`Cannot parse root note: ${rootNoteName}`);
        return [];
      }
    } else if (rootNoteName.endsWith("#")) {
      /* Assuming C#, D#, F#, G#, A# are handled correctly by getNoteValue */
    }

    const rootValue = getNoteValue(rootNoteName);
    if (rootValue === -1) {
      console.warn(`Cannot find value for root note: ${rootNoteName}`);
      return [];
    }

    const octave = 4;
    const root = `${getNoteName(rootValue)}${octave}`;
    const thirdInterval = quality === "major" ? 4 : 3;
    const third = `${getNoteName(rootValue + thirdInterval)}${octave}`;
    const fifth = `${getNoteName(rootValue + 7)}${octave}`;

    let notes = [root, third, fifth];
    if (modifier.includes("7") && !modifier.includes("maj7")) {
      const seventh = `${getNoteName(rootValue + 10)}${octave}`;
      notes.push(seventh);
    } else if (modifier.includes("maj7")) {
      const seventh = `${getNoteName(rootValue + 11)}${octave}`;
      notes.push(seventh);
    } else if (modifier.includes("m7") && quality === "minor") {
      const seventh = `${getNoteName(rootValue + 10)}${octave}`;
      notes.push(seventh);
    }

    console.log(
      `Chord: ${chordName}, Parsed: ${rootNoteName} ${quality}${modifier}, Notes: [${notes.join(
        ", "
      )}]`
    );
    return notes;
  };

  const highlightChords = (targetChords) => {
    const container = sheetContainerRef.current;
    if (!container) {
      console.warn("highlightChords: Container ref is not available.");
      return;
    }

    const targetChordsLower = targetChords.map((c) => c.toLowerCase());
    if (!targetChordsLower || targetChordsLower.length === 0) {
      return;
    }
    console.log(
      "highlightChords called. Searching for (lowercase):",
      targetChordsLower
    );

    const chordColors = {
      em: "yellow",
      cmaj7: "blue",
      d: "green",
      am: "pink",
      b: "orange",
      eb: "purple",
      dbmaj7: "cyan",
      bbm: "lime",
      c: "red",
      c7: "lightblue",
      g7: "lightgreen",
    };

    const svg = container.querySelector("svg");
    if (!svg) {
      console.warn("highlightChords: SVG element not found in the container.");
      return;
    }

    const chordElements = svg.querySelectorAll(
      "g.vf-chordsymbol text, g.vf-harmony text, g.vf-annotation text"
    );
    console.log(
      `highlightChords: Found ${chordElements.length} potential chord elements.`
    );

    let highlightedCount = 0;
    chordElements.forEach((textElement) => {
      const elementTag = textElement.tagName.toLowerCase();
      const chordText = textElement.textContent?.trim();
      if (!chordText) return;

      const chordTextLower = chordText.toLowerCase();

      textElement.style.fill = "";
      textElement.style.fontWeight = "";

      if (targetChordsLower.includes(chordTextLower)) {
        highlightedCount++;
        const color = chordColors[chordTextLower] || "magenta";
        textElement.style.fill = color;
        textElement.style.fontWeight = "bold";
      }
    });
    console.log(
      `highlightChords: Finished. Highlighted ${highlightedCount} chords.`
    );
  };

  return (
    <div className="flex flex-col mt-[5%] items-center justify-center min-h-screen bg-zinc-900 p-6 text-white">
      <h1 className="text-3xl font-bold mb-8 text-center">Piano Play 🎹</h1>
      {!isAudioInitialized && (
        <div className="mb-4 text-yellow-400">Click any key to start audio</div>
      )}

      <div className="flex w-full z-10 max-w-6xl gap-6">
        <Card className="w-1/4 mt-[-5%] min-w-[200px] h-[500px] bg-zinc-800/50 backdrop-blur-md text-white shadow-xl">
          <CardContent className="p-4 flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Upload Sheet</h2>

            <div className="flex flex-col gap-2 mt-2 p-3 bg-zinc-700/30 rounded">
              <h3 className="text-sm font-medium">Metronome</h3>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="40"
                  max="208"
                  value={tempo}
                  onChange={handleTempoChange}
                  className="w-16 cursor-pointer bg-zinc-600 rounded px-2 py-1 text-sm"
                />
                <span className="text-sm ">BPM</span>
                <Button
                  onClick={toggleMetronome}
                  className={`ml-auto cursor-pointer ${
                    isMetronomeOn
                      ? "bg-red-600 hover:bg-red-500"
                      : "bg-emerald-600 hover:bg-emerald-500"
                  }`}
                >
                  {isMetronomeOn ? "⏹" : "▶"}
                </Button>
              </div>
            </div>

            <input
              type="file"
              accept=".mxl,.musicxml,.xml"
              className="bg-zinc-700/50 cursor-pointer text-sm p-1 rounded"
              onChange={(e) => setSelectedFile(e.target.files[0])}
            />
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || loading}
              className="bg-zinc-600 cursor-pointer text-white hover:bg-zinc-500 disabled:opacity-50"
            >
              {loading ? "Processing..." : "Upload Sheet"}
            </Button>
            {parsedNotes.length > 0 && (
              <div className="flex flex-col gap-2 mt-2">
                <Button
                  onClick={playAllNotes}
                  className="bg-emerald-600 cursor-pointer hover:bg-emerald-500 text-white disabled:opacity-50"
                >
                  ▶️ Play Sheet Music
                </Button>
                <Button
                  onClick={stopPlayback}
                  className="bg-red-600 cursor-pointer hover:bg-red-500 text-white disabled:opacity-50"
                >
                  ⏹ Stop
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex-1 flex flex-col items-center gap-4">
          <div className="relative flex flex-col items-center bg-zinc-800/50 backdrop-blur-md rounded-xl p-4 shadow-md">
            <div
              className="absolute top-4 flex z-10"
              style={{ left: "calc(2rem)" }}
            >
              <div style={{ marginLeft: "1.41rem" }}>
                <Button
                  key="C#4"
                  className={`w-8 h-24 bg-zinc-900 cursor-pointer rounded-sm border border-zinc-700 hover:bg-zinc-800 
                    ${activeKeys.includes("C#4") ? "bg-yellow-300" : ""} 
                    text-white text-xs`}
                  onClick={() => playNote("C#4")}
                >
                  C#
                </Button>
              </div>
              <div style={{ marginLeft: "calc(0.5rem + 8px)" }}>
                <Button
                  key="D#4"
                  className={`w-8 h-24 bg-zinc-900 cursor-pointer rounded-sm border border-zinc-700 hover:bg-zinc-800 
                    ${activeKeys.includes("D#4") ? "bg-yellow-300" : ""} 
                    text-white text-xs`}
                  onClick={() => playNote("D#4")}
                >
                  D#
                </Button>
              </div>

              <div style={{ width: "3rem" }}></div>

              <div style={{ marginLeft: "calc(2rem - 10px)" }}>
                <Button
                  key="F#4"
                  className={`w-8 h-24 bg-zinc-900 cursor-pointer rounded-sm border border-zinc-700 hover:bg-zinc-800 
                    ${activeKeys.includes("F#4") ? "bg-yellow-300" : ""} 
                    text-white text-xs`}
                  onClick={() => playNote("F#4")}
                >
                  F#
                </Button>
              </div>
              <div style={{ marginLeft: "calc(0.5rem + 8px)" }}>
                <Button
                  key="G#4"
                  className={`w-8 h-24 bg-zinc-900 cursor-pointer rounded-sm border border-zinc-700 hover:bg-zinc-800 
                    ${activeKeys.includes("G#4") ? "bg-yellow-300" : ""} 
                    text-white text-xs`}
                  onClick={() => playNote("G#4")}
                >
                  G#
                </Button>
              </div>
              <div style={{ marginLeft: "calc(0.5rem + 8px)" }}>
                <Button
                  key="A#4"
                  className={`w-8 h-24 bg-zinc-900 cursor-pointer rounded-sm border border-zinc-700 hover:bg-zinc-800 
                    ${activeKeys.includes("A#4") ? "bg-yellow-300" : ""} 
                    text-white text-xs`}
                  onClick={() => playNote("A#4")}
                >
                  A#
                </Button>
              </div>
            </div>

            <div className="flex gap-1">
              {whiteKeys.map((key) => (
                <Button
                  key={key.note}
                  className={`w-12 h-40 cursor-pointer rounded-sm border border-zinc-700 
                    ${
                      activeKeys.includes(key.note)
                        ? "bg-yellow-300"
                        : "bg-white"
                    } 
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
            className="w-full bg-white rounded-lg p-4 min-h-[200px] h-96 text-black overflow-y-auto"
          >
            {!selectedFile && !loading && (
              <div className="flex justify-center items-center h-full text-zinc-500">
                Upload a MusicXML (.musicxml, .xml) or MXL (.mxl) file
              </div>
            )}
            {loading && !parsedNotes.length && (
              <div className="flex justify-center items-center h-full text-zinc-500">
                Processing sheet...
              </div>
            )}
          </div>
        </div>

        <Card className="w-1/4 z-10 mt-[-5%] min-w-[300px] h-[500px] bg-zinc-800/50 backdrop-blur-md text-white shadow-xl flex flex-col">
          <CardContent className="p-4 flex flex-col h-full">
            <h2 className="text-lg font-semibold mb-2 flex-shrink-0">
              AI Chat
            </h2>
            <div
              className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2"
              ref={chatContainerRef}
            >
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`p-2 rounded ${
                    msg.role === "user"
                      ? "bg-zinc-700/50 ml-4"
                      : "bg-zinc-600/50 mr-4"
                  } overflow-hidden break-words`}
                >
                  {msg.content}
                </div>
              ))}
              {loading && userInput === '' && (
                <div className="p-2 rounded bg-zinc-600/50 mr-4 overflow-hidden break-words text-yellow-400 animate-pulse">
                  AI is thinking...
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-auto flex-shrink-0">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Ask about music theory..."
                className="flex-1 bg-zinc-700/50 rounded p-2 text-white"
                onKeyPress={(e) => e.key === "Enter" && handleChatSubmit()}
              />
              <Button
                onClick={handleChatSubmit}
                disabled={loading}
                className="bg-yellow-400 cursor-pointer text-black hover:bg-yellow-300 disabled:opacity-50"
              >
                {loading ? "..." : "Send"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col items-center mt-4 w-full">
        <Card className="w-full max-w-4xl bg-zinc-800/50 backdrop-blur-md text-white shadow-xl">
          <CardContent className="p-4 flex flex-col">
            <h2 className="text-lg font-semibold mb-2">Chords List</h2>
            <div className="flex flex-wrap gap-2">
              {uniqueChords.length > 0 ? (
                uniqueChords.map((chord, i) => (
                  <div
                    key={i}
                    className="p-2 rounded bg-zinc-700/50 cursor-pointer hover:bg-zinc-600"
                    onClick={() => handleChordClick(chord)}
                  >
                    {chord}
                  </div>
                ))
              ) : (
                <div className="text-zinc-500">No chords extracted yet. Upload a sheet with chords.</div>
              )}
            </div>
            <div className="mt-2 text-sm text-zinc-400">
              Unique Chords Found: {uniqueChords.length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
