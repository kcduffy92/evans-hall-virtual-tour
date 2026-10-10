import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import Labubu from './Labubu.jsx'
import { TALKABLES, TALKING } from './talk.js'

// Cartoon wizard professors built from primitives. Each preset sets robe, hair, beard, hat,
// glasses, size, and a prop; the shared body handles the robe, head, arms and wand.
// Presets with casual: true are AI avatars of real professors: hoodie, jeans, sneakers, cap, no wand.
// Figure faces +z; its own right hand (holding the wand) is at -x.

const mats = new Map()
const m = (color, o = {}) => {
  const k = color + JSON.stringify(o)
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o }))
  return mats.get(k)
}
const SPH = new THREE.SphereGeometry(1, 24, 16)
const CYL = new THREE.CylinderGeometry(1, 1, 1, 20)
const CONE = new THREE.ConeGeometry(1, 1, 24)
const BOX = new THREE.BoxGeometry(1, 1, 1)
const TORUS = new THREE.TorusGeometry(1, 0.12, 8, 24)
const CAP = new THREE.CapsuleGeometry(1, 1, 6, 12)

const B = ({ g = SPH, c, p, s, r = [0, 0, 0], o }) => <mesh geometry={g} material={m(c, o)} position={p} scale={s} rotation={r} />

export const PROFESSORS = {
  dumbledore: { name: 'Albus Dumbledore', robe: '#4b2479', trim: '#c9b6e8', skin: '#efd2bd', hair: '#f1f0ec', height: 1.95 },
  mcgonagall: { name: 'Minerva McGonagall', robe: '#0f3b2a', trim: '#1b5a40', skin: '#f0d6c4', hair: '#5d5a58', height: 1.78 },
  trelawney: { name: 'Sybill Trelawney', robe: '#6b4a32', trim: '#d9a441', skin: '#f2dccb', hair: '#8a6a4a', height: 1.7 },
  slughorn: { name: 'Horace Slughorn', robe: '#5a1f2e', trim: '#c9a44a', skin: '#efc9ae', hair: '#bcb7ad', height: 1.78 },
  snape: { name: 'Severus Snape', robe: '#0b0b0d', trim: '#1c1c22', skin: '#e6dccf', hair: '#0f0e10', height: 1.88 },
  lockhart: { name: 'Gilderoy Lockhart', robe: '#a77fd0', trim: '#e6c9ff', skin: '#f3d3bb', hair: '#e8c870', height: 1.85 },
  moody: { name: 'Alastor Moody', robe: '#3a3a30', trim: '#5a5240', skin: '#d9b39a', hair: '#8f8a80', height: 1.85 },
  flitwick: { name: 'Filius Flitwick', robe: '#22304f', trim: '#3d5a8a', skin: '#f0cfb4', hair: '#f2f2f2', height: 1.05 },
  hagrid: { name: 'Rubeus Hagrid', robe: '#5b4330', trim: '#3b2c1f', skin: '#e2b28f', hair: '#2e2219', height: 2.7 },
  // AI avatars of real professors (casual: true). Outfit keys:
  //   top: 'hoodie' | 'shirt'   pants / shoes / sole: colors   head: 'cap' | 'wavy'
  //   keychain: 'labubu' (hangs from the belt loop)   pocket: 'totoro' (peeks out of the shirt pocket)
  //   eyes: iris color
  zaman: {
    name: 'Tauhid Zaman', robe: '#141416', trim: '#ff4fa3', skin: '#c99a74', hair: '#17110d', height: 1.8, casual: true,
    top: 'hoodie', pants: '#3b5f8f', shoes: '#f4f4f6', sole: '#ff4fa3', head: 'cap', keychain: 'labubu',
  },
  schott: {
    name: 'Peter Schott', robe: '#bcd3ee', trim: '#9fbbe0', skin: '#e6b998', hair: '#5b3f28', height: 1.85, casual: true,
    top: 'shirt', pants: '#c8b48e', shoes: '#6b4226', sole: '#3a2416', head: 'wavy', pocket: 'totoro', eyes: '#5f86a8',
  },
}

function printTex(key, w, h, draw) {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    draw(c.getContext('2d'))
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
}

