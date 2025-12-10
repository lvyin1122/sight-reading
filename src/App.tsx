import { type ChangeEvent, useEffect, useRef, useState } from 'react'
import {
  HiArrowDownTray,
  HiArrowUturnLeft,
  HiBookmark,
  HiPlay,
  HiSparkles,
  HiTrash,
} from 'react-icons/hi2'
import { BiCoffee } from 'react-icons/bi'
import { Accidental, Formatter, KeyManager, Renderer, Stave, StaveNote, Voice } from 'vexflow'
import './App.css'
import coffeeImg from './assets/coffee.png'

type Duration = 'q' | '8' | 'h'

type NoteSpec = {
  key: string
  accidental?: string | null
  duration: Duration
  isRest?: boolean
}

type GeneratedScore = {
  id: string
  key: string
  bars: number
  tempo: number
  timeSig: string
  measures: NoteSpec[][]
  createdAt: number
  noteDensity: number
}

const STORAGE_KEY = 'sight-reading-scores'

const keyOptions = [
  'C',
  'G',
  'D',
  'A',
  'E',
  'B',
  'F#',
  'C#',
  'F',
  'Bb',
  'Eb',
  'Ab',
  'Db',
  'Gb',
  'Cb',
  'Am',
  'Em',
  'Bm',
  'F#m',
  'C#m',
  'G#m',
  'D#m',
  'A#m',
  'Dm',
  'Gm',
  'Cm',
  'Fm',
  'Bbm',
  'Ebm',
  'Abm',
]

const durationPool: { duration: Duration; beats: number; eighths: number }[] = [
  { duration: 'q', beats: 1, eighths: 2 },
  { duration: '8', beats: 0.5, eighths: 1 },
  { duration: 'h', beats: 2, eighths: 4 },
]

const timeSignatureOptions = ['4/4', '3/4', '2/4', '6/8', '12/8', '5/4', '7/8']

const durationToBeats: Record<Duration, number> = {
  q: 1,
  '8': 0.5,
  h: 2,
}

function randomChoice<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function weightedChoice<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((sum, w) => sum + w, 0)
  const r = Math.random() * total
  let acc = 0
  for (let i = 0; i < items.length; i += 1) {
    acc += weights[i]
    if (r <= acc) return items[i]
  }
  return items[items.length - 1]
}

function parseTimeSignature(timeSig: string) {
  const match = timeSig.match(/^(\d+)\s*\/\s*(\d+)$/)
  if (!match) {
    return { numerator: 4, denominator: 4, quarterBeatsPerMeasure: 4, eighthsPerMeasure: 8 }
  }
  const numerator = Number(match[1])
  const denominator = Number(match[2])
  const quarterBeatsPerMeasure = Number(((numerator * 4) / denominator).toFixed(2))
  const eighthsPerMeasure = Math.round(quarterBeatsPerMeasure * 2)
  return { numerator, denominator, quarterBeatsPerMeasure, eighthsPerMeasure }
}

function generateMeasures(key: string, bars: number, timeSig: string, noteDensity: number): NoteSpec[][] {
  const keyManager = new KeyManager(key)
  const { eighthsPerMeasure } = parseTimeSignature(timeSig)
  const baseNotes = ['c', 'd', 'e', 'f', 'g', 'a', 'b']
  const safeDensity = Number.isFinite(noteDensity) ? noteDensity : 70
  const densityRatio = Math.max(0, Math.min(1, safeDensity / 100))
  const restChance = Math.max(0, Math.min(0.4, 0.4 - densityRatio * 0.35))

  const measures: NoteSpec[][] = []

  for (let i = 0; i < bars; i += 1) {
    const measure: NoteSpec[] = []
    let eighthsLeft = eighthsPerMeasure

    while (eighthsLeft > 0) {
      const allowedDurations = durationPool.filter((d) => d.eighths <= eighthsLeft)
      // If nothing fits (shouldn't happen), force a rest to avoid infinite loop
      if (allowedDurations.length === 0) {
        measure.push({
          key: 'b/4',
          duration: '8',
          isRest: true,
        })
        eighthsLeft = 0
        break
      }

      const weights = allowedDurations.map((d) => {
        const shorterBoost = d.eighths <= 1 ? 1 + densityRatio * 2 : 1
        const longerBoost = d.eighths >= 4 ? 1 + (1 - densityRatio) * 2 : 1
        const midBoost = d.eighths === 2 ? 1 + densityRatio * 0.5 : 1
        return 1 * shorterBoost * longerBoost * midBoost
      })

      const choice = weightedChoice(allowedDurations, weights)
      const octave = randomChoice([4, 5])
      const letter = randomChoice(baseNotes)
      const selection = keyManager.selectNote(letter)
      const insertRest = Math.random() < restChance

      measure.push({
        key: `${selection.note}/${octave}`,
        accidental: selection.accidental,
        duration: choice.duration,
        isRest: insertRest,
      })

      eighthsLeft -= choice.eighths
    }

    measures.push(measure)
  }

  return measures
}

