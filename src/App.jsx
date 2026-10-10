import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import World from './World.jsx'
import Player from './Player.jsx'
import Minimap from './Minimap.jsx'
import TouchControls from './TouchControls.jsx'
import ChatPanel from './ChatPanel.jsx'
import { EYE, SPAWN } from './layout.js'
import { PEOPLE_INFO, TALKING } from './talk.js'

export default function App() {
  const [locked, setLocked] = useState(false)
  const [where, setWhere] = useState('')
  const [showMap, setShowMap] = useState(true)
  const lockRef = useRef()
  const mapRef = useRef()
  const onLock = useCallback((v) => setLocked(v), [])
  const onWhere = useCallback((w) => setWhere(w), [])
  // phones have no pointer lock, so they get a joystick + drag-to-look instead
  const [isTouch] = useState(() => matchMedia('(pointer: coarse)').matches) // phones + tablets; touchscreen laptops still get mouse mode
  const [touchOn, setTouchOn] = useState(false)
  const touchRef = useRef({ active: false, move: [0, 0], look: [0, 0], jump: false })
  const setTouch = (on) => {
    touchRef.current.active = on
    touchRef.current.move = [0, 0]
    setTouchOn(on)
  }
  const playing = locked || touchOn
  const [hover, setHover] = useState(null) // talk id under the crosshair
  const [talking, setTalking] = useState(null) // talk id we're chatting with
  const onHover = useCallback((id) => setHover(id), [])
  const onTalk = useCallback((id) => {
    lockRef.unlock?.() // free the mouse so you can type
    TALKING.id = id
    setTalking(id)
  }, [])
  const closeChat = useCallback(() => {
    TALKING.id = null
    setTalking(null)
    if (!touchRef.current.active) {
      try {
        lockRef.current?.() // grab the mouse again (browsers may refuse after Esc; then the overlay shows)
      } catch {
        /* overlay handles it */
      }
    }
  }, [])
  useEffect(() => {
    const k = (e) => {
      if (e.target instanceof HTMLElement && e.target.matches('input, textarea')) return
      if (e.code === 'KeyM') setShowMap((v) => !v)
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])
  // dev helper: document.body.dataset.talk = "zaman" opens the chat without pointer lock
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const obs = new MutationObserver(() => {
      const id = document.body.dataset.talk
      if (id && PEOPLE_INFO[id]) {
        delete document.body.dataset.talk
        onTalk(id)
      }
    })
    obs.observe(document.body, { attributes: true, attributeFilter: ['data-talk'] })
    return () => obs.disconnect()
  }, [onTalk])

  return (
    <>
      <Canvas
        camera={{ fov: 72, near: 0.05, far: 800, position: [SPAWN.x, EYE, SPAWN.z] }}
        dpr={[1, 1.75]}
      >
        <World />
        <Player lockRef={lockRef} mapRef={mapRef} touchRef={touchRef} onLock={onLock} onWhere={onWhere} onHover={onHover} onTalk={onTalk} />
      </Canvas>

      <div className="where">
        <span className="dot" />
        {where}
      </div>
      <div className={showMap ? 'mapwrap' : 'mapwrap hidden'}>
        <Minimap drawRef={mapRef} />
      </div>
      <button className="maptoggle" onClick={() => setShowMap((s) => !s)}>
        {showMap ? 'hide map' : 'map'}
      </button>
      {playing && !talking && <div className={hover ? 'crosshair talk' : 'crosshair'} />}
      {playing && !talking && hover && (
        // on touch screens the pill is a button; with a mouse you just click
        <button className="talkpill" onClick={() => touchOn && onTalk(hover)} tabIndex={touchOn ? 0 : -1}>
          {touchOn ? 'Tap' : 'Click'} to talk to {PEOPLE_INFO[hover]?.name}
        </button>
      )}
      {touchOn && !talking && <TouchControls touchRef={touchRef} onPause={() => setTouch(false)} />}
      {talking && <ChatPanel key={talking} id={talking} onClose={closeChat} />}

      {!playing && !talking && (
        <div className="overlay" onClick={() => (isTouch ? setTouch(true) : lockRef.current?.())}>
          <div className="card">
            <div className="kicker">Yale SOM · Evans Hall</div>
            <h1>Floor 2</h1>
            <p className="sub">Classroom drums, the cloister, Ross Library, the Beinecke Terrace Room, and the courtyard.</p>
            <button className="go">{isTouch ? 'Tap to walk in' : 'Click to walk in'}</button>
            {!isTouch && (
              <button
                className="go alt"
                onClick={(e) => {
                  e.stopPropagation()
                  setTouch(true)
                }}
              >
                Use on-screen joystick
              </button>
            )}
            {isTouch ? (
              <div className="keys">
                <span><b>Left thumb</b> joystick to walk (push all the way to hurry)</span>
                <span><b>Right thumb</b> drag to look</span>
              </div>
            ) : (
              <div className="keys">
                <span><b>W A S D</b> walk</span>
                <span><b>Mouse</b> look</span>
                <span><b>Shift</b> sprint</span>
                <span><b>Space</b> jump</span>
                <span><b>C</b> crouch</span>
                <span><b>M</b> map</span>
                <span><b>Esc</b> pause</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