// black hoodie with a pink hem, pink "AI" patch on the chest and BLACKPINK across the back
function Hoodie({ P }) {
  const patch = printTex('ai-patch', 256, 256, (g) => {
    g.fillStyle = P.robe
    g.fillRect(0, 0, 256, 256)
    g.fillStyle = P.trim
    g.beginPath()
    g.arc(128, 128, 118, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = P.robe
    g.font = 'bold 130px system-ui, sans-serif'
    g.textAlign = 'center'
    g.fillText('AI', 128, 175)
  })
  const back = printTex('bp-back', 512, 128, (g) => {
    g.fillStyle = P.robe
    g.fillRect(0, 0, 512, 128)
    g.fillStyle = P.trim
    g.font = 'bold 72px system-ui, sans-serif'
    g.textAlign = 'center'
    g.fillText('BLACKPINK', 256, 90)
  })
  return (
    <>
      <B g={CYL} c={P.robe} p={[0, 1.08, 0]} s={[0.215, 0.42, 0.17]} />
      <B g={CYL} c={P.trim} p={[0, 0.88, 0]} s={[0.222, 0.05, 0.176]} />
      <B g={TORUS} c={P.robe} p={[0, 1.53, -0.06]} r={[Math.PI / 2 - 0.3, 0, 0]} s={[0.13, 0.13, 0.5]} />
      {[-1, 1].map((sx) => (
        <B key={sx} g={CYL} c={P.trim} p={[0.035 * sx, 1.4, 0.19]} s={[0.006, 0.14, 0.006]} />
      ))}
      <mesh position={[0, 1.28, 0.196]} scale={[0.12, 0.12, 1]}>
        <planeGeometry />
        <meshStandardMaterial map={patch} roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.32, -0.196]} rotation={[0, Math.PI, 0]} scale={[0.34, 0.085, 1]}>
        <planeGeometry />
        <meshStandardMaterial map={back} roughness={0.8} />
      </mesh>
    </>
  )
}

// button-down oxford with an open collar, tucked into chinos with a brown belt
function Shirt({ P }) {
  return (
    <>
      <B g={CYL} c={P.robe} p={[0, 1.1, 0]} s={[0.212, 0.38, 0.168]} />
      <B g={CYL} c="#5a3a22" p={[0, 0.92, 0]} s={[0.214, 0.035, 0.17]} />
      <B g={BOX} c="#c9a44a" o={{ metalness: 0.7, roughness: 0.3 }} p={[0, 0.92, 0.17]} s={[0.035, 0.03, 0.01]} />
      {/* placket + buttons, open at the top */}
      <B g={BOX} c={P.trim} p={[0, 1.18, 0.198]} s={[0.022, 0.4, 0.006]} />
      {[1.0, 1.1, 1.2, 1.3].map((y) => (
        <B key={y} c="#f4f4f6" p={[0, y, 0.203]} s={[0.007, 0.007, 0.004]} />
      ))}
      <B g={BOX} c={P.skin} p={[0, 1.47, 0.17]} r={[0.25, 0, 0]} s={[0.07, 0.1, 0.01]} />
      {/* collar points */}
      {[-1, 1].map((sx) => (
        <B key={sx} g={BOX} c={P.robe} p={[0.055 * sx, 1.5, 0.15]} r={[0.5, 0, 0.5 * sx]} s={[0.07, 0.05, 0.01]} />
      ))}
      <B g={TORUS} c={P.robe} p={[0, 1.55, 0]} r={[Math.PI / 2, 0, 0]} s={[0.07, 0.07, 0.25]} />
      {/* chest pocket (Totoro rides in it) */}
      <B g={BOX} c={P.trim} p={[0.09, 1.3, 0.2]} s={[0.075, 0.08, 0.008]} />
    </>
  )
}