function noteToFrequency(noteKey: string): number {
  const [rawNote, octaveStr] = noteKey.split('/')
  const octave = Number(octaveStr)
  if (!rawNote || Number.isNaN(octave)) return 440

  const letter = rawNote[0]?.toLowerCase()
  const accidentals = rawNote.slice(1)
  const baseOffsets: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }
  const base = baseOffsets[letter] ?? 0

  let accidentalOffset = 0
  if (accidentals === '#') accidentalOffset = 1
  else if (accidentals === '##') accidentalOffset = 2
  else if (accidentals === 'b') accidentalOffset = -1
  else if (accidentals === 'bb') accidentalOffset = -2

  const midi = (octave + 1) * 12 + base + accidentalOffset
  return 440 * 2 ** ((midi - 69) / 12)
}

function scheduleTone(context: AudioContext, start: number, duration: number, frequency: number) {
  const osc = context.createOscillator()
  const gain = context.createGain()
  osc.type = 'triangle'
  osc.frequency.value = frequency

  gain.gain.setValueAtTime(0.001, start)
  gain.gain.linearRampToValueAtTime(0.12, start + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration)

  osc.connect(gain).connect(context.destination)
  osc.start(start)
  osc.stop(start + duration + 0.05)
}

function drawScore(score: GeneratedScore | null, container: HTMLDivElement | null) {
  if (!score || !container) return

  container.innerHTML = ''
  const width = container.clientWidth || 900
  // Derive measures per line from available width to auto-wrap on smaller screens.
  const maxPerLine = Math.max(1, Math.floor((width - 20) / 170))
  const perLine = Math.max(1, Math.min(score.bars, maxPerLine || 1))
  const measureWidth = Math.max(140, Math.floor((width - 20) / perLine))
  const lines = Math.ceil(score.bars / perLine)
  const height = lines * 170
  const { numerator, denominator } = parseTimeSignature(score.timeSig)

  const renderer = new Renderer(container, Renderer.Backends.SVG)
  renderer.resize(width, height)
  const context = renderer.getContext()

  let x = 10
  let y = 40

  score.measures.forEach((measure, idx) => {
    const stave = new Stave(x, y, measureWidth)

    if (idx === 0) {
      stave.addClef('treble')
      stave.addKeySignature(score.key)
      stave.addTimeSignature(score.timeSig)
      stave.setTempo(
        {
          duration: 'q',
          dots: 0,
          bpm: score.tempo,
        },
        -40,
      )
    }

    const notes = measure.map((note) => {
      const staveNote = new StaveNote({
        clef: 'treble',
        keys: note.isRest ? ['b/4'] : [note.key],
        duration: note.isRest ? `${note.duration}r` : note.duration,
      })
      if (note.accidental && !note.isRest) {
        staveNote.addModifier(new Accidental(note.accidental), 0)
      }
      return staveNote
    })

    const voice = new Voice({ numBeats: numerator, beatValue: denominator })
    voice.addTickables(notes)

    // Account for clef/key/time glyph width so the first measure doesn't overflow
    const noteStartX = stave.getNoteStartX()
    const availableWidth = Math.max(50, measureWidth - (noteStartX - x) - 12)
    new Formatter().joinVoices([voice]).format([voice], availableWidth)

    stave.setContext(context).draw()
    voice.draw(context, stave)

    x += measureWidth
    if (x + measureWidth > width) {
      x = 10
      y += 150
    }
  })
}

