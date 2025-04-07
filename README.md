# 🎵 MusicBass 
<br>

**Decode. Play. Learn.**  <br><br>
A web app that transforms sheet music into sound and insight—so musicians can learn faster and play better.

Live - https://music-garrage.vercel.app/
Sample Musicxml file u can download for testing - https://shorturl.at/Xt60j

## 🚀 What It Does

Music Bass:
- 🎼 Parses MusicXML files (like *Carol of the Bells*)
- 🎹 Autoplays piano notes using Tone.js
- 🎸 Reads chords and analyze it shapes
- 🎨 Built with Next.js, Tailwind CSS, and shadcn for a smooth UX

## 💡 Why We Built It

Learning from sheet music can be tough—especially for beginners. We built this tool to bridge the gap between notes on paper and sound in your ears.

## 🛠️ Tech Stack

- **Frontend**: Next.js + Tailwind CSS + shadcn/ui
- **Sound Engine**: [Tone.js](https://tonejs.github.io/)
- **Parsing**: xml2js + custom MusicXML logic
- **Language**: Javascript + React

## 📂 How to Use

1. Upload a `.mxl` MusicXML file.
2. Hit **Play**.
3. Listen, learn, and follow along visually
4. Also there will be an Ai to help you

# Ai wokring setup

1.You have to make a .env.local file in the root directory <br> <br>
2. Then add your Nebius_Api_Key  in order to make the chat functionality to work

```bash
NEBIUS_API_KEY = Your_Api_Key
```

# Here's Our Demo or PPT

https://shorturl.at/BiFeI


## ⚡ Setup

```bash
git clone https://github.com/isabelle36/
```
```bash
cd music-garrage
```
```bash
npm install
```
```bash
npm run dev
```