// a little Totoro: grey body, cream belly with chevrons, pointy ears, big eyes, whiskers
function Totoro({ position, scale = 1, rotation = 0 }) {
  const grey = '#8d8f91'
  return (
    <group position={position} scale={scale} rotation={[0, rotation, 0]}>
      <B c={grey} p={[0, 0.5, 0]} s={[0.42, 0.5, 0.36]} />
      <B c="#efe6d2" p={[0, 0.42, 0.17]} s={[0.3, 0.34, 0.22]} />
      {[[-0.1, 0.55], [0, 0.6], [0.1, 0.55], [-0.06, 0.45], [0.06, 0.45]].map(([x, y], i) => (
        <B key={i} g={CONE} c={grey} p={[x, y, 0.385]} r={[Math.PI / 2 + 0.3, 0, Math.PI]} s={[0.035, 0.04, 0.02]} />
      ))}
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <B g={CONE} c={grey} p={[0.17 * sx, 1.05, 0]} r={[0, 0, -0.12 * sx]} s={[0.07, 0.24, 0.06]} />
          <B c="#ffffff" p={[0.15 * sx, 0.8, 0.29]} s={[0.07, 0.07, 0.03]} />
          <B c="#1d1410" p={[0.15 * sx, 0.8, 0.315]} s={[0.035, 0.035, 0.015]} />
          {[-0.04, 0.02].map((dy) => (
            <B key={dy} g={BOX} c="#2a2a2a" p={[0.28 * sx, 0.72 + dy, 0.27]} r={[0, 0, (dy < 0 ? 0.15 : -0.1) * sx]} s={[0.16, 0.008, 0.008]} />
          ))}
        </group>
      ))}
      <B c="#1d1410" p={[0, 0.76, 0.33]} s={[0.04, 0.025, 0.02]} />
    </group>
  )
}

// pants, shoes, top, hair/cap and accessories for the AI avatars (replaces the robe below the shoulders)
function CasualBody({ P, keychainRef }) {
  return (
    <>
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <B g={CYL} c={P.pants} p={[0.09 * sx, 0.47, 0]} s={[0.075, 0.82, 0.08]} />
          <B g={BOX} c={P.shoes} p={[0.09 * sx, 0.06, 0.04]} s={[0.11, 0.08, 0.24]} />
          <B g={BOX} c={P.sole} p={[0.09 * sx, 0.015, 0.04]} s={[0.115, 0.03, 0.245]} />
        </group>
      ))}
      <B g={CYL} c={P.pants} p={[0, 0.86, 0]} s={[0.19, 0.12, 0.15]} />
      {P.top === 'hoodie' ? <Hoodie P={P} /> : <Shirt P={P} />}
      {P.keychain === 'labubu' && (
        <>
          {/* Labubu keychain clipped to the belt loop */}
          <B g={TORUS} c="#c9a44a" o={{ metalness: 0.8, roughness: 0.3 }} p={[0.2, 0.86, 0.06]} r={[0, Math.PI / 2, 0]} s={[0.02, 0.02, 0.02]} />
          <group ref={keychainRef} position={[0.2, 0.85, 0.06]}>
            <B g={CYL} c="#c9a44a" o={{ metalness: 0.8, roughness: 0.3 }} p={[0, -0.04, 0]} s={[0.003, 0.08, 0.003]} />
            <Labubu fur="#ff8fc7" expression="happy" shirt="yale" height={0.2} position={[0, -0.27, 0]} rotation={0.4} />
          </group>
        </>
      )}
      {P.pocket === 'totoro' && <Totoro position={[0.09, 1.27, 0.2]} scale={0.1} />}
      {P.head === 'cap' ? (
        <>
          {/* cap with a short brim, short hair under it */}
          <B c={P.hair} p={[0, 1.72, -0.02]} s={[0.128, 0.12, 0.13]} />
          <B c={P.trim} p={[0, 1.775, -0.005]} s={[0.132, 0.085, 0.138]} />
          <B g={CYL} c={P.trim} p={[0, 1.78, 0.14]} r={[0.12, 0, 0]} s={[0.1, 0.012, 0.08]} />
        </>
      ) : (
        <>
          {/* thick, wavy hair swept up and back */}
          <B c={P.hair} p={[0, 1.74, -0.025]} s={[0.132, 0.125, 0.13]} />
          {[[-0.07, 1.83, 0.06], [0, 1.85, 0.07], [0.07, 1.83, 0.05], [-0.09, 1.81, -0.03], [0.09, 1.81, -0.03], [0, 1.84, -0.05]].map((p, i) => (
            <B key={i} c={P.hair} p={p} s={[0.06, 0.045, 0.06]} />
          ))}
          {[-1, 1].map((sx) => (
            <B key={sx} c={P.hair} p={[0.118 * sx, 1.73, -0.01]} s={[0.025, 0.06, 0.08]} />
          ))}
        </>
      )}
    </>
  )
}