function loadCollection(): GeneratedScore[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw
      ? (JSON.parse(raw) as Array<GeneratedScore & { timeSig?: string; noteDensity?: number }>)
      : []
    return parsed.map((item) => ({
      ...item,
      timeSig: item.timeSig ?? '4/4',
      noteDensity: Number.isFinite(item.noteDensity) ? item.noteDensity : 70,
    }))
  } catch (err) {
    console.warn('Failed to load saved scores', err)
    return []
  }
}

function persistCollection(items: GeneratedScore[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function App() {
  const [keySig, setKeySig] = useState('C')
  const [bars, setBars] = useState(4)
  const [tempo, setTempo] = useState(100)
  const [timeSig, setTimeSig] = useState('4/4')
  const [noteDensity, setNoteDensity] = useState(70)
  const [score, setScore] = useState<GeneratedScore | null>(null)
  const [previousScore, setPreviousScore] = useState<GeneratedScore | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [collection, setCollection] = useState<GeneratedScore[]>(() => loadCollection())
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isAndroid = /android/i.test(navigator.userAgent)
  const [showSupportModal, setShowSupportModal] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const playTimeoutRef = useRef<number | null>(null)
  useEffect(() => {
    drawScore(score, containerRef.current)
  }, [score])
  useEffect(() => {
    return () => {
      if (playTimeoutRef.current) {
        window.clearTimeout(playTimeoutRef.current)
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close()
      }
    }
  }, [])

  useEffect(() => {
    const handleResize = () => {
      drawScore(score, containerRef.current)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [score])

  const handleGenerate = () => {
    setPreviousScore(score)
    const measures = generateMeasures(keySig, bars, timeSig, noteDensity)
    const nextScore: GeneratedScore = {
      id: crypto.randomUUID(),
      key: keySig,
      bars,
      tempo,
      timeSig,
      noteDensity,
      measures,
      createdAt: Date.now(),
    }
    setScore(nextScore)
  }

  const handlePlay = async () => {
    if (!score || isPlaying) return

    if (audioCtxRef.current) {
      await audioCtxRef.current.close()
    }
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const context = new AudioCtx()
    audioCtxRef.current = context

    const secondsPerBeat = 60 / score.tempo
    let cursor = context.currentTime + 0.1 // slight lead-in to avoid truncation

    score.measures.forEach((measure) => {
      measure.forEach((note) => {
        const beats = durationToBeats[note.duration]
        const durationSec = beats * secondsPerBeat
        if (!note.isRest) {
          const freq = noteToFrequency(note.key)
          scheduleTone(context, cursor, durationSec, freq)
        }
        cursor += durationSec
      })
    })

    const totalMs = Math.max(0, Math.ceil((cursor - context.currentTime) * 1000))
    setIsPlaying(true)
    if (playTimeoutRef.current) {
      window.clearTimeout(playTimeoutRef.current)
    }
    playTimeoutRef.current = window.setTimeout(() => {
      setIsPlaying(false)
    }, totalMs + 50)
  }

  const handleSave = () => {
    if (!score) return
    if (collection.some((item) => item.id === score.id)) {
      window.alert('Score already exists in collection.')
      return
    }
    const updated = [score, ...collection].slice(0, 30)
    setCollection(updated)
    persistCollection(updated)
  }

  const handleLoad = (id: string) => {
    setPreviousScore(score)
    const found = collection.find((item) => item.id === id)
    if (found) {
      setScore(found)
      setKeySig(found.key)
      setBars(found.bars)
      setTempo(found.tempo)
      setTimeSig(found.timeSig)
      setNoteDensity(found.noteDensity ?? 70)
    }
  }

  const handleDelete = (id: string) => {
    const filtered = collection.filter((item) => item.id !== id)
    setCollection(filtered)
    persistCollection(filtered)
    if (score?.id === id) {
      setScore(null)
    }
  }

  const normalizeImportedScore = (raw: unknown): GeneratedScore | null => {
    if (!raw || typeof raw !== 'object') return null
    const data = raw as Partial<GeneratedScore> & { measures?: unknown }

    if (!data.key || typeof data.key !== 'string') return null
    if (!data.timeSig || typeof data.timeSig !== 'string') return null

    const tempoNum = Number(data.tempo)
    if (!Number.isFinite(tempoNum)) return null
    const densityNum = Number.isFinite(Number(data.noteDensity)) ? Number(data.noteDensity) : 70

    const measuresRaw = Array.isArray(data.measures) ? data.measures : null
    if (!measuresRaw) return null

    const normalizedMeasures: NoteSpec[][] = []
    for (const measure of measuresRaw) {
      if (!Array.isArray(measure)) return null
      const normMeasure: NoteSpec[] = []
      for (const note of measure) {
        if (!note || typeof note !== 'object') return null
        const n = note as Partial<NoteSpec> & { duration?: string; key?: string }
        const duration = n.duration
        if (duration !== 'q' && duration !== '8' && duration !== 'h') return null
        const isRest = Boolean(n.isRest)
        if (!isRest && (!n.key || typeof n.key !== 'string')) return null

        normMeasure.push({
          key: n.key ?? 'b/4',
          accidental: n.accidental ?? null,
          duration,
          isRest,
        })
      }
      normalizedMeasures.push(normMeasure)
    }

    const barsNum = Number.isFinite(Number(data.bars)) ? Number(data.bars) : normalizedMeasures.length || 1

    return {
      id: data.id || crypto.randomUUID(),
      key: data.key,
      bars: barsNum,
      tempo: tempoNum,
      timeSig: data.timeSig,
      noteDensity: densityNum,
      measures: normalizedMeasures,
      createdAt: data.createdAt && Number.isFinite(Number(data.createdAt)) ? Number(data.createdAt) : Date.now(),
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const imported = normalizeImportedScore(parsed)
      if (!imported) {
        window.alert('Invalid score file. Please select a JSON file exported from this app.')
        return
      }

      setPreviousScore(score)
      setScore(imported)
      setKeySig(imported.key)
      setBars(imported.bars)
      setTempo(imported.tempo)
      setTimeSig(imported.timeSig)
      setNoteDensity(imported.noteDensity)

      const filtered = collection.filter((c) => c.id !== imported.id)
      const updated = [imported, ...filtered].slice(0, 30)
      setCollection(updated)
      persistCollection(updated)
    } catch (err) {
      console.error('Failed to load score file', err)
      window.alert('Failed to load score file. Please ensure it is valid JSON.')
    } finally {
      event.target.value = ''
    }
  }

  const handleDownload = (item: GeneratedScore) => {
    const safeKey = item.key.replace(/[^a-z0-9-]+/gi, '_')
    const filename = `score-${safeKey || 'untitled'}-${item.id}.json`
    const json = JSON.stringify(item, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const handleScoreClick = () => {
    if (!score) return
    handleGenerate()
  }

  const handleAddToHome = () => {
    if (isIos) {
      window.alert('On iOS Safari: tap Share → Add to Home Screen.')
    } else if (isAndroid) {
      window.alert('In Chrome: Menu → Add to Home screen.')
    } else {
      window.alert('Open this app on your mobile browser to add it to your home screen.')
    }
  }

  const handleBuyCoffee = () => setShowSupportModal(true)
  const handleCloseSupport = () => setShowSupportModal(false)

  const handleRevert = () => {
    if (!previousScore) return
    const current = score
    setScore(previousScore)
    setKeySig(previousScore.key)
    setBars(previousScore.bars)
    setTempo(previousScore.tempo)
    setTimeSig(previousScore.timeSig)
    setNoteDensity(previousScore.noteDensity ?? 70)
    setPreviousScore(current)
  }

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Sight-Reading Generator</h1>
          <p>Create quick practice sheets and keep the ones you like.</p>
        </div>
        <div className="header-actions">
          <button className="secondary icon-btn" onClick={handleAddToHome}>
            Add to Home
          </button>
          <button className="secondary icon-btn" onClick={handleImportClick}>
            <HiArrowDownTray aria-hidden="true" />
            <span>Import Score</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={handleFileSelected}
          />
        </div>
      </header>

      <section className="controls">
        <div className="field">
          <label htmlFor="key">Key</label>
          <select id="key" value={keySig} onChange={(e) => setKeySig(e.target.value)}>
            {keyOptions.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="timeSig">Time signature</label>
          <select id="timeSig" value={timeSig} onChange={(e) => setTimeSig(e.target.value)}>
            {timeSignatureOptions.map((sig) => (
              <option key={sig} value={sig}>
                {sig}
              </option>
            ))}
          </select>
        </div>

        <div className="field field-group">
          <div className="field-inline">
            <label htmlFor="bars">Bars</label>
            <input
              id="bars"
              type="number"
              min={1}
              max={32}
              value={bars}
              onChange={(e) => setBars(Number(e.target.value))}
            />
          </div>

          <div className="field-inline">
            <label htmlFor="tempo">Tempo (BPM)</label>
            <input
              id="tempo"
              type="number"
              min={40}
              max={220}
              value={tempo}
              onChange={(e) => setTempo(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="noteDensity">Note density</label>
          <div className="dual-inputs">
            <input
              id="noteDensity"
              type="range"
              min={0}
              max={100}
              step={5}
              value={noteDensity}
              onChange={(e) => setNoteDensity(Math.max(0, Math.min(100, Number(e.target.value))))}
            />
            <input
              type="number"
              min={0}
              max={100}
              value={noteDensity}
              onChange={(e) => setNoteDensity(Math.max(0, Math.min(100, Number(e.target.value))))}
              aria-label="Note density value"
            />
          </div>
        </div>

        <div className="actions">
          <button className="primary icon-btn" onClick={handleGenerate}>
            <HiSparkles aria-hidden="true" />
            <span>Generate</span>
          </button>
        </div>
      </section>

      <section className="score-panel">
        <div className="panel-header">
          <h2>Score</h2>
          {score ? (
            <div className="meta">
              <span>{score.key}</span>
              <span>{score.bars} bars</span>
              <span>{score.timeSig}</span>
              <span>{score.tempo} BPM</span>
              <span>{score.noteDensity}% density</span>
            </div>
          ) : (
            <span className="hint">Generate a score to preview notation</span>
          )}
        </div>
        <div
          className={`score-container ${score ? 'clickable' : ''}`}
          ref={containerRef}
          onClick={handleScoreClick}
          title={score ? 'Click to generate another score' : undefined}
        />
        {score && (
          <>
            <p className="hint score-hint">Tip: click the score to generate a new one.</p>
            <div className="actions score-actions">
              <button className="secondary icon-btn" onClick={handleRevert} disabled={!previousScore}>
                <HiArrowUturnLeft aria-hidden="true" />
                <span>Previous</span>
              </button>
              <button className="secondary icon-btn" onClick={handlePlay} disabled={isPlaying}>
                <HiPlay aria-hidden="true" />
                <span>{isPlaying ? 'Playing…' : 'Play'}</span>
              </button>
              <button className="secondary icon-btn" onClick={handleSave}>
                <HiBookmark aria-hidden="true" />
                <span>Save</span>
              </button>
            </div>
          </>
        )}
      </section>

      <section className="collection-panel">
        <div className="panel-header">
          <h2>Library</h2>
          <span className="hint">Most recent first (stored locally)</span>
        </div>
        {collection.length === 0 ? (
          <p className="hint">No saved scores yet. Save ones you like.</p>
        ) : (
          <ul className="collection-list">
            {collection.map((item) => (
              <li key={item.id} className="collection-item">
                <div className="collection-info">
                  <div className="title">
                    {item.key} — {item.bars} bars — {item.timeSig} @ {item.tempo} BPM
                  </div>
                  <div className="timestamp">
                    {new Date(item.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="collection-actions">
                  <button onClick={() => handleLoad(item.id)}>Apply</button>
                  <button
                    className="icon-only"
                    onClick={() => handleDownload(item)}
                    aria-label="Download score"
                    title="Download score"
                  >
                    <HiArrowDownTray aria-hidden="true" />
                    <span>Export</span>
                  </button>
                  <button
                    className="danger icon-only"
                    onClick={() => handleDelete(item.id)}
                    aria-label="Delete score"
                    title="Delete score"
                  >
                    <HiTrash aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button className="secondary icon-btn" onClick={handleBuyCoffee}>
        <BiCoffee className="icon" />
        <span>Buy me a coffee</span>
      </button>

      {showSupportModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Support the creator">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Buy me a coffee</h3>
            <p className="hint">Scan the QR code below to support this project.</p>
            <p className="hint">Every little bit helps!</p>
            <div className="qr-placeholder large" aria-label="Buy me a coffee QR placeholder">
              <img src={coffeeImg} alt="Buy me a coffee" className="qr-image" />
            </div>
          <div className="actions modal-actions">
            <button className="secondary" onClick={handleCloseSupport}>
              Close
            </button>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