function Face({ who, P }) {
  const eyeY = 1.725
  const dark = '#1d1410'
  const eyes = (
    <>
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <B c="#ffffff" p={[0.045 * sx, eyeY, 0.112]} s={[0.022, 0.018, 0.012]} />
          <B c={who === 'moody' && sx === -1 ? '#3fa9ff' : P.eyes ?? dark} p={[0.045 * sx, eyeY, 0.122]} s={[0.011, 0.012, 0.008]} />
        </group>
      ))}
    </>
  )
  return (
    <>
      {eyes}
      <B c={P.skin} p={[0, 1.69, 0.128]} s={[0.022, 0.03, 0.025]} />
      {/* brows */}
      {[-1, 1].map((sx) => (
        <B
          key={sx}
          g={BOX}
          c={who === 'dumbledore' || who === 'flitwick' ? '#e8e8e8' : P.hair}
          p={[0.047 * sx, eyeY + 0.035, 0.115]}
          r={[0, 0, (who === 'snape' || who === 'mcgonagall' ? 0.25 : -0.1) * sx]}
          s={[0.045, 0.01, 0.01]}
        />
      ))}
      {/* mouth: Lockhart beams, Snape and McGonagall are not amused */}
      {who === 'lockhart' || P.casual ? (
        <B g={BOX} c="#ffffff" p={[0, 1.645, 0.118]} s={[0.07, 0.022, 0.01]} />
      ) : (
        <B g={BOX} c="#6b2f2a" p={[0, 1.645, 0.118]} r={[0, 0, 0]} s={[who === 'snape' ? 0.045 : 0.055, 0.008, 0.008]} />
      )}
    </>
  )
}

function Extras({ who, P }) {
  const white = P.hair
  switch (who) {
    case 'dumbledore':
      return (
        <>
          <B c={white} p={[0, 1.74, -0.025]} s={[0.14, 0.15, 0.135]} />
          <B g={BOX} c={white} p={[0, 1.47, -0.09]} s={[0.26, 0.42, 0.06]} />
          <B g={CONE} c={white} p={[0, 1.3, 0.2]} r={[Math.PI + 0.12, 0, 0]} s={[0.11, 0.72, 0.07]} />
          <B g={BOX} c={white} p={[0, 1.66, 0.125]} s={[0.12, 0.03, 0.02]} />
          {[-1, 1].map((sx) => (
            <B key={sx} g={TORUS} c="#c9a44a" o={{ metalness: 0.8, roughness: 0.3 }} p={[0.045 * sx, 1.715, 0.13]} s={[0.026, 0.02, 0.026]} />
          ))}
          <B g={CONE} c={P.robe} p={[0, 2.06, -0.02]} r={[-0.15, 0, 0.12]} s={[0.16, 0.48, 0.16]} />
          <B g={CYL} c={P.robe} p={[0, 1.82, -0.01]} s={[0.2, 0.025, 0.2]} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <B key={i} c="#e8e2ff" o={{ emissive: '#e8e2ff', emissiveIntensity: 0.6 }} p={[Math.sin(i * 2.1) * 0.27, 0.35 + i * 0.16, 0.24 + Math.cos(i) * 0.05]} s={[0.025, 0.025, 0.025]} />
          ))}
        </>
      )
    case 'mcgonagall':
      return (
        <>
          <B c={P.hair} p={[0, 1.76, -0.03]} s={[0.135, 0.12, 0.13]} />
          <B c={P.hair} p={[0, 1.76, -0.14]} s={[0.06, 0.06, 0.05]} />
          <B g={CYL} c="#0a2219" p={[0, 1.83, 0]} s={[0.3, 0.02, 0.3]} />
          <B g={CONE} c="#0a2219" p={[0, 2.08, -0.03]} r={[-0.12, 0, 0]} s={[0.15, 0.5, 0.15]} />
          {[-1, 1].map((sx) => (
            <B key={sx} g={BOX} c="#2a2a2a" p={[0.045 * sx, 1.722, 0.13]} s={[0.05, 0.035, 0.005]} o={{ transparent: true, opacity: 0.35 }} />
          ))}
          <B g={CYL} c="#c9a44a" o={{ metalness: 0.8, roughness: 0.3 }} p={[0, 1.5, 0.2]} r={[Math.PI / 2, 0, 0]} s={[0.035, 0.01, 0.035]} />
        </>
      )
    case 'trelawney':
      return (
        <>
          {Array.from({ length: 14 }, (_, i) => {
            const a = (i / 14) * Math.PI * 2
            return <B key={i} c={P.hair} p={[Math.cos(a) * 0.14, 1.74 + Math.sin(a * 2) * 0.05, Math.sin(a) * 0.1 - 0.03]} s={[0.07, 0.08, 0.07]} />
          })}
          <B c={P.hair} p={[0, 1.83, -0.02]} s={[0.15, 0.08, 0.13]} />
          {[-1, 1].map((sx) => (
            <group key={sx}>
              <B g={TORUS} c="#3a2a1a" p={[0.05 * sx, 1.722, 0.13]} s={[0.045, 0.045, 0.045]} />
              <B c="#ffffff" p={[0.05 * sx, 1.722, 0.125]} s={[0.035, 0.035, 0.01]} />
              <B c="#2b1a10" p={[0.05 * sx, 1.722, 0.135]} s={[0.02, 0.02, 0.006]} />
            </group>
          ))}
          <B g={CYL} c="#b5643c" p={[0, 1.42, 0]} r={[0.05, 0, 0]} s={[0.25, 0.14, 0.23]} />
          <B g={CYL} c="#3f7a5a" p={[0, 1.27, 0]} s={[0.27, 0.06, 0.25]} />
          {[0, 1, 2].map((i) => (
            <B key={i} g={TORUS} c="#d9a441" o={{ metalness: 0.7, roughness: 0.3 }} p={[0, 1.4 - i * 0.05, 0.15 + i * 0.01]} r={[1.2, 0, 0]} s={[0.12 - i * 0.01, 0.12, 0.12]} />
          ))}
        </>
      )
    case 'slughorn':
      return (
        <>
          <B c={P.robe} p={[0, 1.08, 0.1]} s={[0.32, 0.34, 0.3]} />
          <B c="#c9a44a" o={{ metalness: 0.8, roughness: 0.3 }} p={[0, 1.15, 0.395]} s={[0.018, 0.018, 0.01]} />
          <B c="#c9a44a" o={{ metalness: 0.8, roughness: 0.3 }} p={[0, 1.02, 0.39]} s={[0.018, 0.018, 0.01]} />
          {[-1, 1].map((sx) => (
            <B key={sx} c={P.hair} p={[0.11 * sx, 1.71, -0.03]} s={[0.05, 0.07, 0.09]} />
          ))}
          <B g={BOX} c={P.hair} p={[0, 1.66, 0.13]} s={[0.15, 0.04, 0.03]} />
          {[-1, 1].map((sx) => (
            <B key={sx} c={P.hair} p={[0.07 * sx, 1.635, 0.125]} s={[0.035, 0.045, 0.02]} />
          ))}
          <B g={CYL} c="#3f6b45" p={[0, 1.38, 0.17]} r={[Math.PI / 2, 0, 0]} s={[0.07, 0.03, 0.05]} />
        </>
      )
    case 'snape':
      return (
        <>
          <B c={P.hair} p={[0, 1.76, -0.02]} s={[0.138, 0.13, 0.135]} />
          {[-1, 1].map((sx) => (
            <B key={sx} g={BOX} c={P.hair} p={[0.12 * sx, 1.6, 0.02]} s={[0.04, 0.3, 0.17]} />
          ))}
          <B g={BOX} c={P.hair} p={[0, 1.58, -0.1]} s={[0.24, 0.32, 0.05]} />
          {Array.from({ length: 7 }, (_, i) => (
            <B key={i} c="#1c1c22" p={[0, 1.48 - i * 0.07, 0.205]} s={[0.012, 0.012, 0.01]} />
          ))}
        </>
      )
    case 'lockhart':
      return (
        <>
          <B c={P.hair} p={[0, 1.78, 0.01]} s={[0.145, 0.11, 0.14]} />
          <B c={P.hair} p={[0, 1.82, 0.07]} r={[0.4, 0, 0]} s={[0.12, 0.06, 0.08]} />
          {[-1, 1].map((sx) => (
            <B key={sx} c={P.hair} p={[0.12 * sx, 1.7, -0.02]} s={[0.05, 0.1, 0.1]} />
          ))}
          <B c="#f2e6ff" p={[0, 1.5, 0.17]} s={[0.07, 0.06, 0.05]} />
          <B c="#ffd700" o={{ emissive: '#ffd700', emissiveIntensity: 0.4, metalness: 0.6 }} p={[0, 1.95, 0.05]} r={[0, 0, Math.PI / 4]} s={[0.03, 0.03, 0.01]} />
        </>
      )
    case 'moody':
      return (
        <>
          {Array.from({ length: 9 }, (_, i) => {
            const a = Math.PI * 0.15 + (i / 8) * Math.PI * 0.7
            return <B key={i} c={P.hair} p={[Math.cos(a) * 0.13, 1.74 + Math.sin(a) * 0.05, -Math.sin(a) * 0.08]} s={[0.06, 0.12, 0.06]} />
          })}
          <B g={TORUS} c="#8a8f96" o={{ metalness: 0.9, roughness: 0.3 }} p={[-0.045, 1.725, 0.12]} s={[0.04, 0.04, 0.04]} />
          <B c="#3fa9ff" o={{ emissive: '#3fa9ff', emissiveIntensity: 1.2 }} p={[-0.045, 1.725, 0.118]} s={[0.032, 0.032, 0.02]} />
          <B g={BOX} c="#1a1410" p={[-0.03, 1.73, 0.05]} r={[0, 0, -0.5]} s={[0.25, 0.012, 0.2]} />
          <B g={BOX} c="#9c6a5a" p={[0.06, 1.68, 0.122]} r={[0, 0, 0.7]} s={[0.05, 0.006, 0.006]} />
          <B g={CYL} c="#4a3524" p={[0.36, 0.95, 0.12]} s={[0.025, 1.9, 0.025]} />
        </>
      )
    case 'flitwick':
      return (
        <>
          {[-1, 1].map((sx) => (
            <B key={sx} c={P.hair} p={[0.12 * sx, 1.75, -0.02]} s={[0.07, 0.07, 0.08]} />
          ))}
          <B c={P.hair} p={[0, 1.82, -0.03]} s={[0.08, 0.05, 0.08]} />
          <B g={BOX} c={P.hair} p={[0, 1.662, 0.128]} s={[0.13, 0.025, 0.02]} />
          {[-1, 1].map((sx) => (
            <B key={sx} g={CONE} c={P.hair} p={[0.07 * sx, 1.61, 0.125]} r={[Math.PI, 0, 0]} s={[0.025, 0.1, 0.02]} />
          ))}
          <B c="#e8b0b0" p={[0, 1.7, 0.13]} s={[0.03, 0.025, 0.02]} />
        </>
      )
    case 'hagrid':
      return (
        <>
          <B c={P.hair} p={[0, 1.76, -0.02]} s={[0.17, 0.16, 0.16]} />
          <B c={P.hair} p={[0, 1.58, 0.07]} s={[0.17, 0.16, 0.12]} />
          {Array.from({ length: 10 }, (_, i) => {
            const a = (i / 10) * Math.PI * 2
            return <B key={i} c={P.hair} p={[Math.cos(a) * 0.15, 1.65 + Math.sin(a) * 0.12, Math.sin(a) * 0.05]} s={[0.07, 0.07, 0.07]} />
          })}
          <B g={BOX} c="#2a2018" p={[0, 1.18, 0.33]} s={[0.36, 0.06, 0.04]} />
          <B g={BOX} c="#c9a44a" o={{ metalness: 0.7 }} p={[0, 1.18, 0.355]} s={[0.07, 0.07, 0.02]} />
        </>
      )
    default:
      return null
  }
}

const TURN_SPEED = 4 // how fast a professor swings round to face you (per second)
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a))

export default function Professor({ who, position = [0, 0, 0], rotation = 0, phase = 0, talkId }) {
  const P = PROFESSORS[who]
  const s = P.height / 1.9
  const wide = who === 'hagrid' ? 1.3 : who === 'slughorn' ? 1.15 : 1
  const root = useRef()
  const wandArm = useRef()
  const labubu = useRef()
  const yaw = useRef(rotation)
  const glow = useMemo(() => m('#ffd6ea', { emissive: '#ff4fa3', emissiveIntensity: 2 }), [])

  // register as someone the crosshair can target
  useEffect(() => {
    const r = root.current
    if (!talkId || !r) return
    r.userData.talkId = talkId
    TALKABLES.add(r)
    return () => {
      TALKABLES.delete(r)
      delete r.userData.talkId
    }
  }, [talkId])

  useFrame(({ clock, camera }, dt) => {
    const t = clock.elapsedTime + phase
    const talking = talkId && TALKING.id === talkId
    // face the player while chatting; otherwise scan the room
    const target = talking
      ? Math.atan2(camera.position.x - position[0], camera.position.z - position[2])
      : rotation + Math.sin(t * 0.4) * 0.35
    yaw.current += wrapAngle(target - yaw.current) * Math.min(1, dt * TURN_SPEED)
    root.current.rotation.y = yaw.current
    root.current.position.y = position[1] + (talking ? Math.abs(Math.sin(t * 7)) * 0.015 : 0) // bob while talking
    const flick = talking ? 0 : Math.max(0, Math.sin(t * 1.3)) // raise the wand (or wave) every few seconds
    wandArm.current.rotation.x = -0.3 - flick * 1.4
    wandArm.current.rotation.z = -0.25 - flick * 0.3
    if (labubu.current) labubu.current.rotation.z = Math.sin(t * 2.2) * 0.12 // keychain sways
  })
  const sleeve = m(P.robe)
  const hand = m(P.skin)
  return (
    <group ref={root} position={position} rotation={[0, rotation, 0]} scale={s}>
      {P.casual ? (
        <>
          <CasualBody P={P} keychainRef={labubu} />
          <B g={CYL} c={P.robe} p={[0, 1.36, 0]} s={[0.205 * wide, 0.3, 0.19 * wide]} />
          <B c={P.robe} p={[0, 1.5, 0]} s={[0.27 * wide, 0.1, 0.18 * wide]} />
        </>
      ) : (
        <>
          {/* robe + torso */}
          <mesh geometry={new THREE.CylinderGeometry(0.2 * wide, 0.36 * wide, 1.22, 28)} material={sleeve} position={[0, 0.61, 0]} />
          <B g={CYL} c={P.trim} p={[0, 0.03, 0]} s={[0.365 * wide, 0.06, 0.365 * wide]} />
          <B g={CYL} c={P.robe} p={[0, 1.36, 0]} s={[0.205 * wide, 0.3, 0.19 * wide]} />
          <B c={P.robe} p={[0, 1.5, 0]} s={[0.27 * wide, 0.1, 0.18 * wide]} />
          <B g={BOX} c={P.trim} p={[0, 1.3, 0.19 * wide]} s={[0.06, 0.38, 0.01]} />
        </>
      )}
      <B g={CYL} c={P.skin} p={[0, 1.57, 0]} s={[0.05, 0.08, 0.05]} />
      {/* left arm hangs; right arm holds the wand */}
      <group position={[0.26 * wide, 1.46, 0]} rotation={[0.1, 0, 0.18]}>
        <mesh geometry={CAP} material={sleeve} position={[0, -0.24, 0]} scale={[0.065, 0.2, 0.065]} />
        <mesh geometry={SPH} material={hand} position={[0, -0.5, 0.02]} scale={[0.045, 0.055, 0.04]} />
        {who === 'trelawney' && (
          <B c="#bfe3ff" o={{ transparent: true, opacity: 0.7, emissive: '#7fb2ff', emissiveIntensity: 0.6, roughness: 0.05 }} p={[0, -0.55, 0.12]} s={[0.11, 0.11, 0.11]} />
        )}
      </group>
      <group ref={wandArm} position={[-0.26 * wide, 1.46, 0]}>
        <mesh geometry={CAP} material={sleeve} position={[0, -0.24, 0]} scale={[0.065, 0.2, 0.065]} />
        <mesh geometry={SPH} material={hand} position={[0, -0.5, 0.02]} scale={[0.045, 0.055, 0.04]} />
        {who !== 'hagrid' && !P.casual && (
          <>
            <B g={CYL} c="#3b2617" p={[0, -0.5, 0.18]} r={[Math.PI / 2, 0, 0]} s={[0.009, 0.32, 0.009]} />
            <mesh geometry={SPH} material={glow} position={[0, -0.5, 0.34]} scale={0.018} />
          </>
        )}
      </group>
      {/* head */}
      <group>
        <B c={P.skin} p={[0, 1.7, 0]} s={[0.12, 0.14, 0.13]} />
        {[-1, 1].map((sx) => (
          <B key={sx} c={P.skin} p={[0.122 * sx, 1.7, 0]} s={[0.02, 0.035, 0.02]} />
        ))}
        <Face who={who} P={P} />
        <Extras who={who} P={P} />
      </group>
    </group>
  )
}
